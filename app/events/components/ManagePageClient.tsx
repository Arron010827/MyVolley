"use client";

import { useState } from "react";
import RulesUrlManager from "@/app/events/components/RulesUrlManager";
import ClubGroupManager from "@/app/events/components/ClubGroupManager";
import MatchScheduler from "@/app/events/components/MatchScheduler";
import StreamManagementTab from "@/app/events/components/StreamManagementTab";
import type { BracketData } from "@/lib/bracket-types";
import BracketManager from "@/app/events/components/BracketManager";

interface Props {
  event: { id: string; title: string; type: string; rules_url: string | null; };
  clubEvents: {
    club_id: string;
    group_name: string | null;
    club_name: string;
    logo_url: string | null;
  }[];
  allClubs: { id: string; club_name: string }[];
  matches: Match[];
  eventId: string;
  streams: {
    id: string;
    youtube_url: string;
    is_live: boolean;
    match_id: string | null;
    event_id: string;
  }[];
  allEvents: { id: string; title: string }[]; // ← add
  allMatches: {
    // ← add
    id: string;
    match_number: number;
    round: string | null;
    group_name: string | null;
    event_id: string;
    home_club: string;
    away_club: string;
  }[];
  bracket: BracketData | null;
}

export interface ClubInfo {
  id: string;
  club_name: string;
  logo_url: string | null;
}

export interface Match {
  id: string;
  match_number: number;
  court: string | null;
  match_date: string | null;
  match_time: string | null;
  home_score: number | null;
  away_score: number | null;
  group_name: string | null;
  round: string | null;
  stage: string | null;
  home_club_id: string;
  away_club_id: string;
  home_club: ClubInfo | null;
  away_club: ClubInfo | null;
  sets: { set_number: number; home_points: number; away_points: number }[];
}

export default function ManagePageClient({
  event,
  clubEvents,
  allClubs,
  matches,
  eventId,
  streams,
  allEvents,
  allMatches,
  bracket,
}: Props) {
  const [activeTab, setActiveTab] = useState<"teams" | "schedule" | "bracket" | "streams">(
    "teams",
  );

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-0">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "teams"
              ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
              : "text-gray-500 hover:text-white"
          }`}
        >
          👥 Teams & Groups
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "schedule"
              ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
              : "text-gray-500 hover:text-white"
          }`}
        >
          📅 Match Schedule
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bracket")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "bracket"
              ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
              : "text-gray-500 hover:text-white"
          }`}
        >
          🏆 Elimination Bracket
        </button>
        <button
          onClick={() => setActiveTab("streams")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "streams"
              ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
              : "text-gray-500 hover:text-white"
          }`}
        >
          📺 Streams
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "teams" && (
        <div className="space-y-8">
          <RulesUrlManager
            eventId={eventId}
            initialUrl={event.rules_url}
          />
          <ClubGroupManager
            eventId={eventId}
            eventType={event.type}
            clubEvents={clubEvents}
            allClubs={allClubs}
          />
      </div>
      )}

      {activeTab === "schedule" && (
        <MatchScheduler
          eventId={eventId}
          eventType={event.type}
          clubEvents={clubEvents}
          matches={matches}
          bracket={bracket}
        />
      )}
      {activeTab === "bracket" && (
        <BracketManager
          eventId={eventId}
          bracket={bracket}
          clubs={clubEvents}
          qualificationClubs={clubEvents}
          qualificationMatches={matches} />
      )}
      {activeTab === "streams" && (
        <StreamManagementTab
          eventId={eventId}
          eventTitle={event.title}
          matches={clubEvents.length > 0 ? matches : []}
          streams={streams}
          allEvents={allEvents}
          allMatches={allMatches}
        />
      )}
    </div>
  );
}
