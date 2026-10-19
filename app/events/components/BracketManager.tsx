"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BracketBoard } from "./BracketBoard";
import type { BracketClub, BracketData, BracketSet, BracketSlot } from "@/lib/bracket-types";
import { validateMatchSets } from "@/lib/match-score-validation";
import {
  generateBracketWithAssignments,
  assignBracketClub,
  saveBracketSets,
} from "@/app/events/[eventId]/manage/bracket-actions";
import QualificationPlanner from "./QualificationPlanner";
import type {
  StandingClub,
  StandingMatch,
} from "@/lib/group-standings";

type Draft = { home: string; away: string };
type PlannedBracketAssignment = {
  phase: "main" | "repechage";
  position: number;
  slot: BracketSlot;
  club_id: string;
};
const sizes = [4, 8, 16, 32, 64] as const;

export default function BracketManager({
  eventId,
  bracket,
  clubs,
  qualificationClubs,
  qualificationMatches,
}: {
  eventId: string;
  bracket: BracketData | null;
  clubs: BracketClub[];
  qualificationClubs: StandingClub[];
  qualificationMatches: StandingMatch[];
}) {
  const router = useRouter();
  const [size, setSize] = useState(bracket?.bracketSize ?? 16);
  const [third, setThird] = useState(bracket?.thirdPlaceEnabled ?? false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft[]>([{ home: "", away: "" }, { home: "", away: "" }, { home: "", away: "" }]);
  const [pending, setPending] = useState(false);
  const selected = bracket?.matches.find((m) => m.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    setDraft(
      selected.sets.length
        ? selected.sets.map((s) => ({ home: String(s.home_points), away: String(s.away_points) }))
        : [{ home: "", away: "" }, { home: "", away: "" }, { home: "", away: "" }],
    );
  }, [selectedId, selected?.matchId, selected?.sets]);

  async function mutate(action: (confirmReset: boolean) => Promise<void>) {
    setPending(true);
    try {
      try {
        await action(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        if (!message.includes("BRACKET_RESET_REQUIRED")) throw error;
        if (!window.confirm("This will reset affected scores or replace the existing bracket. Continue?")) return;
        await action(true);
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to update bracket");
    } finally {
      setPending(false);
    }
  }

async function generateFromPlanner(
  repechageCount: number,
  assignments: PlannedBracketAssignment[],
) {
  await mutate((confirmReset) =>
    generateBracketWithAssignments(
      eventId,
      size,
      third,
      repechageCount,
      assignments,
      confirmReset,
    ),
  );
}

  const incoming = (slot: BracketSlot) => bracket?.matches.some((m) =>
    (m.winnerToId === selectedId && m.winnerToSlot === slot)
    || (m.loserToId === selectedId && m.loserToSlot === slot),
  ) ?? false;

  function changeSlot(slot: BracketSlot, clubId: string) {
    if (!selected) return;
    void mutate((confirm) => assignBracketClub(eventId, selected.id, slot, clubId || null, confirm));
  }

  function changeCount(count: number) {
    setDraft((old) => Array.from({ length: count }, (_, i) => old[i] ?? { home: "", away: "" }));
  }

  function updatePoint(index: number, slot: "home" | "away", value: string) {
    setDraft((old) => old.map((row, i) => i === index ? { ...row, [slot]: value } : row));
  }

  function saveScores() {
    if (!selected) return;
    const sets: BracketSet[] = draft.map((s, i) => ({
      set_number: i + 1,
      home_points: s.home.trim() === "" ? NaN : Number(s.home),
      away_points: s.away.trim() === "" ? NaN : Number(s.away),
    }));
    // Discard only entirely blank trailing rows, not partially entered sets.
    while (sets.length && Number.isNaN(sets[sets.length-1].home_points)
      && Number.isNaN(sets[sets.length-1].away_points)) sets.pop();
    if (!sets.length) { window.alert("Enter at least one set, or use Clear Scores."); return; }
    const error = validateMatchSets(sets);
    if (error) { window.alert(error); return; }
    void mutate((confirm) => saveBracketSets(eventId, selected.matchId, sets, confirm));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Elimination bracket setup</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1 text-sm text-gray-300">
            <span className="block">Bracket size</span>
            <select value={size} onChange={(e) => { const selectedSize = sizes.find(
                (n) => n === Number(e.target.value)
                );

                if (selectedSize !== undefined) {
                setSize(selectedSize);
                }
            }} className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white">
              {sizes.map((n) => <option key={n} value={n}>{n} teams</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-gray-300">
            <input type="checkbox" checked={third} onChange={(e) => setThird(e.target.checked)} /> Third-place match
          </label>
        </div>

      </section>

      <QualificationPlanner
        eventId={eventId}
        bracketSize={size}
        clubs={qualificationClubs}
        matches={qualificationMatches}
      />
      
      {bracket ? (
        <>
          <BracketBoard 
            bracket={bracket} 
            selectedId={selectedId} 
            onSelect={setSelectedId} 
          />
          <p className="text-sm text-gray-400">Select a match card to assign clubs or enter set scores. Green indicates a completed winning team. Dashed lines show progression to the third-place match.</p>
          {selected && (
            <section className="rounded-xl border border-gray-700 bg-gray-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-semibold">{selected.phase === "repechage" ? "Repechage" : selected.phase === "third_place" ? "Third-place match" : selected.round} · Match {selected.position + 1}</h3>
                <button className="text-sm text-gray-400 hover:text-white" onClick={() => setSelectedId(null)} type="button">Close ✕</button>
              </div>
              
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                {(["home", "away"] as const).map((slot) => {
                  const automatic = incoming(slot);
                  const value =
                    slot === "home"
                      ? selected.homeClubId
                      : selected.awayClubId;

                  const clubName = clubs.find(
                    (club) => club.club_id === value
                  )?.club_name;

                  return (
                    <div key={slot} className="text-sm text-gray-300">
                      <span className="mb-1 block capitalize">
                        {slot} club {automatic ? "(automatic)" : ""}
                      </span>

                      <div className="flex min-h-10 items-center rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white">
                        {clubName ?? "TBD / Unassigned"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <h4 className="mb-2 text-sm font-semibold">Set-by-set scoring</h4>
              <div className="space-y-2">
                {draft.map((set, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-12 text-xs text-gray-400">Set {index + 1}</span>
                    <input aria-label={`Home points in set ${index + 1}`} type="number" min={0} value={set.home} onChange={(e) => updatePoint(index, "home", e.target.value)} className="w-24 rounded border border-gray-700 bg-gray-800 px-3 py-2" placeholder="Home" />
                    <span className="text-gray-500">:</span>
                    <input aria-label={`Away points in set ${index + 1}`} type="number" min={0} value={set.away} onChange={(e) => updatePoint(index, "away", e.target.value)} className="w-24 rounded border border-gray-700 bg-gray-800 px-3 py-2" placeholder="Away" />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-300">Number of sets
                  <select className="ml-2 rounded border border-gray-700 bg-gray-800 p-2" value={draft.length} onChange={(e) => changeCount(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button disabled={pending || !selected.homeClubId || !selected.awayClubId} type="button" className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" onClick={saveScores}>Save scores</button>
                <button disabled={pending} type="button" className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 disabled:opacity-40" onClick={() => void mutate((confirm) => saveBracketSets(eventId, selected.matchId, [], confirm))}>Clear scores</button>
              </div>
              <p className="mt-3 text-xs text-gray-400">Sets 1–4 play to 25 and Set 5 to 15, with a two-point margin. The winner advances on three set wins.</p>
            </section>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center text-sm text-gray-400">No elimination bracket yet. Choose a size and create one above.</p>
      )}
    </div>
  );
}
