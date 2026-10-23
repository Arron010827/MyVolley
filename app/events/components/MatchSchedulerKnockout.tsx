
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BracketData } from "@/lib/bracket-types";
import { saveKnockoutSchedule } from "@/app/events/[eventId]/manage/bracket-actions";
import type { Match } from "@/app/events/components/ManagePageClient";

interface Props {
  eventId: string;
  bracket: BracketData | null;
  existingMatches: Match[];
  groupMatchDuration: number;
}

function getKnockoutRounds(bracketSize: number) {
  const roundNames: Record<number, string> = {
    2: "Final",
    4: "Semifinal",
    8: "Quarterfinal",
    16: "Round of 16",
    32: "Round of 32",
    64: "Round of 64",
  };

  const rounds: { value: number; label: string }[] = [];
  const totalRounds = Math.log2(bracketSize);

  for (let roundIndex = 1; roundIndex <= totalRounds; roundIndex++) {
    const teamsInRound = bracketSize / 2 ** (roundIndex - 1);

    rounds.push({
      value: roundIndex,
      label: roundNames[teamsInRound] ?? `Round of ${teamsInRound}`,
    });
  }

  return rounds;
}

type ScheduledKnockoutMatch = {
  bracketMatchId: string;
  matchId: string;
  phase: "main" | "repechage" | "third_place";
  roundIndex: number;
  round: string;
  position: number;
  court: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

type ScheduleConflict = {
  match: string;
  issue: string;
};

function getAbsoluteMinutes(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  return (
    Math.floor(Date.UTC(year, month - 1, day) / 60000) +
    hours * 60 +
    minutes
  );
}

function normalizeCourt(court: string | number | null): string {
  return String(court ?? "")
    .trim()
    .replace(/^court\s*/i, "")
    .toLowerCase();
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const resultHours = Math.floor(normalizedMinutes / 60);
  const resultMinutes = normalizedMinutes % 60;

  return `${String(resultHours).padStart(2, "0")}:${String(
    resultMinutes
  ).padStart(2, "0")}`;
}

function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day + days);

  return `${nextDate.getFullYear()}-${String(
    nextDate.getMonth() + 1
  ).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function MatchSchedulerKnockout({
  eventId,
  bracket,
  existingMatches,
  groupMatchDuration,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [courts, setCourts] = useState(2);
  const [matchDuration, setMatchDuration] = useState(45);
  const [maxPerCourtPerDay, setMaxPerCourtPerDay] = useState(20);
  const [dayGap, setDayGap] = useState(1);
  const [minRestMinutes, setMinRestMinutes] = useState(10);

  const [enableLaterRoundDuration, setEnableLaterRoundDuration] =
    useState(false);
  const [differentDurationStartRound, setDifferentDurationStartRound] =
    useState(1);
  const [laterRoundDuration, setLaterRoundDuration] = useState(60);

  const [scheduledMatches, setScheduledMatches] = useState<ScheduledKnockoutMatch[]>([]);
  const [scheduleError, setScheduleError] = useState("");
  const [hasScheduleConflicts, setHasScheduleConflicts] = useState(false);

  function handleGenerateSchedule() {
        setScheduleError("");
        setHasScheduleConflicts(false);
        setScheduledMatches([]);

        if (!bracket || bracket.matches.length === 0) {
            setScheduleError("No bracket matches are available to schedule.");
            return;
        }

        if (
            !startDate ||
            !startTime ||
            courts < 1 ||
            matchDuration < 1 ||
            maxPerCourtPerDay < 1 ||
            dayGap < 0 ||
            minRestMinutes < 0 ||
            (enableLaterRoundDuration &&
            (laterRoundDuration < 1 || differentDurationStartRound < 1))
        ) {
            setScheduleError("Please check your scheduling settings.");
            return;
        }

        const matchesById = new Map(
            bracket.matches.map((match) => [match.id, match])
        );

        // Build predecessor links from winner and loser destinations.
        const predecessors = new Map<string, Set<string>>();
        const successors = new Map<string, Set<string>>();

        for (const match of bracket.matches) {
            predecessors.set(match.id, new Set());
            successors.set(match.id, new Set());
        }

        for (const match of bracket.matches) {
            for (const destinationId of [
            match.winnerToId,
            match.loserToId,
            ]) {
            if (!destinationId) continue;

            if (!matchesById.has(destinationId)) {
                setScheduleError(
                `Match "${match.round}" links to a match that is missing from the bracket.`
                );
                return;
            }

            predecessors.get(destinationId)!.add(match.id);
            successors.get(match.id)!.add(destinationId);
            }
        }

        // Topological sort: feeder matches must appear before dependent matches.
        const remainingDependencies = new Map(
            [...predecessors.entries()].map(([id, ids]) => [id, ids.size])
        );

        const ready = bracket.matches
            .filter((match) => remainingDependencies.get(match.id) === 0)
            .sort(
            (a, b) =>
                a.roundIndex - b.roundIndex || a.position - b.position
            )
            .map((match) => match.id);

        const orderedIds: string[] = [];

        while (ready.length > 0) {
            const id = ready.shift()!;
            orderedIds.push(id);

            for (const nextId of successors.get(id) ?? []) {
            const remaining = remainingDependencies.get(nextId)! - 1;
            remainingDependencies.set(nextId, remaining);

            if (remaining === 0) {
                ready.push(nextId);
            }
            }
        }

        if (orderedIds.length !== bracket.matches.length) {
            setScheduleError(
            "The bracket contains a dependency cycle. Please check the bracket progression links."
            );
            return;
        }

        const dateToDayNumber = (date: string) => {
            const [year, month, day] = date.split("-").map(Number);
            return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
        };

        const dayNumberToDate = (dayNumber: number) => {
            const date = new Date(dayNumber * 86_400_000);
            return `${date.getUTCFullYear()}-${String(
            date.getUTCMonth() + 1
            ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
        };

        const baseDay = dateToDayNumber(startDate);
        const baseMinute =
            baseDay * 1440 + timeToMinutes(startTime);

        const generated: ScheduledKnockoutMatch[] = [];
        const scheduledEndById = new Map<string, number>();
        const clubAvailableAt = new Map<string, number>();
        const courtAvailableAt = Array(courts).fill(baseMinute);
        const dailyCourtCounts = new Map<string, number>();

        for (const id of orderedIds) {
            const match = matchesById.get(id)!;

            // Main rounds follow the selected starting round.
            // Repechage will not use the alternate duration.
            const useLaterDuration =
            enableLaterRoundDuration &&
            match.phase !== "repechage" &&
            (match.phase === "third_place" ||
              match.roundIndex >= differentDurationStartRound);

            const duration = useLaterDuration
            ? laterRoundDuration
            : matchDuration;

            let earliestStart = baseMinute;

            for (const predecessorId of predecessors.get(id) ?? []) {
            const predecessorEnd = scheduledEndById.get(predecessorId);

            if (predecessorEnd === undefined) {
                setScheduleError(
                "A feeder match could not be scheduled. Please try again."
                );
                return;
            }

              const predecessor = matchesById.get(predecessorId);

              // Enforce minimum rest across all bracket phases,
              // including repechage -> main elimination progression.
              const crossesPhase =
                predecessor !== undefined &&
                predecessor.phase !== match.phase;

              const requiredRest = crossesPhase
                ? minRestMinutes
                : minRestMinutes;

            earliestStart = Math.max(
                earliestStart,
                predecessorEnd + requiredRest
            );
            }

            // Also respect rest periods for clubs already assigned to matches.
            for (const clubId of [match.homeClubId, match.awayClubId]) {
              if (!clubId) continue;

              const availableAt = clubAvailableAt.get(clubId);

              if (availableAt !== undefined) {
                earliestStart = Math.max(earliestStart, availableAt);
              }
            }

            let chosen:
            | {
                courtIndex: number;
                start: number;
                end: number;
                date: string;
                }
            | undefined;

            // Find the earliest available court/date while respecting daily limits.
            for (let dayOffset = 0; dayOffset < 366 && !chosen; dayOffset++) {
            const dayNumber = baseDay + dayOffset;
            const date = dayNumberToDate(dayNumber);
            const dayStart = dayNumber * 1440 + timeToMinutes(startTime);

            const candidates: {
                courtIndex: number;
                start: number;
                end: number;
            }[] = [];

            for (let courtIndex = 0; courtIndex < courts; courtIndex++) {
                const countKey = `${date}-${courtIndex}`;
                const count = dailyCourtCounts.get(countKey) ?? 0;

                if (count >= maxPerCourtPerDay) continue;

                const start = Math.max(
                earliestStart,
                dayStart,
                courtAvailableAt[courtIndex]
                );

                // Do not roll a match past midnight on the same competition day.
                if (start + duration > (dayNumber + 1) * 1440) continue;

                candidates.push({
                courtIndex,
                start,
                end: start + duration,
                });
            }

            candidates.sort(
                (a, b) => a.start - b.start || a.courtIndex - b.courtIndex
            );

            if (candidates.length > 0) {
                const candidate = candidates[0];

                chosen = {
                ...candidate,
                date,
                };

                break;
            }

            // Only take the configured day gap when every court has reached
            // its daily limit. Otherwise, continue checking the next date.
            const allCourtsFull = Array.from(
                { length: courts },
                (_, courtIndex) =>
                (dailyCourtCounts.get(`${date}-${courtIndex}`) ?? 0) >=
                maxPerCourtPerDay
            ).every(Boolean);

            if (allCourtsFull) {
                dayOffset += dayGap;
            }
            }

            if (!chosen) {
            setScheduleError(
                "Could not fit all matches into the next 366 days. Please review your settings."
            );
            return;
            }

            const startWithinDay = chosen.start % 1440;
            const endWithinDay = chosen.end % 1440;

            generated.push({
            bracketMatchId: match.id,
            matchId: match.matchId,
            phase: match.phase,
            roundIndex: match.roundIndex,
            round: match.round,
            position: match.position,
            court: chosen.courtIndex + 1,
            date: chosen.date,
            startTime: addMinutesToTime(
                "00:00",
                startWithinDay
            ),
            endTime: addMinutesToTime(
                "00:00",
                endWithinDay
            ),
            durationMinutes: duration,
            });

            scheduledEndById.set(id, chosen.end);
            courtAvailableAt[chosen.courtIndex] = chosen.end;

            // Reserve the assigned clubs until their minimum rest period ends.
            for (const clubId of [match.homeClubId, match.awayClubId]) {
              if (!clubId) continue;

              clubAvailableAt.set(
                clubId,
                chosen.end + minRestMinutes
              );
            }

            const countKey = `${chosen.date}-${chosen.courtIndex}`;
            dailyCourtCounts.set(
            countKey,
            (dailyCourtCounts.get(countKey) ?? 0) + 1
            );
        }

        generated.sort(
            (a, b) =>
            a.date.localeCompare(b.date) ||
            a.startTime.localeCompare(b.startTime) ||
            a.court - b.court
        );

        const conflicts: ScheduleConflict[] = [];

        for (const knockout of generated) {
          const knockoutStart = getAbsoluteMinutes(
            knockout.date,
            knockout.startTime
          );
          const knockoutEnd = knockoutStart + knockout.durationMinutes;

          const bracketMatch = matchesById.get(knockout.bracketMatchId);

          for (const groupMatch of existingMatches) {
            if (!groupMatch.match_date || !groupMatch.match_time) {
              continue;
            }

            const groupStart = getAbsoluteMinutes(
              groupMatch.match_date,
              groupMatch.match_time
            );
            const groupEnd = groupStart + groupMatchDuration;

            const sameCourt =
              normalizeCourt(groupMatch.court) ===
              normalizeCourt(knockout.court);

            const overlaps =
              knockoutStart < groupEnd && groupStart < knockoutEnd;

            if (sameCourt && overlaps) {
              conflicts.push({
                match: `${knockout.round} — ${knockout.date}`,
                issue:
                  `Court ${knockout.court} overlaps with group/league ` +
                  `match #${groupMatch.match_number} (${groupMatch.match_time}).`,
              });
            }

            const knockoutClubIds = [
              bracketMatch?.homeClubId,
              bracketMatch?.awayClubId,
            ].filter((id): id is string => Boolean(id));

            const groupClubIds = [
              groupMatch.home_club_id,
              groupMatch.away_club_id,
            ].filter(Boolean);

            const sharedClub = knockoutClubIds.some((id) =>
              groupClubIds.includes(id)
            );

            if (sharedClub && overlaps) {
              conflicts.push({
                match: `${knockout.round} — ${knockout.date}`,
                issue:
                  `A club is scheduled for overlapping matches with group/league ` +
                  `match #${groupMatch.match_number}.`,
              });
            }
          }
        }

        if (conflicts.length > 0) {
          setHasScheduleConflicts(true);

          const uniqueMessages = [
            ...new Set(conflicts.map((conflict) => conflict.issue)),
          ];
          
          setScheduleError(
            `Found ${conflicts.length} scheduling conflict(s):\n` +
            uniqueMessages.map((message) => `• ${message}`).join("\n")
          );
          setScheduledMatches(generated);
          return;
        }

        setScheduledMatches(generated);
    }

  async function handleSaveSchedule() {
    setScheduleError("");
    setSaveMessage("");

    if (hasScheduleConflicts) {
      setScheduleError(
        "Please resolve scheduling conflicts before saving."
      );
      return;
    }

    if (scheduledMatches.length === 0) {
      setScheduleError("Generate a schedule preview first.");
      return;
    }

    setIsSaving(true);

    try {
      await saveKnockoutSchedule(
        eventId,
        scheduledMatches.map((match) => ({
          match_id: match.matchId,
          court: String(match.court),
          match_date: match.date,
          match_time: match.startTime,
        })),
      );

      setSaveMessage("Knockout schedule saved successfully.");
      router.refresh();
    } catch (error) {
      setScheduleError(
        error instanceof Error
          ? error.message
          : "Failed to save knockout schedule.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-2">
          Knockout Match Scheduler
        </h2>

        <p className="text-gray-500 text-sm mb-5">
          Schedule elimination, repechage and third-place matches while
          respecting bracket dependencies and team rest periods.
        </p>

        {!bracket ? (
          <p className="text-yellow-500 text-sm">
            Create an elimination bracket before scheduling knockout matches.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="text-sm text-gray-300">
                Start Date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
              </label>

              <label className="text-sm text-gray-300">
                Start Time
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
              </label>

              <label className="text-sm text-gray-300">
                Number of Courts
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={courts}
                  onChange={(e) => setCourts(Number(e.target.value))}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
              </label>

              <label className="text-sm text-gray-300">
                Standard Match Duration (mins)
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(Number(e.target.value))}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
              </label>

              <label className="text-sm text-gray-300">
                Max Matches per Court per Day
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxPerCourtPerDay}
                  onChange={(e) =>
                    setMaxPerCourtPerDay(Number(e.target.value))
                  }
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
              </label>

              <label className="text-sm text-gray-300">
                Day Gap
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={dayGap}
                  onChange={(e) => setDayGap(Number(e.target.value))}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
                <span className="block text-gray-500 text-xs mt-1">
                  1 means skip one calendar day before the next match day.
                </span>
              </label>

              <label className="text-sm text-gray-300">
                Minimum Team Rest (mins)
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={minRestMinutes}
                  onChange={(e) => setMinRestMinutes(Number(e.target.value))}
                  className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                />
              </label>
            </div>

            <div className="border-t border-gray-800 mt-5 pt-5">
              <label className="flex items-center gap-3 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={enableLaterRoundDuration}
                  onChange={(e) =>
                    setEnableLaterRoundDuration(e.target.checked)
                  }
                  className="h-4 w-4 accent-red-600"
                />
                Use a different duration for later rounds
              </label>

              {enableLaterRoundDuration && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <label className="text-sm text-gray-300">
                    Start Different Duration From
                    <select
                      value={differentDurationStartRound}
                      onChange={(e) =>
                        setDifferentDurationStartRound(Number(e.target.value))
                      }
                      className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                    >
                      {getKnockoutRounds(bracket.bracketSize).map((round) => (
                        <option key={round.value} value={round.value}>
                          {round.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-300">
                    Later-Round Duration (mins)
                    <input
                      type="number"
                      min={15}
                      max={180}
                      value={laterRoundDuration}
                      onChange={(e) =>
                        setLaterRoundDuration(Number(e.target.value))
                      }
                      className="mt-2 w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3"
                    />
                  </label>
                </div>
              )}
            </div>

            <p className="text-gray-500 text-xs mt-5">
              Scheduling and saving will be enabled after the dependency-aware
              generator and database update action are implemented.
            </p>
            <button
                type="button"
                onClick={handleGenerateSchedule}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
                Generate Schedule Preview
            </button>
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSaving || scheduledMatches.length === 0 || hasScheduleConflicts}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : "Save Schedule"}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </>
        )}
      </div>
      
        <div className="space-y-4 border-t pt-4">

            {scheduleError && (
                <p className="text-sm text-red-600" role="alert">
                {scheduleError}
                </p>
            )}

            {scheduledMatches.length > 0 && (
                <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                    Schedule Preview ({scheduledMatches.length} matches)
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b text-left">
                        <th className="p-2">Date</th>
                        <th className="p-2">Time</th>
                        <th className="p-2">Court</th>
                        <th className="p-2">Phase</th>
                        <th className="p-2">Round</th>
                        <th className="p-2">Duration</th>
                        </tr>
                    </thead>

                    <tbody>
                        {scheduledMatches.map((match) => (
                        <tr
                            key={match.bracketMatchId}
                            className="border-b"
                        >
                            <td className="p-2">{match.date}</td>
                            <td className="p-2">
                            {match.startTime}–{match.endTime}
                            </td>
                            <td className="p-2">{match.court}</td>
                            <td className="p-2">
                            {match.phase === "third_place"
                                ? "Third place"
                                : match.phase === "repechage"
                                ? "Repechage"
                                : "Elimination"}
                            </td>
                            <td className="p-2">{match.round}</td>
                            <td className="p-2">
                            {match.durationMinutes} min
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </div>
            )}
        </div>

    </div>
  );
}
