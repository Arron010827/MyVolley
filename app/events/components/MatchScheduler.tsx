"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMatches } from "@/app/events/[eventId]/manage/actions";
import { Match } from "./ManagePageClient";
import MatchScheduleDisplay from "./MatchScheduleDisplay";
import MatchSchedulerKnockout from "@/app/events/components/MatchSchedulerKnockout";
import { BracketData } from "@/lib/bracket-types";

interface ClubEvent {
  club_id: string;
  group_name: string | null;
  club_name: string;
  logo_url: string | null;
}

interface Props {
  eventId: string;
  eventType: string;
  clubEvents: ClubEvent[];
  matches: Match[];
  bracket: BracketData | null;
}

// ─── Round robin algorithm ────────────────────────────────────────────────────
// Uses the "circle method" — fix one team, rotate the rest
// returns actual team IDs instead of indices
function generateRoundRobin(teams: string[]): [string, string][][] {
  const rounds: [string, string][][] = [];

  // If odd number of teams add BYE placeholder
  const t = teams.length % 2 === 0 ? [...teams] : [...teams, "BYE"];
  const count = t.length;

  for (let round = 0; round < count - 1; round++) {
    const pairs: [string, string][] = [];

    for (let i = 0; i < count / 2; i++) {
      const home = t[i];
      const away = t[count - 1 - i];

      // Skip bye matches
      if (home !== "BYE" && away !== "BYE") {
        pairs.push([home, away]);
      }
    }

    rounds.push(pairs);

    // Rotate — keep index 0 fixed, rotate the rest clockwise
    t.splice(1, 0, t.pop()!);
  }

  return rounds;
}

// ─── Add minutes to a time string ────────────────────────────────────────────
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export default function MatchScheduler({
  eventId,
  eventType,
  clubEvents,
  matches: initialMatches,
  bracket,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scheduleStage, setScheduleStage] = useState<
    "group-league" | "elimination"
  >("group-league");

  // Schedule generator inputs
  const [startTime, setStartTime] = useState("08:00");
  const [courts, setCourts] = useState(2);
  const [matchDuration, setMatchDuration] = useState(45);
  const [startDate, setStartDate] = useState("");
  const [maxPerDay, setMaxPerDay] = useState(20);
  const [dayGap, setDayGap] = useState(1);

  // Group clubs by group
  const grouped = clubEvents.reduce<Record<string, ClubEvent[]>>((acc, ce) => {
    const key = ce.group_name ?? "all";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ce);
    return acc;
  }, {});

  // ─── Generate schedule ──────────────────────────────────────────────────────
  function handleGenerate() {
    if (!startDate) {
      alert("Please select a start date");
      return;
    }

    const generatedMatches: {
      match_number: number;
      home_club_id: string;
      away_club_id: string;
      court: string;
      match_date: string;
      match_time: string;
      group_name: string | null;
      round: string;
    }[] = [];

    let matchCounter = 1;
    let currentTime = startTime;
    let currentDate = startDate;
    let matchesOnDay = 0;

    // Generate for each group separately
    Object.entries(grouped).forEach(([groupKey, groupClubs]) => {
      const teamIds = groupClubs.map((c) => c.club_id);
      const rounds = generateRoundRobin(teamIds);
      const groupLabel = groupKey === "all" ? null : groupKey;
      const round = eventType === "league" ? "League Stage" : "Group Stage";

      rounds.forEach((roundPairs) => {
        roundPairs.forEach((pair) => {
          const homeId = pair[0];
          const awayId = pair[1];

          // ✅ Skip if either club ID is undefined (BYE placeholder)
          if (!homeId || !awayId || homeId === "BYE" || awayId === "BYE")
            return;

          // Check if we've hit the daily limit
          if (matchesOnDay >= maxPerDay) {
            // Move to next day
            const next = new Date(currentDate);
            next.setDate(next.getDate() + dayGap);
            currentDate = next.toISOString().split("T")[0];
            currentTime = startTime; // reset time
            matchesOnDay = 0; // reset counter
          }
          const court = ((matchCounter - 1) % courts) + 1;

          // Increment time every N matches (where N = number of courts)
          if (matchCounter > 1 && (matchCounter - 1) % courts === 0) {
            currentTime = addMinutes(currentTime, matchDuration);
          }

          generatedMatches.push({
            match_number: matchCounter,
            home_club_id: homeId,
            away_club_id: awayId,
            court: `Court ${court}`,
            match_date: currentDate,
            match_time: currentTime,
            group_name: groupLabel,
            round,
          });

          matchCounter++;
          matchesOnDay++;
        });
      });

      // The next group should just continue from where time left off
      // without adding an extra gap
      /*       // Reset time between groups
      currentTime = addMinutes(currentTime, matchDuration); */
    });

    // Save generated schedule to the database.
    startTransition(async () => {
      const stage =
        eventType === "league" ? "league" : "group";

      try {
        try {
          // First attempt without replacement confirmation.
          await saveMatches(
            eventId,
            generatedMatches,
            stage,
            false,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown error";

          // Other errors should not trigger confirmation.
          if (!message.includes("SCHEDULE_RESET_REQUIRED")) {
            throw error;
          }

          // Existing schedule detected: ask the organiser.
          const confirmed = window.confirm(
            `An existing ${stage} schedule was found.\n\n` +
            "Regenerating will replace the existing matches " +
            "and their recorded scores. Linked streams or other " +
            "references may also be affected.\n\n" +
            "The elimination bracket and other stages will remain unchanged.\n\n" +
            "Do you want to continue?"
          );

          if (!confirmed) {
            return;
          }

          // Retry only after explicit confirmation.
          await saveMatches(
            eventId,
            generatedMatches,
            stage,
            true,
          );
        }

        // Refresh only after successful regeneration.
        router.refresh();
      } catch (error) {
        console.error(
          "Schedule regeneration failed:",
          error,
        );

        window.alert(
          error instanceof Error
            ? error.message
            : "Unable to generate the schedule."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Schedule generator */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Generate Schedule</h2>
        <p className="text-gray-500 text-sm mb-4">
          Generate a group or league match schedule automatically.
          If a schedule already exists, you will be asked to
          confirm before replacing it. Other competition stages
          will not be regenerated.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Start time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Number of courts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Courts
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={courts}
              onChange={(e) => setCourts(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Match duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Match Duration (mins)
            </label>
            <input
              type="number"
              min={15}
              max={180}
              value={matchDuration}
              onChange={(e) => setMatchDuration(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            />
          </div>
          {/* Max Matches Per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Matches Per Day
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Day Gap */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Day Gap
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={dayGap}
              onChange={(e) => setDayGap(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              Days between match days
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isPending || clubEvents.length < 2}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? "Generating..." : "⚡ Generate Schedule"}
        </button>

        {clubEvents.length < 2 && (
          <p className="text-yellow-500 text-xs mt-2">
            ⚠️ Add at least 2 clubs before generating a schedule
          </p>
        )}
      </div>

      {/* Saved match schedule */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
          <button
            type="button"
            onClick={() => setScheduleStage("group-league")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              scheduleStage === "group-league"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Group / League
          </button>

          <button
            type="button"
            onClick={() => setScheduleStage("elimination")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              scheduleStage === "elimination"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Elimination
          </button>
        </div>

        <MatchScheduleDisplay
          eventId={eventId}
          matches={initialMatches}
          stage={scheduleStage}
          canEditScores={true}
        />
      </div>

      <MatchSchedulerKnockout
        eventId={eventId}
        bracket={bracket}
        existingMatches={initialMatches}
        groupMatchDuration={matchDuration}
      />
    </div>
  );
}
