import { extractYouTubeId } from "@/lib/youtube";
import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface StreamMatchData {
  match_number: number;
  round: string | null;
  group_name: string | null;
  match_time: string | null;
  match_date: string | null;
  home_club: { id: string; club_name: string } | null;
  away_club: { id: string; club_name: string } | null;
}

export interface StreamData {
  id: string;
  youtube_url: string;
  is_live: boolean;
  event_matches: unknown;
}

// ─── Helper: extract match data from Supabase join ───────────────────────────
export function extractMatch(raw: unknown): StreamMatchData | null {
  if (!raw) return null;
  const match = Array.isArray(raw) ? raw[0] : raw;
  if (!match) return null;

  const home = Array.isArray(match.home_club)
    ? (match.home_club[0] ?? null)
    : (match.home_club ?? null);
  const away = Array.isArray(match.away_club)
    ? (match.away_club[0] ?? null)
    : (match.away_club ?? null);

  return {
    match_number: match.match_number,
    round: match.round ?? null,
    group_name: match.group_name ?? null,
    match_time: match.match_time ?? null,
    match_date: match.match_date ?? null,
    home_club: home,
    away_club: away,
  };
}

// ─── Helper: generate stream title from match data ────────────────────────────
export function getStreamTitle(match: StreamMatchData | null): string {
  if (!match) return "Unknown Match";
  const home = match.home_club?.club_name ?? "?";
  const away = match.away_club?.club_name ?? "?";
  return `Match #${match.match_number}${match.round ? ` · ${match.round}` : ""} — ${home} vs ${away}`;
}

// ─── Helper: format match date + time ────────────────────────────────────────
export function formatMatchDateTime(match: StreamMatchData | null): string {
  if (!match) return "—";
  if (match.match_date && match.match_time) {
    return new Date(`${match.match_date}T${match.match_time}`).toLocaleString(
      "en-MY",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kuala_Lumpur",
      },
    );
  }
  if (match.match_date) {
    return new Date(match.match_date).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return "—";
}

export function isUpcomingStream(stream: StreamData, now: string): boolean {
  if (stream.is_live) return true;
  const match = extractMatch(stream.event_matches);
  if (!match?.match_date) return true; // no date = treat as upcoming
  return match.match_date >= now.split("T")[0];
}

export function isPastStream(stream: StreamData, now: string): boolean {
  if (stream.is_live) return false;
  const match = extractMatch(stream.event_matches);
  if (!match?.match_date) return false; // no date = not past
  return match.match_date < now.split("T")[0];
}

// ─── Stream Card Component ────────────────────────────────────────────────────
export default function StreamCard({ stream }: { stream: StreamData }) {
  const match = extractMatch(stream.event_matches);
  const videoId = extractYouTubeId(stream.youtube_url);
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return (
    <a
      href={stream.youtube_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-red-500 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-800">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={getStreamTitle(match)}
            width={128}
            height={80}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No thumbnail
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-red-600 rounded-full w-14 h-14 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* LIVE badge */}
        {stream.is_live && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            🔴 LIVE
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors line-clamp-2">
          {getStreamTitle(match)}
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          {formatMatchDateTime(match)}
        </p>
      </div>
    </a>
  );
}
