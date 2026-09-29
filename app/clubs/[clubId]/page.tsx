import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClubAvatar from "@/components/ClubAvatar";
import StreamCard, {
  extractMatch,
  getStreamTitle,
  formatMatchDateTime,
  isUpcomingStream,
  isPastStream,
} from "@/components/StreamCard";

// ─── Helper: format event date ───────────────────────────────────────────────
function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Event type badge colours ────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  tournament: "bg-orange-900/50 text-orange-300",
  league: "bg-blue-900/50 text-blue-300",
};

// ─── Social media config ─────────────────────────────────────────────────────
// Each entry defines the platform's label, URL field, and SVG icon path
const SOCIAL_PLATFORMS = [
  {
    key: "facebook_url",
    label: "Facebook",
    color: "text-blue-500",
    icon: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
  },
  {
    key: "instagram_url",
    label: "Instagram",
    color: "text-pink-500",
    icon: "M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z",
  },
  {
    key: "x_url",
    label: "X",
    color: "text-white",
    icon: "M4 4l16 16M20 4L4 20", // X shape using two diagonal lines
  },
  {
    key: "youtube_url",
    label: "YouTube",
    color: "text-red-500",
    icon: "M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58a2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
  },
  {
    key: "rednote_url",
    label: "RedNote",
    color: "text-red-400",
    // Simple R letter as placeholder since RedNote has no standard SVG path
    icon: "M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14V8h2a3 3 0 010 6h-1l2 4h-2l-2-4h-1v4h-1z",
  },
];

// ─── Volleyball medal component ───────────────────────────────────────────────
function MedalCount({
  color,
  count,
  label,
}: {
  color: "gold" | "silver" | "bronze";
  count: number;
  label: string;
}) {
  const colorMap = {
    gold: "text-yellow-400",
    silver: "text-gray-300",
    bronze: "text-orange-400",
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Volleyball emoji styled with color */}
      <span className={`text-2xl ${colorMap[color]}`}>🏐</span>
      <div>
        <p className="text-white font-bold text-lg leading-none">{count}</p>
        <p className="text-gray-500 text-xs">{label}</p>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { clubId } = await params;

  // Fetch the club — notFound() shows a 404 page if it doesn't exist
  const { data: club } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single();

  if (!club) notFound();

  // Get all matches for this club first
  const { data: clubMatchIds } = await supabase
    .from("event_matches")
    .select("id")
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`);

  const matchIds = (clubMatchIds ?? []).map((m) => m.id);

  // Find streams where this club is home or away team
  const { data: streams } =
    matchIds.length > 0
      ? await supabase
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
          .in("match_id", matchIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  // Fetch events this club has joined via club_events table
  // Join to events table to get event details
  const { data: clubEventsRaw } = await supabase
    .from("club_events")
    .select("event_id, joined_at, events(id, title, type, event_date)")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: false });

  // Safely extract events from joined data (same Array.isArray pattern)
  const joinedEvents = (clubEventsRaw ?? [])
    .map((row) => {
      const event = Array.isArray(row.events)
        ? (row.events[0] as
            | { id: string; title: string; type: string; event_date: string }
            | undefined)
        : (row.events as {
            id: string;
            title: string;
            type: string;
            event_date: string;
          } | null);
      return event ?? null;
    })
    .filter(Boolean) as {
    id: string;
    title: string;
    type: string;
    event_date: string;
  }[];

  const now = new Date().toISOString();

  // Split streams into upcoming/live and past
  const upcomingStreams = (streams ?? []).filter((s) =>
    isUpcomingStream(s, now),
  );
  const pastStreams = (streams ?? []).filter((s) => isPastStream(s, now));

  // Get current user to check if they are the club owner
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === club.owner_id;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* ── Club Header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-red-950 to-gray-950 px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/clubs"
              className="text-red-400 hover:text-red-300 text-sm mb-6 inline-block"
            >
              ← Back to clubs
            </Link>
            {isOwner && (
              <Link
                href={`/clubs/${clubId}/edit`}
                className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                ✏️ Edit Club
              </Link>
            )}
          </div>

          {/* Avatar + name + social + medals row */}
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <ClubAvatar
              clubName={club.club_name}
              logoUrl={club.logo_url ?? null}
              size="lg"
            />

            {/* Name + location + level + social */}
            <div className="flex-1 min-w-0">
              {/* Club name + social icons on same row */}
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-bold">{club.club_name}</h1>

                {/* Social media icons */}
                <div className="flex items-center gap-2">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const url = club[platform.key as keyof typeof club] as
                      | string
                      | null;
                    const isLinked = !!url;

                    return isLinked ? (
                      // Linked — show coloured icon that opens the URL

                      <a
                        key={platform.key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={platform.label}
                        className={`${platform.color} hover:opacity-80 transition-opacity`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={platform.icon}
                          />
                        </svg>
                      </a>
                    ) : (
                      // Not linked — show grey icon, no link
                      <span
                        key={platform.key}
                        title={`${platform.label} not linked`}
                        className="text-gray-700"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={platform.icon}
                          />
                        </svg>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <p className="text-gray-400 mb-2">
                📍 {club.district ? `${club.district}, ` : ""}
                {club.state}
              </p>

              {/* Level badge */}
              <span className="inline-block bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full">
                {club.experience_level}
              </span>
            </div>

            {/* Medal counts — right side */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              <MedalCount color="gold" count={0} label="Gold" />
              <MedalCount color="silver" count={0} label="Silver" />
              <MedalCount color="bronze" count={0} label="Bronze" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle section ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Details */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Details</h2>

            <div className="space-y-3 text-sm">
              {/* Level */}
              {club.experience_level && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">
                    Level
                  </span>
                  <span className="text-gray-200">{club.experience_level}</span>
                </div>
              )}

              {/* State */}
              {club.state && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">
                    State
                  </span>
                  <span className="text-gray-200">{club.state}</span>
                </div>
              )}

              {/* District */}
              {club.district && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">
                    District
                  </span>
                  <span className="text-gray-200">{club.district}</span>
                </div>
              )}

              {/* Address */}
              {club.address && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">
                    Address
                  </span>
                  <span className="text-gray-200">{club.address}</span>
                </div>
              )}

              {/* Email */}
              {club.contact_email && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 w-24 flex-shrink-0">
                    Email
                  </span>

                  <a
                    href={`mailto:${club.contact_email}`}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    {club.contact_email}
                  </a>
                </div>
              )}

              {/* Divider before description */}
              {club.description && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                    About
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    {club.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Events joined */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Events Joined</h2>

            {joinedEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No events joined yet
              </div>
            ) : (
              <div className="space-y-3">
                {joinedEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-500 rounded-lg px-4 py-3 transition-colors group"
                  >
                    <p className="font-medium text-white group-hover:text-red-400 transition-colors">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_COLORS[event.type] ?? "bg-gray-700 text-gray-300"}`}
                      >
                        {event.type}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatEventDate(event.event_date)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Streams Section ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-12 space-y-12">
        <h2 className="text-2xl font-bold mb-6">Streams & Highlights</h2>
        {streams && streams.length > 0 ? (
          <section>
            {/* Upcoming/Live */}
            {upcomingStreams.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <span className="text-red-500">▶</span> Live & Upcoming
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingStreams.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              </div>
            )}

            {/* Past highlights */}
            {pastStreams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <span className="text-gray-500">◀</span> Past Highlights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastStreams.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          // Show this if the club has no streams yet
          <section className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
            <p className="text-lg">No streams yet for this club</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </section>
        )}
      </div>
    </main>
  );
}
