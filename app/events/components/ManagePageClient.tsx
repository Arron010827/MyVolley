"use client";

import { useState } from "react";
import ClubGroupManager from "@/app/events/components/ClubGroupManager";
import MatchScheduler from "@/app/events/components/MatchScheduler";
import StreamManagementTab from "@/app/events/components/StreamManagementTab";
import type { BracketData } from "@/lib/bracket-types";
import BracketManager from "@/app/events/components/BracketManager";
import DocumentControlTab from "./DocumentControlTab";
import EventDetailsForm, {  type EventDetails, } from "@/app/events/components/EventDetailsForm";
import { updateEventDetails } from "@/app/events/[eventId]/manage/actions";

interface Props {
  event: { 
    id: string; 
    title: string; 
    type: string;
    gender: string;
    description: string | null;
    event_date: string;
    end_date: string | null;
    location: string;
    state: string;
  };
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
  documents: {
  id: string;
  event_id: string;
  document_name: string;
  document_url: string;
  display_order: number;
  created_at: string;
  }[];
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
  documents,
}: Props) {
  const [activeTab, setActiveTab] = useState<"details" | "documents" | "teams" | "schedule" | "bracket" | "streams">(
    "teams",
  );

//____________ For event details form state management_____________
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsSuccess, setDetailsSuccess] = useState(false);

  async function handleSaveEventDetails(values: EventDetails) {
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsSuccess(false);

    try {
      await updateEventDetails(eventId, values);
      setDetailsSuccess(true);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "Failed to update event details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-0">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "details"
              ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
              : "text-gray-500 hover:text-white"
          }`}
        >
          📝 Event Details
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "documents"
              ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
              : "text-gray-500 hover:text-white"
          }`}
        >
          📄 Document Control
        </button>
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
      {activeTab === "details" && (
        <div className="space-y-4">
          {detailsSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Event details updated successfully.
            </div>
          )}
          <div
            style={{
              "--form-bg": "#111827",
              "--form-border": "#374151",
              "--form-text": "#f9fafb",
              "--form-input-bg": "#1f2937",
              "--form-placeholder": "#9ca3af",
              "--form-label": "#e5e7eb",
            } as React.CSSProperties}
          >
          <EventDetailsForm
            key={eventId}
            initialValues={{
              title: event.title ?? "",
              gender: event.gender ?? "mix",
              type: event.type ?? "",
              eventDate: event.event_date ?? "",
              endDate: event.end_date ?? "",
              location: event.location ?? "",
              state: event.state ?? "",
              description: event.description ?? "",
            }}
            submitLabel="Save Event Details"
            loadingLabel="Saving changes..."
            loading={detailsLoading}
            error={detailsError}
            onSubmit={handleSaveEventDetails}
          />
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <DocumentControlTab
          eventId={eventId}
          documents={documents}
        />
      )}

      {activeTab === "teams" && (
        <div className="space-y-8">
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
