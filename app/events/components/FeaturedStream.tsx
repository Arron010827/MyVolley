"use client";

import Link from "next/link";
import ClubAvatar from "@/components/ClubAvatar";
import StreamCard from "@/components/StreamCard";
import { extractYouTubeId } from "@/lib/youtube";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Club {
  id: string;
  club_name: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  match_number: number;
  round: string | null;
  group_name: string | null;
  match_time: string | null;
  match_date: string | null;
  court: string | null;
  home_score: number | null;
  away_score: number | null;
  home_club: Club | null;
  away_club: Club | null;
}

interface Stream {
  id: string;
  youtube_url: string;
  is_live: boolean;
  match_id: string;
  event_matches: unknown;
}

interface Props {
  streams: Stream[];
  matches: Match[];
  eventId: string;
  now: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  return new Date(0, 0, 0, Number(h), Number(m)).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Determine which match to feature ────────────────────────────────────────
function getFeaturedStream(
  streams: Stream[],
  matches: Match[],
  now: string,
): { stream: Stream; situation: 1 | 2 | 3 | 4 | 5 } | null {
  if (streams.length === 0) return null;

  const today = now.split("T")[0];

  // Build a map of match_id → stream for quick lookup
  const streamByMatchId = Object.fromEntries(
    streams.map((s) => [s.match_id, s]),
  );

  // Situation 2 — live match on Court 1
  const liveStreams = streams.filter((s) => s.is_live);
  if (liveStreams.length > 0) {
    // Prefer Court 1
    const court1 = liveStreams.find((s) => {
      const m = matches.find((m) => m.id === s.match_id);
      return m?.court === "Court 1";
    });
    const featured = court1 ?? liveStreams[0];
    return { stream: featured, situation: 2 };
  }

  // Get matches with streams sorted by date + time
  const matchesWithStreams = matches
    .filter((m) => streamByMatchId[m.id])
    .sort((a, b) => {
      const aDate = `${a.match_date ?? ""}${a.match_time ?? ""}`;
      const bDate = `${b.match_date ?? ""}${b.match_time ?? ""}`;
      return aDate.localeCompare(bDate);
    });

  // Situation 1 — event not started yet (all matches in future)
  const upcomingMatches = matchesWithStreams.filter(
    (m) => !m.match_date || m.match_date >= today,
  );
  const pastMatches = matchesWithStreams.filter(
    (m) => m.match_date && m.match_date < today,
  );

  if (pastMatches.length === 0 && upcomingMatches.length > 0) {
    const stream = streamByMatchId[upcomingMatches[0].id];
    return { stream, situation: 1 };
  }

  // Situation 4 — event finished (all matches in past)
  if (upcomingMatches.length === 0 && pastMatches.length > 0) {
    const lastMatch = pastMatches[pastMatches.length - 1];
    const stream = streamByMatchId[lastMatch.id];
    return { stream, situation: 4 };
  }

  // Situation 3 — event ongoing but no live match
  if (upcomingMatches.length > 0) {
    const stream = streamByMatchId[upcomingMatches[0].id];
    return { stream, situation: 3 };
  }

  return null;
}

// ─── Main Featured Stream Card ────────────────────────────────────────────────
function MainStreamCard({
  stream,
  match,
  situation,
}: {
  stream: Stream;
  match: Match | null;
  situation: 1 | 2 | 3 | 4 | 5;
}) {
  const videoId = extractYouTubeId(stream.youtube_url);

  // Status label
  const statusLabel = {
    1: { text: "🕐 Upcoming", className: "bg-gray-700 text-gray-300" },
    2: { text: "🔴 Live", className: "bg-red-600 text-white animate-pulse" },
    3: { text: "🕐 Up Next", className: "bg-yellow-600 text-white" },
    4: { text: "✅ Finished", className: "bg-gray-700 text-gray-300" },
    5: { text: "", className: "" },
  }[situation];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
        <span className="text-sm font-semibold text-white">
          {match
            ? `Match #${match.match_number}${match.round ? ` · ${match.round}` : ""}${match.group_name ? ` · Group ${match.group_name}` : ""}`
            : "Featured Match"}
        </span>
        {statusLabel.text && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${statusLabel.className}`}
          >
            {statusLabel.text}
          </span>
        )}
      </div>

      {/* ── Teams ─────────────────────────────────────────────────────────── */}
      {match && (
        <div className="flex items-center justify-center gap-8 px-6 py-6">
          {/* Home club */}
          <div className="flex flex-col items-center gap-2">
            <ClubAvatar
              clubName={match.home_club?.club_name ?? "?"}
              logoUrl={match.home_club?.logo_url ?? null}
              size="lg"
            />
            <Link
              href={`/clubs/${match.home_club?.id}`}
              className="font-semibold text-white hover:text-red-400 transition-colors text-center"
            >
              {match.home_club?.club_name ?? "?"}
            </Link>
          </div>

          {/* Score or VS */}
          <div className="text-center">
            {match.home_score !== null ? (
              <p className="text-4xl font-bold text-white">
                {match.home_score} — {match.away_score}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-500">VS</p>
            )}
          </div>

          {/* Away club */}
          <div className="flex flex-col items-center gap-2">
            <ClubAvatar
              clubName={match.away_club?.club_name ?? "?"}
              logoUrl={match.away_club?.logo_url ?? null}
              size="lg"
            />
            <Link
              href={`/clubs/${match.away_club?.id}`}
              className="font-semibold text-white hover:text-red-400 transition-colors text-center"
            >
              {match.away_club?.club_name ?? "?"}
            </Link>
          </div>
        </div>
      )}

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full aspect-video bg-gray-800">
        {situation === 2 && videoId ? (
          // Live — embed YouTube player
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
            title="Live Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : videoId ? (
          // Not live — thumbnail linking to YouTube

          <a
            href={stream.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full group"
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt="Stream thumbnail"
              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-red-600 rounded-full w-20 h-20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No stream available
          </div>
        )}
      </div>

      {/* ── Match info footer ─────────────────────────────────────────────── */}
      {match && (
        <div className="grid grid-cols-3 divide-x divide-gray-800 border-t border-gray-800">
          <div className="px-4 py-3 text-center">
            <p className="text-gray-500 text-xs mb-1">📅 Date</p>
            <p className="text-white text-sm font-medium">
              {match.match_date ? formatDate(match.match_date) : "TBC"}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-gray-500 text-xs mb-1">🕐 Time</p>
            <p className="text-white text-sm font-medium">
              {match.match_time ? formatTime(match.match_time) : "TBC"}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-gray-500 text-xs mb-1">📍 Venue</p>
            <p className="text-white text-sm font-medium">
              {match.court ?? "TBC"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FeaturedStream({
  streams,
  matches,
  eventId,
  now,
}: Props) {
  const today = now.split("T")[0];

  const featured = getFeaturedStream(streams, matches, now);

  // Build match lookup
  const matchById = Object.fromEntries(matches.map((m) => [m.id, m]));

  // Get the featured match
  const featuredMatch = featured
    ? (matchById[featured.stream.match_id] ?? null)
    : null;

  // ── Situation 5 — no streams at all ──────────────────────────────────────
  if (!featured) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl py-20 text-center text-gray-500">
        <p className="text-2xl mb-2">📺</p>
        <p className="text-lg font-medium text-gray-400">
          No streams available
        </p>
        <p className="text-sm mt-1">This event has no stream links yet</p>
      </div>
    );
  }

  // ── Supporting streams (bottom row) ──────────────────────────────────────
  // Upcoming: next 5 after featured (situations 1, 2, 3)
  // Past: last 5 in descending order (situations 2, 3, 4)
  const situation = featured.situation;

  const upcomingStreams =
    situation !== 4
      ? streams
          .filter((s) => {
            const m = matchById[s.match_id];
            if (!m) return false;
            if (s.id === featured.stream.id) return false; // exclude featured
            if (s.is_live) return false; // exclude other live
            return !m.match_date || m.match_date >= today;
          })
          .sort((a, b) => {
            const ma = matchById[a.match_id];
            const mb = matchById[b.match_id];
            return `${ma?.match_date}${ma?.match_time}`.localeCompare(
              `${mb?.match_date}${mb?.match_time}`,
            );
          })
          .slice(0, 5)
      : [];

  const pastStreams =
    situation !== 1
      ? streams
          .filter((s) => {
            const m = matchById[s.match_id];
            if (!m) return false;
            if (s.id === featured.stream.id) return false;
            if (s.is_live) return false;
            return m.match_date && m.match_date < today;
          })
          .sort((a, b) => {
            const ma = matchById[a.match_id];
            const mb = matchById[b.match_id];
            return `${mb?.match_date}${mb?.match_time}`.localeCompare(
              `${ma?.match_date}${ma?.match_time}`,
            );
          })
          .slice(0, 5)
      : [];

  // Other live streams (situation 2 — show other courts below)
  const otherLiveStreams =
    situation === 2
      ? streams.filter((s) => s.is_live && s.id !== featured.stream.id)
      : [];

  return (
    <div className="space-y-6">
      {/* Main featured card */}
      <MainStreamCard
        stream={featured.stream}
        match={featuredMatch}
        situation={situation}
      />

      {/* Other live streams */}
      {otherLiveStreams.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            🔴 Other Live Matches
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {otherLiveStreams.map((s) => (
              <div key={s.id} className="flex-shrink-0 w-72">
                <StreamCard stream={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming streams */}
      {upcomingStreams.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            🕐 Upcoming Matches
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {upcomingStreams.map((s) => (
              <div key={s.id} className="flex-shrink-0 w-72">
                <StreamCard stream={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past streams */}
      {pastStreams.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            ◀ Past Matches
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {pastStreams.map((s) => (
              <div key={s.id} className="flex-shrink-0 w-72">
                <StreamCard stream={s} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
