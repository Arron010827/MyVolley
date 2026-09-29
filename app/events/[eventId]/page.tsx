import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import EventTabs from "@/app/events/components/EventTabs";
import StreamCard, {
  extractMatch,
  getStreamTitle,
  formatMatchDateTime,
  isUpcomingStream,
  isPastStream,
} from "@/components/StreamCard";

// ─── Badge colours per event type ───────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  tournament: "bg-orange-900 text-orange-300",
  league: "bg-blue-900 text-blue-300",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { eventId } = await params;

  // Check if current user is organiser or admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: organiser } = user
    ? await supabase
        .from("event_organisers")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const canManage = profile?.is_admin || !!organiser;

  // Fetch the event — notFound() shows 404 if it doesn't exist
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: matchesRaw } = await supabase
    .from("event_matches")
    .select(
      `
    id, match_number, court, match_time, match_date,
    home_score, away_score, group_name, round,
    home_club:home_club_id(id, club_name, logo_url),
    away_club:away_club_id(id, club_name, logo_url),
    event_match_sets(set_number, home_points, away_points)
  `,
    )
    .eq("event_id", eventId)
    .order("match_number", { ascending: true });

  const matches = (matchesRaw ?? []).map((row) => {
    const home = Array.isArray(row.home_club)
      ? (row.home_club[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (row.home_club as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    const away = Array.isArray(row.away_club)
      ? (row.away_club[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (row.away_club as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    return {
      id: row.id,
      match_number: row.match_number,
      court: row.court as string | null,
      match_date: row.match_date as string | null,
      match_time: row.match_time as string | null,
      home_score: row.home_score as number | null,
      away_score: row.away_score as number | null,
      group_name: row.group_name as string | null,
      round: row.round as string | null,
      home_club_id: home?.id ?? "",
      away_club_id: away?.id ?? "",
      home_club: home
        ? {
            id: home.id,
            club_name: home.club_name,
            logo_url: home.logo_url ?? null,
          }
        : null,
      away_club: away
        ? {
            id: away.id,
            club_name: away.club_name,
            logo_url: away.logo_url ?? null,
          }
        : null,
      sets: (Array.isArray(row.event_match_sets)
        ? row.event_match_sets
        : row.event_match_sets
          ? [row.event_match_sets]
          : []
      ).sort(
        (a: { set_number: number }, b: { set_number: number }) =>
          a.set_number - b.set_number,
      ) as { set_number: number; home_points: number; away_points: number }[],
    };
  });

  // Fetch clubs in this event
  const { data: clubEventsRaw } = await supabase
    .from("club_events")
    .select("club_id, group_name, clubs(id, club_name)")
    .eq("event_id", eventId);

  const clubEvents = (clubEventsRaw ?? []).map((row) => {
    const club = Array.isArray(row.clubs)
      ? (row.clubs[0] as { id: string; club_name: string } | undefined)
      : (row.clubs as { id: string; club_name: string } | null);

    return {
      club_id: row.club_id,
      group_name: row.group_name as string | null,
      club_name: club?.club_name ?? "—",
    };
  });

  // Fetch set scores for PR calculation
  const matchIds = matches.map((m) => m.id);

  const { data: matchSets } =
    matchIds.length > 0
      ? await supabase
          .from("event_match_sets")
          .select("match_id, home_points, away_points")
          .in("match_id", matchIds)
      : { data: [] };

  // Fetch streams linked to this event, newest first
  const { data: streams } = await supabase
    .from("streams")
    .select(
      `
    id, youtube_url, is_live, match_id,
    event_matches (
      match_number, round, group_name, match_time, match_date,
      home_club:home_club_id ( id, club_name ),
      away_club:away_club_id ( id, club_name )
    )
  `,
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const now = new Date().toISOString();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ── Event Header ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-red-950 to-gray-950 px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/events"
              className="text-red-400 hover:text-red-300 text-sm mb-6 inline-block"
            >
              ← Back to events
            </Link>
            {canManage && (
              <Link
                href={`/events/${eventId}/manage`}
                className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                ⚙️ Manage Event
              </Link>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              {/* Official MVA badge */}
              {event.is_association_event && (
                <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                  🏆 Official MVA Event
                </span>
              )}
              <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
              <p className="text-gray-400 text-lg">
                📍 {event.location}, {event.state}
              </p>
            </div>

            {/* Event type badge */}
            <span
              className={`text-sm px-4 py-2 rounded-full flex-shrink-0 capitalize ${TYPE_COLORS[event.type] ?? "bg-gray-800 text-gray-300"}`}
            >
              {event.type}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs — handles overview, schedule, standings, bracket */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <EventTabs
          event={event}
          streams={streams ?? []}
          matches={matches}
          clubEvents={clubEvents}
          matchSets={matchSets ?? []}
          eventId={eventId}
          now={now}
        />
      </div>
    </main>
  );
}
