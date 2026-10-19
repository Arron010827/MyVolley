"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateGroupStandings,
  type RankedClub,
  type StandingClub,
  type StandingMatch,
} from "@/lib/group-standings";
import {saveQualificationAssignments} from "@/app/events/[eventId]/manage/bracket-actions";

type QualificationMethod = "group" | "overall";
type RepechageMethod = "manual" | "performance";

// Shared performance comparison:
// 1. Match wins
// 2. Set difference
// 3. Points ratio
function comparePerformance(a: RankedClub, b: RankedClub) {
  return (
    b.mw - a.mw ||
    b.setDifference - a.setDifference ||
    b.pointsRatio - a.pointsRatio ||
    a.clubName.localeCompare(b.clubName) ||
    a.clubId.localeCompare(b.clubId)
  );
}

function samePerformance(a: RankedClub, b: RankedClub) {
  return (
    a.mw === b.mw &&
    a.setDifference === b.setDifference &&
    Math.abs(a.pointsRatio - b.pointsRatio) < 1e-9
  );
}

type AssignmentMode = "manual" | "automatic";

type AssignmentSlot = {
  key: string;
  matchId: string;
  phase: "main" | "repechage";
  slot: "home" | "away";
  position: number;
  round: string;
};

// Find slots that can be assigned directly.
// Slots fed by another match must remain untouched.
function getAssignmentSlots(
  bracketSize: number,
  repechageCount: number,
  phase: "main" | "repechage",
): AssignmentSlot[] {
  if (phase === "repechage") {
    return Array.from(
      { length: repechageCount },
      (_, position) => position,
    ).flatMap((position) =>
      (["home", "away"] as const).map((slot) => ({
        key: `repechage:${position}:${slot}`,
        matchId: `repechage:${position}`,
        phase: "repechage" as const,
        slot,
        position,
        round: "Repechage",
      })),
    );
  }

  const firstRoundMatchCount = bracketSize / 2;
  const reservedSlots = new Set<string>();

   // Each repechage winner feeds a predetermined first-round slot.
  for (let position = 0; position < repechageCount; position++) {
    const matchPosition = Math.floor(position / 2);
    const slot = position % 2 === 0 ? "home" : "away";

    reservedSlots.add(`${matchPosition}:${slot}`);
  }

    return Array.from(
    { length: firstRoundMatchCount },
    (_, position) => position,
  ).flatMap((position) =>
    (["home", "away"] as const)
      .filter(
        (slot) => !reservedSlots.has(`${position}:${slot}`),
      )
      .map((slot) => ({
        key: `main:${position}:${slot}`,
        matchId: `main:${position}`,
        phase: "main" as const,
        slot,
        position,
        round: `Round of ${bracketSize}`,
      })),
  );
}

// Generate seeded pairings while preserving the order
// of the supplied club list.
//
// A slot opposite an incoming repechage winner gets
// a high-ranked direct qualifier. Remaining full
// matches pair higher-ranked clubs against lower-ranked
// clubs.
function buildAutomaticAssignments(
  clubs: RankedClub[],
  slots: AssignmentSlot[],
): Record<string, string> {
  if (clubs.length !== slots.length) {
    return {};
  }

  const grouped = new Map<string, AssignmentSlot[]>();

  for (const slot of slots) {
    const current = grouped.get(slot.matchId) ?? [];
    current.push(slot);
    grouped.set(slot.matchId, current);
  }

  const matchGroups = [...grouped.values()].sort(
    (a, b) => a[0].position - b[0].position,
  );

  // A match can have zero, one or two directly
  // assignable slots. Zero-slot matches are omitted.
  if (matchGroups.some((group) => group.length > 2)) {
    return {};
  }

  const result: Record<string, string> = {};
  const remaining = [...clubs];

  // First assign the highest-ranked direct qualifiers
  // to matches with one available slot. The other slot
  // in those matches is reserved for a repechage winner.
  for (const group of matchGroups.filter(
    (items) => items.length === 1,
  )) {
    const club = remaining.shift();

    if (!club) return {};

    result[group[0].key] = club.clubId;
  }

  // Pair the highest remaining club with the lowest
  // remaining club in each fully assignable match.
  for (const group of matchGroups.filter(
    (items) => items.length === 2,
  )) {
    const home = group.find((item) => item.slot === "home");
    const away = group.find((item) => item.slot === "away");

    if (!home || !away || remaining.length < 2) {
      return {};
    }

    const highest = remaining.shift();
    const lowest = remaining.pop();

    if (!highest || !lowest) return {};

    result[home.key] = highest.clubId;
    result[away.key] = lowest.clubId;
  }

  if (
    remaining.length !== 0 ||
    Object.keys(result).length !== slots.length
  ) {
    return {};
  }

  return result;
}

function assignmentSetComplete(
  slots: AssignmentSlot[],
  clubs: RankedClub[],
  assignments: Record<string, string>,
) {
  if (slots.length !== clubs.length) return false;

  const selectedIds = slots
    .map((slot) => assignments[slot.key])
    .filter(Boolean);

  return (
    selectedIds.length === slots.length &&
    new Set(selectedIds).size === slots.length
  );
}

function ClubTable({
  clubs,
  emptyText,
}: {
  clubs: RankedClub[];
  emptyText: string;
}) {
  if (clubs.length === 0) {
    return (
      <p className="rounded-lg bg-gray-950 p-4 text-sm text-gray-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-950 text-xs text-gray-400">
          <tr>
            <th className="px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">Club</th>
            <th className="px-3 py-3 text-left">Group</th>
            <th className="px-3 py-3 text-right">MW</th>
            <th className="px-3 py-3 text-right">SD</th>
            <th className="px-3 py-3 text-right">PR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {clubs.map((club, index) => (
            <tr key={club.clubId}>
              <td className="px-3 py-3 text-gray-400">
                {index + 1}
              </td>
              <td className="px-3 py-3 font-medium text-white">
                {club.clubName}
              </td>
              <td className="px-3 py-3 text-gray-400">
                {club.groupName ?? "League"}
                <span className="ml-1 text-xs text-gray-500">
                  #{club.position}
                </span>
              </td>
              <td className="px-3 py-3 text-right">{club.mw}</td>
              <td className="px-3 py-3 text-right">
                {club.setDifference}
              </td>
              <td className="px-3 py-3 text-right">
                {club.pointsRatio.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentPanel({
  title,
  description,
  clubs,
  slots,
  mode,
  onModeChange,
  manualValues,
  automaticValues,
  onManualChange,
  disabled = false,
}: {
  title: string;
  description: string;
  clubs: RankedClub[];
  slots: AssignmentSlot[];
  mode: AssignmentMode;
  onModeChange: (mode: AssignmentMode) => void;
  manualValues: Record<string, string>;
  automaticValues: Record<string, string>;
  onManualChange: (key: string, clubId: string) => void;
  disabled?: boolean;
}) {
  const values =
    mode === "automatic"
      ? automaticValues
      : manualValues;

  const usedClubIds = new Set(
    Object.values(values).filter(Boolean),
  );

  const complete = assignmentSetComplete(
    slots,
    clubs,
    values,
  );

  return (
    <section className="space-y-4 rounded-xl border border-gray-700 p-4">
      <div>
        <h4 className="font-semibold text-white">
          {title}
        </h4>
        <p className="mt-1 text-sm text-gray-400">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={mode === "manual"}
          onClick={() => onModeChange("manual")}
          className={`rounded-lg border px-4 py-2 text-sm ${
            mode === "manual"
              ? "border-red-500 bg-red-950 text-white"
              : "border-gray-700 text-gray-300"
          } disabled:opacity-50`}
        >
          Manual
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-pressed={mode === "automatic"}
          onClick={() => onModeChange("automatic")}
          className={`rounded-lg border px-4 py-2 text-sm ${
            mode === "automatic"
              ? "border-red-500 bg-red-950 text-white"
              : "border-gray-700 text-gray-300"
          } disabled:opacity-50`}
        >
          Automatic
        </button>
      </div>

      {mode === "automatic" && (
        <p className="rounded-lg bg-gray-950 p-3 text-xs text-gray-400">
          Pairings are generated from the selected clubs'
          ranking order. Higher-ranked clubs are paired
          against lower-ranked clubs where possible.
          These assignments are previews only.
        </p>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-gray-500">
          No club positions need to be assigned in this section.
        </p>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const selectedClubId =
              values[slot.key] ?? "";

            return (
              <div
                key={slot.key}
                className="grid gap-2 rounded-lg bg-gray-950 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {slot.round} · Match {slot.position + 1}
                  </p>
                  <p className="text-xs capitalize text-gray-400">
                    {slot.slot} club
                  </p>
                </div>

                <select
                  value={selectedClubId}
                  disabled={
                    disabled || mode === "automatic"
                  }
                  onChange={(event) =>
                    onManualChange(
                      slot.key,
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-70"
                >
                  <option value="">
                    Select a qualified club
                  </option>

                  {clubs.map((club) => (
                    <option
                      key={club.clubId}
                      value={club.clubId}
                      disabled={
                        usedClubIds.has(club.clubId) &&
                        selectedClubId !== club.clubId
                      }
                    >
                      {club.clubName}
                      {" · "}
                      {club.groupName ?? "League"}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      <p
        className={`text-sm ${
          complete
            ? "text-green-400"
            : "text-amber-400"
        }`}
      >
        {complete
          ? "All positions have unique club assignments."
          : "Assignments are incomplete or contain duplicate clubs."}
      </p>
    </section>
  );
}

export default function QualificationPlanner({
  eventId,
  bracketSize,
  clubs,
  matches,
}: {
  eventId: string;
  bracketSize: 4 | 8 | 16 | 32 | 64;
  clubs: StandingClub[];
  matches: StandingMatch[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Start with every main-bracket position filled directly.
  // The organiser can reduce this count to introduce repechage.
  const [directCount, setDirectCount] = useState<number>(bracketSize);

  // Changing bracket size resets the planner to no repechage.
  useEffect(() => {
    setDirectCount(bracketSize);
    setManualRepechageIds([]);
  }, [bracketSize]);

  // Each repechage match contributes one winner to the main bracket.
  const repechageCount = bracketSize - directCount;
  const repechageEntrantCount = repechageCount * 2;
  const totalEntrants = directCount + repechageEntrantCount;

  const directSlots = useMemo(
    () => getAssignmentSlots(bracketSize, repechageCount, "main"),
    [bracketSize, repechageCount],
  );

  const repechageSlots = useMemo(
    () => getAssignmentSlots(bracketSize, repechageCount, "repechage"),
    [bracketSize, repechageCount],
  );

  const [qualificationMethod, setQualificationMethod] =
    useState<QualificationMethod>("group");

  const [repechageMethod, setRepechageMethod] =
    useState<RepechageMethod>("performance");

  const [manualRepechageIds, setManualRepechageIds] =
    useState<string[]>([]);
  
  const [directAssignmentMode, setDirectAssignmentMode] =
    useState<AssignmentMode>("automatic");

  const [repechageAssignmentMode, setRepechageAssignmentMode] =
    useState<AssignmentMode>("automatic");

  const [directAssignmentValues, setDirectAssignmentValues] =
    useState<Record<string, string>>({});

  const [repechageAssignmentValues, setRepechageAssignmentValues] =
    useState<Record<string, string>>({});

  const groups = useMemo(
    () => calculateGroupStandings(clubs, matches),
    [clubs, matches],
  );

  const allClubs = groups.flatMap((group) => group.clubs);

  const allGroupsReady =
    groups.length > 0 &&
    groups.every((group) => group.isReady);

  // Overall ranking: compare all clubs regardless
  // of their group placement.
  const overallRanking = [...allClubs].sort(
    comparePerformance,
  );

  // Group ranking: take first-place finishers first,
  // followed by second-place finishers, etc.
  // Within each rank tier, compare performance.
  const groupRanking = [...allClubs].sort(
    (a, b) =>
      a.position - b.position ||
      comparePerformance(a, b),
  );

  const qualificationRanking =
    qualificationMethod === "group"
      ? groupRanking
      : overallRanking;

  // Phase 1: Direct qualifiers.
  const directQualifiers = qualificationRanking.slice(
    0,
    directCount,
  );

  const directIds = new Set(
    directQualifiers.map((club) => club.clubId),
  );

  // Detect ties across the direct-qualification cutoff.
  const lastDirect = qualificationRanking[directCount - 1];
  const firstExcluded = qualificationRanking[directCount];

  const boundaryTie =
    Boolean(lastDirect && firstExcluded) &&
    samePerformance(lastDirect, firstExcluded) &&
    (
      qualificationMethod === "overall" ||
      lastDirect.position === firstExcluded.position
    );

  // A tie within a group may also affect which club
  // represents that group.
  const withinGroupTie = groups.some((group) =>
    group.clubs.some(
      (selected) =>
        directIds.has(selected.clubId) &&
        group.clubs.some(
          (excluded) =>
            !directIds.has(excluded.clubId) &&
            samePerformance(selected, excluded),
        ),
    ),
  );

  const directTie = boundaryTie || withinGroupTie;

  // Phase 2: Repechage candidates.
  // Direct qualifiers must never appear in this pool.
  const remainingClubs = overallRanking.filter(
    (club) => !directIds.has(club.clubId),
  );

  const remainingIds = new Set(
    remainingClubs.map((club) => club.clubId),
  );

  // Remove any stale manual selections if the
  // qualification method or count has changed.
  const validManualIds = manualRepechageIds.filter(
    (id) => remainingIds.has(id),
  );

  const manualIdSet = new Set(validManualIds);

  const repechageQualifiers =
    repechageMethod === "performance"
      ? remainingClubs.slice(0, repechageEntrantCount)
      : remainingClubs.filter(
          (club) => manualIdSet.has(club.clubId),
        );

  const automaticDirectAssignments = buildAutomaticAssignments(
    directQualifiers,
    directSlots,
  );

  const automaticRepechageAssignments = buildAutomaticAssignments(
    repechageQualifiers,
    repechageSlots,
  );

  const activeDirectAssignments =
    directAssignmentMode === "automatic"
      ? automaticDirectAssignments
      : directAssignmentValues;

  const activeRepechageAssignments =
    repechageAssignmentMode === "automatic"
      ? automaticRepechageAssignments
      : repechageAssignmentValues;

  const directAssignmentsComplete = assignmentSetComplete(
    directSlots,
    directQualifiers,
    activeDirectAssignments,
  );

  const repechageAssignmentsComplete = assignmentSetComplete(
    repechageSlots,
    repechageQualifiers,
    activeRepechageAssignments,
  );

  // A performance-based repechage cutoff should
  // not silently resolve an exact sporting tie.
  const lastRepechage =
    remainingClubs[repechageEntrantCount - 1];

  const firstRepechageExcluded =
    remainingClubs[repechageEntrantCount];

  const repechageTie =
    repechageMethod === "performance" &&
    repechageEntrantCount > 0 &&
    Boolean(lastRepechage && firstRepechageExcluded) &&
    samePerformance(
      lastRepechage,
      firstRepechageExcluded,
    );

  const enoughClubs = totalEntrants <= allClubs.length;

  const repechageSelectionComplete =
    repechageQualifiers.length === repechageEntrantCount;

  const unequalMatchCounts =
    new Set(allClubs.map((club) => club.mp)).size > 1;

  const selectionReady =
    allGroupsReady &&
    enoughClubs &&
    !directTie &&
    !repechageTie &&
    repechageSelectionComplete;

    
  const assignmentReady =
    selectionReady &&
    directAssignmentsComplete &&
    repechageAssignmentsComplete;

  const directSelectionKey = directQualifiers
    .map((club) => club.clubId)
    .join("|");

  const directSlotsKey = directSlots
    .map((slot) => slot.key)
    .join("|");

  const repechageSelectionKey = repechageQualifiers
    .map((club) => club.clubId)
    .join("|");

  const repechageSlotsKey = repechageSlots
    .map((slot) => slot.key)
    .join("|");

  useEffect(() => {
    setDirectAssignmentValues({});
  }, [directSelectionKey, directSlotsKey]);

  useEffect(() => {
    setRepechageAssignmentValues({});
  }, [repechageSelectionKey, repechageSlotsKey]);
  
  function toggleManualRepechage(
    clubId: string,
    checked: boolean,
  ) {
    setManualRepechageIds((previous) => {
      const valid = previous.filter(
        (id) => remainingIds.has(id),
      );

      if (!checked) {
        return valid.filter((id) => id !== clubId);
      }

      if (valid.includes(clubId)) return valid;

      if (valid.length >= repechageEntrantCount) {
        return valid;
      }

      return [...valid, clubId];
    });
  }

  async function saveAssignments() {
    if (!assignmentReady || saving) return;

    const assignments = [
      ...directSlots.map((slot) => ({
        bracket_match_id: slot.matchId,
        club_id: activeDirectAssignments[slot.key],
        slot: slot.slot,
      })),
      ...repechageSlots.map((slot) => ({
        bracket_match_id: slot.matchId,
        club_id: activeRepechageAssignments[slot.key],
        slot: slot.slot,
      })),
    ];

    setSaving(true);

    try {
      try {
        await saveQualificationAssignments(
          eventId,
          assignments,
          false,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to save qualification assignments.";

        if (!message.includes("BRACKET_RESET_REQUIRED")) {
          throw error;
        }

        const confirmed = window.confirm(
          "Changing these assignments will reset affected match scores or results. Continue?",
        );

        if (!confirmed) return;

        await saveQualificationAssignments(
          eventId,
          assignments,
          true,
        );
      }

      window.alert("Qualification assignments saved.");
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save qualification assignments.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Qualification Planner
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Select the clubs advancing directly and through
          repechage before assigning any matches.
        </p>
      </div>

      {/* Phase 1 */}
      <div className="space-y-4 rounded-xl border border-gray-700 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            Phase 1
          </p>
          <h3 className="mt-1 font-semibold text-white">
            Direct Qualification
          </h3>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="space-y-2 text-sm">
            <span className="block text-gray-300">
              Number of direct qualifiers
            </span>
            <select
              value={directCount}
              onChange={(e) =>
                setDirectCount(Number(e.target.value))
              }
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
            >
              {Array.from(
                { length: bracketSize + 1 },
                (_, index) => index,
              ).map((count) => (
                <option key={count} value={count}>
                  {count} clubs
                </option>
              ))}
            </select>
          </label>

          <div className="self-end text-sm text-gray-400">
            Main bracket size: {bracketSize}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            Qualification method
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700 p-3">
            <input
              type="radio"
              name="qualificationMethod"
              checked={qualificationMethod === "group"}
              onChange={() =>
                setQualificationMethod("group")
              }
            />
            <div>
              <p className="text-sm font-medium">
                Top clubs from each group
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Prioritise first-place teams, then
                second-place teams, and so on.
                Compare performance within each tier.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700 p-3">
            <input
              type="radio"
              name="qualificationMethod"
              checked={qualificationMethod === "overall"}
              onChange={() =>
                setQualificationMethod("overall")
              }
            />
            <div>
              <p className="text-sm font-medium">
                Overall performance
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Rank all clubs by match wins, then
                set difference, then points ratio.
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <h4 className="text-sm font-semibold">
              Direct qualifiers
            </h4>
            <span className="text-xs text-gray-400">
              {directQualifiers.length} clubs
            </span>
          </div>

          <ClubTable
            clubs={directQualifiers}
            emptyText="No direct qualifiers selected."
          />
        </div>
      </div>

      {/* Phase 2 */}
      <div className="space-y-4 rounded-xl border border-gray-700 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            Phase 2
          </p>
          <h3 className="mt-1 font-semibold text-white">
            Repechage Selection
          </h3>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="block text-gray-300">
            Number of repechage matches
          </span>

          <select
            value={repechageCount}
            onChange={(e) =>
              setDirectCount(
                bracketSize - Number(e.target.value),
              )
            }
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
          >
            {Array.from(
              { length: bracketSize + 1 },
              (_, index) => index,
            ).map((count) => (
              <option key={count} value={count}>
                {count} matches
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg bg-gray-950 p-3 text-sm text-gray-300">
          {repechageCount} repechage matches require{" "}
          <span className="font-semibold text-white">
            {repechageEntrantCount} clubs
          </span>.
          Each winner will occupy a reserved
          main-bracket position.
        </div>

        {repechageCount > 0 && (
          <>
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Select repechage participants
              </p>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-700 p-3 text-sm">
                <input
                  type="radio"
                  name="repechageMethod"
                  checked={
                    repechageMethod === "performance"
                  }
                  onChange={() =>
                    setRepechageMethod("performance")
                  }
                />
                Best-performing remaining clubs
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-700 p-3 text-sm">
                <input
                  type="radio"
                  name="repechageMethod"
                  checked={repechageMethod === "manual"}
                  onChange={() =>
                    setRepechageMethod("manual")
                  }
                />
                Manually select from remaining clubs
              </label>
            </div>

            {repechageMethod === "manual" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Select {repechageEntrantCount} clubs.
                  Direct qualifiers are excluded.
                  Selected: {repechageQualifiers.length}/
                  {repechageEntrantCount}
                </p>

                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-700 p-3">
                  {remainingClubs.map((club) => {
                    const checked = manualIdSet.has(
                      club.clubId,
                    );

                    return (
                      <label
                        key={club.clubId}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-gray-800 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={
                              !checked &&
                              repechageQualifiers.length >=
                                repechageEntrantCount
                            }
                            onChange={(e) =>
                              toggleManualRepechage(
                                club.clubId,
                                e.target.checked,
                              )
                            }
                          />
                          <div>
                            <p className="text-sm">
                              {club.clubName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {club.groupName ?? "League"} ·
                              Position {club.position}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-gray-400">
                          {club.mw} MW
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between">
                <h4 className="text-sm font-semibold">
                  Selected repechage entrants
                </h4>
                <span className="text-xs text-gray-400">
                  {repechageQualifiers.length}/
                  {repechageEntrantCount}
                </span>
              </div>

              <ClubTable
                clubs={repechageQualifiers}
                emptyText="No repechage clubs selected."
              />
            </div>
          </>
        )}
      </div>

      {/* Qualification status */}
      <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-950 p-4">
        <h3 className="font-semibold">
          Qualification Summary
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Main slots", bracketSize],
            ["Direct", directCount],
            ["Repechage", repechageCount],
            ["Total entrants", totalEntrants],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg bg-gray-900 p-3 text-center"
            >
              <p className="text-xl font-bold text-white">
                {value}
              </p>
              <p className="text-xs text-gray-400">
                {label}
              </p>
            </div>
          ))}
        </div>

        {!allGroupsReady && (
          <p className="text-sm text-amber-400">
            Some group/league matches are incomplete
            or contain invalid results.
            Current rankings are provisional.
          </p>
        )}

        {!enoughClubs && (
          <p className="text-sm text-amber-400">
            Not enough registered clubs.
            This format requires {totalEntrants} clubs,
            but only {allClubs.length} are registered.
          </p>
        )}

        {directTie && (
          <p className="text-sm text-amber-400">
            An unresolved tie affects direct qualification.
            Additional tie-breaking rules are required.
          </p>
        )}

        {repechageTie && (
          <p className="text-sm text-amber-400">
            The performance-based repechage cutoff is
            tied. Choose participants manually or
            resolve the tie first.
          </p>
        )}

        {qualificationMethod === "overall" &&
          unequalMatchCounts && (
            <p className="text-sm text-amber-400">
              Clubs have played different numbers of
              matches. Overall rankings may favour
              clubs with more matches played.
            </p>
          )}

        {!repechageSelectionComplete && (
          <p className="text-sm text-amber-400">
            Repechage participant selection is incomplete.
          </p>
        )}

        <p
          className={`text-sm font-medium ${
            selectionReady
              ? "text-green-400"
              : "text-gray-400"
          }`}
        >
          {selectionReady
            ? "Qualification selection is ready for match assignment."
            : "Complete the requirements above before assigning matches."}
        </p>
      </div>

      {/* Phase 3 is intentionally not active yet. */}
      <div className="space-y-5 rounded-xl border border-gray-700 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            Phase 3
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            Match Assignment
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Assign the selected clubs to their actual bracket
            positions. Main-bracket and repechage assignments
            are managed separately.
          </p>
        </div>

        <AssignmentPanel
          title="Main Bracket"
          description="Assign direct qualifiers. Positions reserved for repechage winners are excluded."
          clubs={directQualifiers}
          slots={directSlots}
          mode={directAssignmentMode}
          onModeChange={setDirectAssignmentMode}
          manualValues={directAssignmentValues}
          automaticValues={automaticDirectAssignments}
          onManualChange={(key, clubId) =>
            setDirectAssignmentValues((previous) => ({
              ...previous,
              [key]: clubId,
            }))
          }
          disabled={!selectionReady}
        />

        {repechageCount > 0 ? (
          <AssignmentPanel
            title="Repechage Matches"
            description="Assign only the clubs selected for repechage."
            clubs={repechageQualifiers}
            slots={repechageSlots}
            mode={repechageAssignmentMode}
            onModeChange={setRepechageAssignmentMode}
            manualValues={repechageAssignmentValues}
            automaticValues={automaticRepechageAssignments}
            onManualChange={(key, clubId) =>
              setRepechageAssignmentValues((previous) => ({
                ...previous,
                [key]: clubId,
              }))
            }
            disabled={!selectionReady}
          />
        ) : (
          <p className="rounded-lg bg-gray-950 p-3 text-sm text-gray-400">
            Repechage is disabled. All selected clubs enter
            the main bracket directly.
          </p>
        )}

        <div className="rounded-lg bg-gray-950 p-4">
          <h4 className="font-semibold text-white">
            Assignment Status
          </h4>

          <p
            className={`mt-2 text-sm ${
              assignmentReady
                ? "text-green-400"
                : "text-amber-400"
            }`}
          >
            {assignmentReady
              ? "All selected clubs have unique assignments. Ready for database integration."
              : "Complete the qualification selection and all match assignments before proceeding."}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Saving applies the assignments to the bracket.
            Changing assignments may reset affected match results
            after confirmation.
          </p>

          <button
            type="button"
            disabled={!assignmentReady || saving}
            onClick={() => void saveAssignments()}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save assignments"}
          </button>

        </div>
      </div>

    </section>
  );
}
