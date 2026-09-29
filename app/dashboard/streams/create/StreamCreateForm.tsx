"use client";

import { useState } from "react";
import { createStream } from "./actions";

interface Event {
  id: string;
  title: string;
}

interface Match {
  id: string;
  match_number: number;
  round: string | null;
  group_name: string | null;
  event_id: string;
  home_club: { club_name: string } | { club_name: string }[] | null;
  away_club: { club_name: string } | { club_name: string }[] | null;
}

interface Props {
  events: Event[];
  matches: Match[];
}

// ─── Helper: safely extract club name from Supabase join ─────────────────────
function getClubName(raw: Match["home_club"]): string {
  if (!raw) return "?";
  if (Array.isArray(raw)) return raw[0]?.club_name ?? "?";
  return raw.club_name;
}

export default function StreamCreateForm({ events, matches }: Props) {
  const [selectedEventId, setSelectedEventId] = useState("");

  // Only show matches belonging to the selected event
  const eventMatches = matches.filter((m) => m.event_id === selectedEventId);

  return (
    <form action={createStream} className="space-y-6">
      {/* Linked Event */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Linked Event <span className="text-gray-500">(optional)</span>
        </label>
        <select
          name="event_id"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
        >
          <option value="">— Not linked to an event —</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </div>

      {/* Linked Match — only visible when event is selected */}
      {selectedEventId && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Linked Match <span className="text-gray-500">(optional)</span>
          </label>
          {eventMatches.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">
              No matches found for this event yet
            </p>
          ) : (
            <select
              name="match_id"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
            >
              <option value="">— Not linked to a match —</option>
              {eventMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  Match #{match.match_number}
                  {match.round ? ` · ${match.round}` : ""}
                  {match.group_name ? ` (Group ${match.group_name})` : ""}
                  {" — "}
                  {getClubName(match.home_club)} vs{" "}
                  {getClubName(match.away_club)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* YouTube URL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          YouTube URL <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          name="youtube_url"
          required
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
        />
        <p className="text-gray-500 text-xs mt-1">
          Supports youtube.com/watch, youtu.be, and youtube.com/live links
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Add Stream
      </button>
    </form>
  );
}
