
"use client";

import { useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { saveMatchSets } from "@/app/events/[eventId]/manage/actions";
import { saveBracketSets } from "@/app/events/[eventId]/manage/bracket-actions";
import { validateMatchSets } from "@/lib/match-score-validation";

export interface ScheduleMatch {
  id: string;
  match_number: number;
  court: string | null;
  match_date: string | null;
  match_time: string | null;
  home_score: number | null;
  away_score: number | null;
  group_name: string | null;
  round: string | null;
  stage?: string | null;
  home_club: { club_name: string } | null;
  away_club: { club_name: string } | null;
  sets: {
    set_number: number;
    home_points: number;
    away_points: number;
  }[];
}

export type ScheduleStage = "group-league" | "elimination";

interface Props {
  eventId: string;
  matches: ScheduleMatch[];
  stage: ScheduleStage;
  canEditScores?: boolean;
}

const ELIMINATION_ROUNDS = [
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Quarterfinals",
  "Semifinal",
  "Semifinals",
  "Final",
  "Third Place",
  "Repechage",
];

const ROUND_ORDER: Record<string, number> = {
  "Round of 64": 1,
  "Round of 32": 2,
  "Round of 16": 3,
  Quarterfinal: 4,
  Quarterfinals: 4,
  Semifinal: 5,
  Semifinals: 5,
  "Third Place": 6,
  Final: 7,
  Repechage: 8,
};

function isEliminationMatch(match: ScheduleMatch) {
  if (match.stage === "elimination" || match.stage === "repechage") {
    return true;
  }

  if (match.stage === "group" || match.stage === "league") {
    return false;
  }

  return ELIMINATION_ROUNDS.includes(match.round ?? "");
}

function isRepechageMatch(match: ScheduleMatch) {
  return match.stage === "repechage" || match.round === "Repechage";
}

function getSectionName(
  match: ScheduleMatch,
  selectedStage: ScheduleStage,
) {
  if (selectedStage === "elimination") {
    if (isRepechageMatch(match)) return "Repechage";
    return match.round ?? "Elimination";
  }

  if (match.group_name) {
    return `Group ${match.group_name}`;
  }

  if (match.stage === "league" || match.round === "League Stage") {
    return "League Stage";
  }

  return match.round ?? "Group Stage";
}

function formatMatchDate(date: string | null) {
  if (!date) return "—";

  // Use midday to avoid date shifts caused by timezone conversion.
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-MY",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatMatchTime(time: string | null) {
  if (!time) return "—";

  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MatchScheduleDisplay({
  eventId,
  matches,
  stage,
  canEditScores = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [sets, setSets] = useState<{ home: string; away: string }[]>([
    { home: "", away: "" },
    { home: "", away: "" },
    { home: "", away: "" },
  ]);

  // The parent selects the stage. This component only displays it.
  // Repechage is included in the elimination view.
  const visibleMatches = matches
    .filter((match) =>
      stage === "elimination"
        ? isEliminationMatch(match)
        : !isEliminationMatch(match),
    )
    .sort((a, b) => {
      const roundA = ROUND_ORDER[a.round ?? ""] ?? 0;
      const roundB = ROUND_ORDER[b.round ?? ""] ?? 0;

      if (stage === "elimination" && roundA !== roundB) {
        return roundA - roundB;
      }

      return a.match_number - b.match_number;
    });

  const matchesBySection = visibleMatches.reduce<
    Record<string, ScheduleMatch[]>
  >((sections, match) => {
    const section = getSectionName(match, stage);

    if (!sections[section]) sections[section] = [];
    sections[section].push(match);

    return sections;
  }, {});

  function openScoreEditor(match: ScheduleMatch) {
    setEditingMatch(match.id);

    if (match.sets?.length) {
      setSets(
        [...match.sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({
            home: String(set.home_points),
            away: String(set.away_points),
          })),
      );
    } else {
      setSets([
        { home: "", away: "" },
        { home: "", away: "" },
        { home: "", away: "" },
      ]);
    }
  }

  function handleSaveSets(matchId: string) {
    const filledSets = sets.map((set, index) => ({
      set_number: index + 1,
      home_points: set.home === "" ? NaN : Number(set.home),
      away_points: set.away === "" ? NaN : Number(set.away),
    }));

    // Ignore empty rows at the end, but retain gaps for validation.
    while (
      filledSets.length > 0 &&
      Number.isNaN(filledSets[filledSets.length - 1].home_points) &&
      Number.isNaN(filledSets[filledSets.length - 1].away_points)
    ) {
      filledSets.pop();
    }

    if (filledSets.length === 0) {
      window.alert("Please enter at least one completed set.");
      return;
    }

    const validationError = validateMatchSets(filledSets);

    if (validationError) {
      window.alert(validationError);
      return;
    }

    startTransition(async () => {
      try {
        if (stage === "elimination") {
            await saveBracketSets(eventId, matchId, filledSets);
        } else {
            await saveMatchSets(eventId, matchId, filledSets);
        }
        setEditingMatch(null);
        router.refresh();
      } catch (error) {
        window.alert(
          error instanceof Error
            ? error.message
            : "Unable to save match scores.",
        );
      }
    });
  }

  const heading =
    stage === "elimination" ? "Elimination Schedule" : "Group / League Schedule";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <span className="text-sm text-gray-400">
            {visibleMatches.length}{" "}
            {visibleMatches.length === 1 ? "match" : "matches"}
          </span>
        </div>

        {visibleMatches.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 py-12 px-4 text-center">
            <p className="text-gray-300 font-medium">
              No saved matches for this stage yet.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Matches will appear here after the schedule has been saved.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(matchesBySection).map(([section, sectionMatches]) => (
              <section
                key={section}
                className="overflow-hidden rounded-xl border border-gray-800"
              >
                <div className="flex items-center justify-between gap-3 bg-gray-900 px-4 py-3">
                  <h3 className="font-semibold">{section}</h3>
                  <span className="text-xs text-gray-400">
                    {sectionMatches.length}{" "}
                    {sectionMatches.length === 1 ? "match" : "matches"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] table-fixed text-sm">
                    <colgroup>
                        <col className="w-[6%]" />
                        <col className="w-[12%]" />
                        <col className="w-[10%]" />
                        <col className="w-[8%]" />
                        <col className="w-[16%]" />
                        <col className="w-[20%]" />
                        <col className="w-[16%]" />
                        {canEditScores && <col className="w-[12%]" />}
                    </colgroup>
                    <thead className="bg-gray-950 text-gray-400">
                      <tr>
                        <th className="px-3 py-3 text-center">Match</th>
                        <th className="px-3 py-3 text-center">Date</th>
                        <th className="px-3 py-3 text-center">Time</th>
                        <th className="px-3 py-3 text-center">Court</th>
                        <th className="px-3 py-3 text-center">Home</th>
                        <th className="px-3 py-3 text-center">Score</th>
                        <th className="px-3 py-3 text-center">Away</th>
                        {canEditScores && (
                          <th className="px-3 py-3 text-center">Action</th>
                        )}
                      </tr>
                    </thead>

 
                    <tbody className="divide-y divide-gray-800">
                    {sectionMatches.map((match) => (
                        <Fragment key={match.id}>
                        <tr className="bg-gray-900/50">
                            <td className="px-3 py-3 text-gray-400">
                            {match.match_number}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                            {formatMatchDate(match.match_date)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                            {formatMatchTime(match.match_time)}
                            </td>
                            <td className="px-3 py-3">
                            {match.court ?? "—"}
                            </td>
                            <td className="px-3 py-3 text-center font-medium whitespace-normal break-words">
                            {match.home_club?.club_name ?? "TBD"}
                            </td>
                            <td className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                                {/* Overall match score */}
                                <span className="font-semibold text-xl whitespace-nowrap">
                                {match.home_score ?? 0} - {match.away_score ?? 0}
                                </span>

                                {/* Individual set scores */}
                                {match.sets && match.sets.length > 0 && (
                                <div className="flex flex-col items-center gap-0.5 text-xs font-normal text-gray-400">
                                    <div className="flex flex-wrap justify-center gap-x-2">
                                    {match.sets.slice(0, 3).map((set, index) => (
                                        <span key={set.set_number ?? index}>
                                        {index > 0 && (
                                            <span className="mr-2 text-gray-500">|</span>
                                        )}
                                        {set.home_points}-{set.away_points}
                                        </span>
                                    ))}
                                    </div>

                                    {match.sets.length > 3 && (
                                    <div className="flex flex-wrap justify-center gap-x-2">
                                        {match.sets.slice(3, 5).map((set, index) => (
                                        <span key={set.set_number ?? index}>
                                            {index > 0 && (
                                            <span className="mr-2 text-gray-500">|</span>
                                            )}
                                            {set.home_points}-{set.away_points}
                                        </span>
                                        ))}
                                    </div>
                                    )}
                                </div>
                                )}
                            </div>
                            </td>
                            <td className="px-3 py-3 text-center font-medium whitespace-normal break-words">
                            {match.away_club?.club_name ?? "TBD"}
                            </td>
                            {canEditScores && (
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => openScoreEditor(match)}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition duration-300 ${
                                    editingMatch === match.id
                                    ? "bg-rose-300 text-gray-600 cursor-default"
                                    : "bg-red-800 text-gray-200 hover:bg-red-500"
                                }`}

                              >
                                {editingMatch === match.id ? "Editing Score" : "Edit Score"}
                              </button>
                            </td>
                            )}
                        </tr>

                        {canEditScores && editingMatch === match.id && (
                            <tr className="bg-gray-950">
                            <td colSpan={7} className="border-t border-gray-800 p-4">
                                <h4 className="font-medium mb-3">Edit Set Scores</h4>

                                <div className="space-y-3">
                                {sets.map((set, index) => (
                                    <div
                                    key={index}
                                    className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"
                                    >
                                    <label className="text-sm text-gray-400">
                                        Set {index + 1}
                                    </label>

                                    <input
                                        aria-label={`Set ${index + 1} home points`}
                                        type="number"
                                        min={0}
                                        value={set.home}
                                        onChange={(event) =>
                                        setSets((current) =>
                                            current.map((item, itemIndex) =>
                                            itemIndex === index
                                                ? { ...item, home: event.target.value }
                                                : item,
                                            ),
                                        )
                                        }
                                        placeholder="Home"
                                        className="w-full min-w-0 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                    />

                                    <span className="text-gray-500">–</span>

                                    <input
                                        aria-label={`Set ${index + 1} away points`}
                                        type="number"
                                        min={0}
                                        value={set.away}
                                        onChange={(event) =>
                                        setSets((current) =>
                                            current.map((item, itemIndex) =>
                                            itemIndex === index
                                                ? { ...item, away: event.target.value }
                                                : item,
                                            ),
                                        )
                                        }
                                        placeholder="Away"
                                        className="w-full min-w-0 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                    />
                                    </div>
                                ))}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                {sets.length < 5 && (
                                    <button
                                    type="button"
                                    onClick={() =>
                                        setSets((current) => [
                                        ...current,
                                        { home: "", away: "" },
                                        ])
                                    }
                                    className="rounded-lg border border-gray-700 px-3 py-2 text-sm hover:bg-gray-800"
                                    >
                                    + Add Set
                                    </button>
                                )}

                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleSaveSets(match.id)}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                                >
                                    {isPending ? "Saving..." : "Save Score"}
                                </button>

                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setEditingMatch(null)}
                                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                </div>
                            </td>
                            </tr>
                        )}
                        </Fragment>
                    ))}
                    </tbody>
                  </table>
                </div>

              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
