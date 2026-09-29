"use client";

import { useCallback } from "react";
import StreamAssignCard from "@/components/StreamAssignCard";
import {
  assignStream,
  editStream,
  toggleStreamLive,
  deleteStream,
} from "@/app/events/[eventId]/manage/actions";

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
  match_date: string | null;
  match_time: string | null;
  court: string | null;
  home_club: Club | null;
  away_club: Club | null;
}

interface Stream {
  id: string;
  youtube_url: string;
  is_live: boolean;
  match_id: string | null;
  event_id: string | null;
}

interface Props {
  eventId: string;
  eventTitle: string;
  matches: Match[];
  streams: Stream[];
  allEvents: { id: string; title: string }[];
  allMatches: {
    id: string;
    match_number: number;
    round: string | null;
    group_name: string | null;
    event_id: string;
    home_club: string;
    away_club: string;
  }[];
}

export default function StreamManagementTab({
  eventId,
  eventTitle,
  matches,
  streams,
  allEvents,
  allMatches,
}: Props) {
  const streamByMatchId = Object.fromEntries(
    streams.map((s) => [s.match_id, s]),
  );

  const unassignedMatches = matches.filter((m) => !streamByMatchId[m.id]);
  const assignedMatches = matches.filter((m) => streamByMatchId[m.id]);

  const handleAssign = useCallback(
    (youtubeUrl: string, matchId: string, evId: string) =>
      assignStream(eventId, matchId, youtubeUrl),
    [eventId],
  );

  const handleToggleLive = useCallback(
    (streamId: string, currentStatus: boolean) =>
      toggleStreamLive(eventId, streamId, currentStatus),
    [eventId],
  );

  const handleEdit = useCallback(
    (streamId: string, youtubeUrl: string, matchId: string, evId: string) =>
      editStream(eventId, streamId, youtubeUrl, matchId, evId),
    [eventId],
  );

  const handleDelete = useCallback(
    (streamId: string) => deleteStream(eventId, streamId),
    [eventId],
  );

  // Convert matches to AvailableMatch format for dropdowns
  const availableMatches = matches.map((m) => ({
    id: m.id,
    match_number: m.match_number,
    round: m.round,
    group_name: m.group_name,
    event_id: eventId,
    home_club: m.home_club?.club_name ?? "?",
    away_club: m.away_club?.club_name ?? "?",
  }));

  return (
    <div className="space-y-8">
      {/* Unassigned matches */}
      {unassignedMatches.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-yellow-400">⚠️</span>
            Matches without streams
            <span className="text-sm text-gray-500 font-normal">
              ({unassignedMatches.length})
            </span>
          </h2>
          <div className="space-y-3">
            {unassignedMatches.map((match) => (
              <StreamAssignCard
                key={match.id}
                stream={null}
                match={match}
                eventTitle={eventTitle}
                createdBy={null}
                eventId={eventId}
                allEvents={allEvents}
                allMatches={availableMatches}
                onAssign={handleAssign}
                onToggleLive={handleToggleLive}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assigned matches */}
      {assignedMatches.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-green-400">✅</span>
            Matches with streams
            <span className="text-sm text-gray-500 font-normal">
              ({assignedMatches.length})
            </span>
          </h2>
          <div className="space-y-3">
            {assignedMatches.map((match) => (
              <StreamAssignCard
                key={match.id}
                stream={streamByMatchId[match.id]}
                match={match}
                eventTitle={eventTitle}
                createdBy={null}
                eventId={eventId}
                allEvents={allEvents}
                allMatches={availableMatches}
                onAssign={handleAssign}
                onToggleLive={handleToggleLive}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
          <p>No matches yet</p>
          <p className="text-sm mt-1">
            Generate a schedule first in the Match Schedule tab
          </p>
        </div>
      )}
    </div>
  );
}
