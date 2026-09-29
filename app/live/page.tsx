import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import StreamCard, {
  extractMatch,
  getStreamTitle,
  formatMatchDateTime,
  isUpcomingStream,
  isPastStream,
} from "@/components/StreamCard";

// ─── Main page ───────────────────────────────────────────────────────────────
export default async function LivePage() {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  // Query 1: Upcoming + live streams (nearest first)
  const { data: upcomingStreams } = await supabase
    .from("streams")
    .select(
      `
    id, youtube_url, is_live, event_id, match_id,
    event_matches (
      match_number, round, group_name, match_time, match_date,
      home_club:home_club_id ( id, club_name ),
      away_club:away_club_id ( id, club_name )
    )
  `,
    )
    .or(`is_live.eq.true,event_matches.match_date.gte.${now.split("T")[0]}`)
    .order("is_live", { ascending: false });

  // Query 2: Past streams (most recent first)
  const { data: pastStreams } = await supabase
    .from("streams")
    .select(
      `
    id, youtube_url, is_live, event_id, match_id,
    event_matches (
      match_number, round, group_name, match_time, match_date,
      home_club:home_club_id ( id, club_name ),
      away_club:away_club_id ( id, club_name )
    )
  `,
    )
    .eq("is_live", false)
    .order("created_at", { ascending: false });

  // Query 3: Events that have streams linked
  // First try events with streams, fallback to recent events
  const { data: eventsWithStreams } = await supabase
    .from("streams")
    .select("event_id, events(id, title)")
    .not("event_id", "is", null) // only rows where event_id is set
    .limit(20);

  // Deduplicate events (multiple streams can share the same event)
  const seenEventIds = new Set<string>();
  const uniqueEvents: { id: string; title: string }[] = [];

  eventsWithStreams?.forEach((stream) => {
    const raw = stream.events;
    // Supabase sometimes returns joined rows as an array, sometimes as an object
    // Array.isArray handles both cases safely
    const event = Array.isArray(raw)
      ? (raw[0] as { id: string; title: string } | undefined)
      : (raw as { id: string; title: string } | null);

    if (event && !seenEventIds.has(event.id)) {
      seenEventIds.add(event.id);
      uniqueEvents.push(event);
    }
  });

  // Fallback: if no events have streams yet, show 6 most recent events
  let displayEvents = uniqueEvents.slice(0, 6);
  if (displayEvents.length === 0) {
    const { data: recentEvents } = await supabase
      .from("events")
      .select("id, title")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(6);
    displayEvents = recentEvents ?? [];
  }

  // Query 4: Clubs that have streams linked
  const { data: streamsForClubs } = await supabase
    .from("streams")
    .select(
      `
    event_matches (
      home_club:home_club_id ( id, club_name ),
      away_club:away_club_id ( id, club_name )
    )
  `,
    )
    .limit(20);

  // Deduplicate clubs
  const seenClubIds = new Set<string>();
  const uniqueClubs: { id: string; club_name: string }[] = [];

  streamsForClubs?.forEach((stream) => {
    const match = extractMatch(stream.event_matches);
    if (!match) return;
    [match.home_club, match.away_club].forEach((club) => {
      if (club && !seenClubIds.has(club.id)) {
        seenClubIds.add(club.id);
        uniqueClubs.push(club);
      }
    });
  });

  // Fallback: if no clubs have streams yet, show 6 most recent approved clubs
  let displayClubs = uniqueClubs.slice(0, 6);
  if (displayClubs.length === 0) {
    const { data: recentClubs } = await supabase
      .from("clubs")
      .select("id, club_name")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(6);
    displayClubs = recentClubs ?? [];
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-red-950 to-gray-950 px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-2">Watch Live</h1>
        <p className="text-gray-400">
          Live streams and match highlights from Malaysian volleyball
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* ── Section 1: Live & Upcoming ────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="text-red-500">▶</span> Live & Upcoming
          </h2>

          {!upcomingStreams || upcomingStreams.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
              <p className="text-lg">No upcoming streams scheduled</p>
              <p className="text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: Browse by Event & Club ────────────────────────────── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Browse Streams
          </h2>

          {/* By Event */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-200">
                By Competition
              </h3>
              <Link
                href="/events"
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                View all →
              </Link>
            </div>

            {displayEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No competitions available yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {displayEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="bg-gray-800 hover:bg-red-600 border border-gray-700 hover:border-red-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
                  >
                    📅 {event.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 mb-10" />

          {/* By Club */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-200">By Club</h3>
              <Link
                href="/clubs"
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                View all →
              </Link>
            </div>

            {displayClubs.length === 0 ? (
              <p className="text-gray-500 text-sm">No clubs available yet</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {displayClubs.map((club) => (
                  <Link
                    key={club.id}
                    href={`/clubs/${club.id}`}
                    className="bg-gray-800 hover:bg-red-600 border border-gray-700 hover:border-red-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
                  >
                    🏐 {club.club_name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3: Past Highlights ────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="text-gray-500">◀</span> Past Highlights
          </h2>

          {!pastStreams || pastStreams.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
              <p className="text-lg">No past highlights yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
