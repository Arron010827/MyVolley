"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveMatches,
  saveMatchSets,
} from "@/app/events/[eventId]/manage/actions";
import { Match } from "./ManagePageClient";

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
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Schedule generator inputs
  const [startTime, setStartTime] = useState("08:00");
  const [courts, setCourts] = useState(2);
  const [matchDuration, setMatchDuration] = useState(45);
  const [startDate, setStartDate] = useState("");
  const [maxPerDay, setMaxPerDay] = useState(20);
  const [dayGap, setDayGap] = useState(1);

  // Score editing state
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [sets, setSets] = useState<{ home: string; away: string }[]>([
    { home: "", away: "" },
    { home: "", away: "" },
    { home: "", away: "" },
  ]);

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

    // Save to DB
    startTransition(async () => {
      await saveMatches(eventId, generatedMatches);
      router.refresh();
    });
  }

  // ─── Save Sets ─────────────────────────────────────────────────────────────
  async function handleSaveSets(matchId: string) {
    // Filter out empty sets
    const filledSets = sets
      .map((s, i) => ({
        set_number: i + 1,
        home_points: parseInt(s.home),
        away_points: parseInt(s.away),
      }))
      .filter((s) => !isNaN(s.home_points) && !isNaN(s.away_points));

    if (filledSets.length === 0) return;

    // ✅ Validate each set before saving
    for (const set of filledSets) {
      const error = isValidSetScore(
        set.home_points,
        set.away_points,
        set.set_number,
      );
      if (error) {
        alert(error); // simple alert for now — can be improved to inline message later
        return;
      }
    }
    startTransition(async () => {
      await saveMatchSets(eventId, matchId, filledSets);
      setEditingMatch(null);
      setSets([
        { home: "", away: "" },
        { home: "", away: "" },
        { home: "", away: "" },
      ]);
      router.refresh();
    });
  }

  function isValidSetScore(
    home: number,
    away: number,
    setNumber: number,
  ): string | null {
    const target = setNumber === 5 ? 15 : 25;
    const maxScore = Math.max(home, away);
    const minScore = Math.min(home, away);

    // One team must have won (higher score)
    if (home === away) return `Set ${setNumber}: scores cannot be equal`;

    // Winner must reach target points
    if (maxScore < target) {
      return `Set ${setNumber}: winner must reach at least ${target} points`;
    }

    // If loser score lower than 24, the winning team should have exactly 25 points
    // If loser score equal or higher than 24, score difference must be exactly 2
    if (minScore < target - 1) {
      // Loser hasn't reached target-1 yet, winner must be exactly at target
      if (maxScore !== target) {
        return `Set ${setNumber}: if loser has ${minScore} points, winner must be exactly ${target}`;
      }
    } else {
      // Both teams near or above target — must be exactly 2 apart
      if (maxScore - minScore !== 2) {
        return `Set ${setNumber}: winner must lead by exactly 2 points (e.g. ${target}-${target - 2} or ${target + 1}-${target - 1})`;
      }
    }

    return null; // valid
  }

  function openScoreEditor(match: Match) {
    setEditingMatch(match.id);

    if (match.sets && match.sets.length > 0) {
      // Pre-fill with existing set scores
      const existingSets = match.sets
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          home: s.home_points.toString(),
          away: s.away_points.toString(),
        }));
      setSets(existingSets);
    } else {
      // No existing sets — start with 3 empty rows
      setSets([
        { home: "", away: "" },
        { home: "", away: "" },
        { home: "", away: "" },
      ]);
    }
  }

  // Group matches by group for display
  const matchesByGroup = initialMatches.reduce<Record<string, Match[]>>(
    (acc, m) => {
      const key = m.group_name ?? "all";
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {/* Schedule generator */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Generate Schedule</h2>
        <p className="text-gray-500 text-sm mb-4">
          ⚠️ Generating a new schedule will replace the existing one.
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

      {/* Match list */}
      {initialMatches.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
          <p>No matches generated yet</p>
          <p className="text-sm mt-1">
            Configure the settings above and click Generate
          </p>
        </div>
      ) : (
        Object.entries(matchesByGroup).map(([groupKey, groupMatches]) => (
          <div
            key={groupKey}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            {/* Group header */}
            <div className="px-5 py-3 border-b border-gray-800">
              <span className="text-sm font-bold text-white">
                {groupKey === "all"
                  ? eventType === "league"
                    ? "League Stage"
                    : "Group Stage"
                  : `Group ${groupKey}`}
              </span>
              <span className="text-gray-500 text-xs ml-2">
                {groupMatches.length} matches
              </span>
            </div>

            {/* Match table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    <th className="px-5 py-3 text-left w-12">Match</th>
                    <th className="px-5 py-3 text-left w-30">Date</th>
                    <th className="px-5 py-3 text-left w-18">Time</th>
                    <th className="px-5 py-3 text-left w-22">Court</th>
                    <th className="px-5 py-3 text-center w-40">Home</th>
                    <th className="px-5 py-3 text-center w-50">Score</th>
                    <th className="px-5 py-3 text-center w-40">Away</th>
                    <th className="px-5 py-3 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {groupMatches.map((match) => (
                    <tr
                      key={match.id}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-400">
                        #{match.match_number}
                      </td>
                      <td className="px-5 py-3 text-gray-300">
                        {match.match_date
                          ? new Date(match.match_date).toLocaleDateString(
                              "en-MY",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-300">
                        {match.match_time ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-300">
                        {match.court ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-medium text-center text-white">
                        {match.home_club?.club_name ?? "—"}
                      </td>

                      {/* Score cell */}
                      <td className="px-5 py-3 text-center">
                        {editingMatch === match.id ? (
                          <div className="space-y-1">
                            {sets.map((set, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-center gap-1"
                              >
                                <span className="text-gray-600 text-xs w-10 text-right">
                                  Set {i + 1}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={set.home}
                                  onChange={(e) => {
                                    const updated = [...sets];
                                    updated[i] = {
                                      ...updated[i],
                                      home: e.target.value,
                                    };
                                    setSets(updated);
                                  }}
                                  className="w-10 bg-gray-700 border border-gray-600 text-white text-center rounded px-1 py-0.5 text-xs focus:outline-none focus:border-red-500"
                                />
                                <span className="text-gray-500 text-xs">—</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={set.away}
                                  onChange={(e) => {
                                    const updated = [...sets];
                                    updated[i] = {
                                      ...updated[i],
                                      away: e.target.value,
                                    };
                                    setSets(updated);
                                  }}
                                  className="w-10 bg-gray-700 border border-gray-600 text-white text-center rounded px-1 py-0.5 text-xs focus:outline-none focus:border-red-500"
                                />
                              </div>
                            ))}

                            {/* Add/remove set buttons */}
                            <div className="flex justify-center gap-2 mt-1">
                              {sets.length < 5 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSets([...sets, { home: "", away: "" }])
                                  }
                                  className="text-xs text-gray-400 hover:text-white"
                                >
                                  + Set
                                </button>
                              )}
                              {sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setSets(sets.slice(0, -1))}
                                  className="text-xs text-gray-400 hover:text-red-400"
                                >
                                  - Set
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            {/* Match score */}
                            <span
                              className={`font-mono font-bold text-xl ${
                                match.home_score !== null
                                  ? "text-white"
                                  : "text-gray-600"
                              }`}
                            >
                              {match.home_score !== null
                                ? `${match.home_score} — ${match.away_score}`
                                : "vs"}
                            </span>

                            {/* Set scores in pipe format */}
                            {match.sets && match.sets.length > 0 && (
                              <span className="text-gray-500 text-xs font-mono">
                                {match.sets
                                  .sort((a, b) => a.set_number - b.set_number)
                                  .map(
                                    (set) =>
                                      `${set.home_points}-${set.away_points}`,
                                  )
                                  .join(" | ")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3 font-medium text-center text-white">
                        {match.away_club?.club_name ?? "—"}
                      </td>

                      {/* Action cell */}
                      <td className="px-5 py-3 text-right">
                        {editingMatch === match.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveSets(match.id)}
                              disabled={isPending}
                              className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMatch(null)}
                              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openScoreEditor(match)}
                            className="text-xs text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {match.home_score !== null
                              ? "Edit Score"
                              : "Enter Score"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
