"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractYouTubeId } from "@/lib/youtube";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Club {
  id: string;
  club_name: string;
  logo_url: string | null;
}

export interface StreamCardMatch {
  id: string;
  match_number: number;
  round: string | null;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  court: string | null;
  home_club: Club | null;
  away_club: Club | null;
}

export interface StreamCardStream {
  id: string;
  youtube_url: string;
  is_live: boolean;
  match_id: string | null;
  event_id: string | null;
}

interface AvailableMatch {
  id: string;
  match_number: number;
  round: string | null;
  group_name: string | null;
  event_id: string;
  home_club: string;
  away_club: string;
}

interface Props {
  stream: StreamCardStream | null;
  match: StreamCardMatch | null;
  eventTitle: string | null;
  createdBy: string | null;
  eventId: string | null;
  allEvents: { id: string; title: string }[];
  allMatches: AvailableMatch[];
  onAssign: (
    youtubeUrl: string,
    matchId: string,
    eventId: string,
  ) => Promise<void>;
  onToggleLive: (streamId: string, currentStatus: boolean) => Promise<void>;
  onEdit: (
    streamId: string,
    youtubeUrl: string,
    matchId: string,
    eventId: string,
  ) => Promise<void>;
  onDelete: (streamId: string) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMatchLabel(match: StreamCardMatch | null): string {
  if (!match) return "Unlinked Stream";
  const home = match.home_club?.club_name ?? "?";
  const away = match.away_club?.club_name ?? "?";
  const phase = [
    match.round,
    match.group_name ? `Group ${match.group_name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `Match #${match.match_number}${phase ? ` · ${phase}` : ""} — ${home} vs ${away}`;
}

function getMatchMeta(match: StreamCardMatch | null): string {
  if (!match) return "";
  return [
    match.match_date &&
      new Date(match.match_date).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    match.match_time?.slice(0, 5),
    match.court,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getAvailableMatchLabel(m: AvailableMatch): string {
  return `Match #${m.match_number}${m.round ? ` · ${m.round}` : ""}${m.group_name ? ` (Group ${m.group_name})` : ""} — ${m.home_club} vs ${m.away_club}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StreamAssignCard({
  stream,
  match,
  eventTitle,
  createdBy,
  eventId,
  allEvents,
  allMatches,
  onAssign,
  onToggleLive,
  onEdit,
  onDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Assign state
  const [assignUrl, setAssignUrl] = useState("");
  const [assignEventId, setAssignEventId] = useState(eventId ?? "");
  const [assignMatchId, setAssignMatchId] = useState(match?.id ?? "");
  const [assignError, setAssignError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(stream?.youtube_url ?? "");
  const [editEventId, setEditEventId] = useState(
    stream?.event_id ?? eventId ?? "",
  );
  const [editMatchId, setEditMatchId] = useState(
    stream?.match_id ?? match?.id ?? "",
  );
  const [editError, setEditError] = useState<string | null>(null);

  // Thumbnail from stream URL or assign URL preview
  const previewUrl = stream?.youtube_url ?? assignUrl;
  const videoId = extractYouTubeId(previewUrl);
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  // Filter matches by selected event
  const assignEventMatches = allMatches.filter(
    (m) => m.event_id === assignEventId,
  );
  const editEventMatches = allMatches.filter((m) => m.event_id === editEventId);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleAssign() {
    if (!assignUrl.trim()) {
      setAssignError("Please enter a YouTube URL");
      return;
    }
    if (!assignMatchId) {
      setAssignError("Please select a match");
      return;
    }
    setAssignError(null);
    startTransition(async () => {
      await onAssign(assignUrl.trim(), assignMatchId, assignEventId);
      setAssignUrl("");
      router.refresh();
    });
  }

  async function handleEdit() {
    if (!editUrl.trim()) {
      setEditError("Please enter a YouTube URL");
      return;
    }
    if (!editMatchId) {
      setEditError("Please select a match");
      return;
    }
    setEditError(null);
    startTransition(async () => {
      await onEdit(stream!.id, editUrl.trim(), editMatchId, editEventId);
      setIsEditing(false);
      router.refresh();
    });
  }

  async function handleToggleLive() {
    startTransition(async () => {
      await onToggleLive(stream!.id, stream!.is_live);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm("Delete this stream? This cannot be undone.")) return;
    startTransition(async () => {
      await onDelete(stream!.id);
      router.refresh();
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 flex gap-4 items-start ${
        stream ? "border-gray-800" : "border-gray-700 border-dashed"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="Stream thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs text-center px-1">
            No preview
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Title + live badge */}
        <div className="flex items-center gap-2">
          {stream?.is_live && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">
              LIVE
            </span>
          )}
          <p className="font-semibold text-white truncate text-sm">
            {getMatchLabel(match)}
          </p>
        </div>

        {/* Event title */}
        {eventTitle && <p className="text-xs text-gray-400">📅 {eventTitle}</p>}

        {/* Match meta */}
        {match && (
          <p className="text-xs text-gray-500">{getMatchMeta(match)}</p>
        )}

        {/* Created by */}
        {createdBy && <p className="text-xs text-gray-500">👤 {createdBy}</p>}

        {/* ── Edit mode ────────────────────────────────────────────────────── */}
        {isEditing && (
          <div className="space-y-2 pt-1">
            <select
              value={editEventId}
              onChange={(e) => {
                setEditEventId(e.target.value);
                setEditMatchId("");
              }}
              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
            >
              <option value="">— Select event —</option>
              {allEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>

            {editEventId && (
              <select
                value={editMatchId}
                onChange={(e) => setEditMatchId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
              >
                <option value="">— Select match —</option>
                {editEventMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getAvailableMatchLabel(m)}
                  </option>
                ))}
              </select>
            )}

            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 placeholder-gray-600"
            />

            {editError && <p className="text-red-400 text-xs">{editError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={isPending}
                className="bg-green-700 hover:bg-green-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditUrl(stream?.youtube_url ?? "");
                  setEditEventId(stream?.event_id ?? eventId ?? "");
                  setEditMatchId(stream?.match_id ?? match?.id ?? "");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Assign mode — no stream yet ──────────────────────────────────── */}
        {!stream && !isEditing && (
          <div className="space-y-2 pt-1">
            {/* Event selector — only if no eventId locked in */}
            {!eventId && (
              <select
                value={assignEventId}
                onChange={(e) => {
                  setAssignEventId(e.target.value);
                  setAssignMatchId("");
                }}
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
              >
                <option value="">— Select event —</option>
                {allEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            )}

            {/* Match selector — only if no match locked in */}
            {!match && assignEventId && (
              <select
                value={assignMatchId}
                onChange={(e) => setAssignMatchId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
              >
                <option value="">— Select match —</option>
                {assignEventMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getAvailableMatchLabel(m)}
                  </option>
                ))}
              </select>
            )}

            {/* YouTube URL + Assign button */}
            <div className="flex gap-2">
              <input
                type="url"
                value={assignUrl}
                onChange={(e) => setAssignUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 placeholder-gray-600"
              />
              <button
                onClick={handleAssign}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {isPending ? "Saving..." : "Assign"}
              </button>
            </div>

            {assignError && (
              <p className="text-red-400 text-xs">{assignError}</p>
            )}
          </div>
        )}

        {/* ── Assigned — show URL + actions ─────────────────────────────────── */}
        {stream && !isEditing && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-500 truncate">
              🔗{" "}
              <a
                href={stream.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-400 transition-colors"
              >
                {stream.youtube_url}
              </a>
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleToggleLive}
                disabled={isPending}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                  stream.is_live
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {stream.is_live ? "End Live" : "Go Live"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditUrl(stream.youtube_url);
                  setEditEventId(stream.event_id ?? eventId ?? "");
                  setEditMatchId(stream.match_id ?? match?.id ?? "");
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-red-400 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
