"use client";

import type { BracketData, BracketMatch } from "@/lib/bracket-types";

const CARD_W = 218;
const CARD_H = 78;
const COL_GAP = 66;
const ROW_GAP = 112;
const TOP = 52;
const LEFT = 20;

export function BracketBoard({
  bracket,
  selectedId,
  onSelect,
}: {
  bracket: BracketData;
  selectedId?: string | null;
  onSelect?: (matchId: string) => void;
}) {
  const hasRepechage = bracket.repechageCount > 0;
  const offset = hasRepechage ? 1 : 0;
  const rounds = Math.log2(bracket.bracketSize);
  const finalRound = bracket.matches.find(
    (match) => match.phase === "main" && match.roundIndex === rounds,
  );

  function pos(match: BracketMatch): { x: number; y: number } {
    if (match.phase === "repechage") {
      // Preliminary match cards form an extra column to the left.
      return { x: LEFT, y: TOP + match.position * ROW_GAP };
    }
    const x = LEFT + (offset + match.roundIndex - 1) * (CARD_W + COL_GAP);
    const shift = ((2 ** (match.roundIndex - 1)) - 1) / 2;
    const y = TOP + (shift + match.position * 2 ** (match.roundIndex - 1)) * ROW_GAP;
    if (match.phase === "third_place") {
      const finalTop = finalRound ? pos(finalRound).y : y;
      return { x, y: finalTop + 128 };
    }
    return { x, y };
  }

  const byId = new Map(bracket.matches.map((match) => [match.id, match]));
  const placed = bracket.matches.map((match) => ({ match, ...pos(match) }));
  const width = LEFT * 2 + (rounds + offset) * CARD_W + (rounds + offset - 1) * COL_GAP;
  const height = Math.max(
    240,
    ...placed.map((p) => p.y + CARD_H + 25),
  );

  function connection(a: BracketMatch, targetId: string, isLoser: boolean) {
    const b = byId.get(targetId);
    if (!b) return null;
    const src = pos(a);
    const dst = pos(b);
    const sx = src.x + CARD_W;
    const sy = src.y + CARD_H / 2;
    const ex = dst.x;
    const ey = dst.y + CARD_H / 2;
    const mid = (sx + ex) / 2;
    return (
      <path
        key={`${a.id}-${b.id}-${isLoser ? "loser" : "winner"}`}
        d={`M ${sx} ${sy} H ${mid} V ${ey} H ${ex}`}
        fill="none"
        stroke={isLoser ? "#9ca3af" : "#6b7280"}
        strokeOpacity={isLoser ? 0.55 : 0.85}
        strokeWidth="1.6"
        strokeDasharray={isLoser ? "4 4" : undefined}
      />
    );
  }

  const headings = [
    ...(hasRepechage ? [{ label: "Repechage", x: LEFT }] : []),
    ...Array.from({ length: rounds }, (_, i) => {
      const round = i + 1;
      const name = bracket.matches.find((m) => m.phase === "main" && m.roundIndex === round)?.round;
      return {
        label: name ?? `Round ${round}`,
        x: LEFT + (offset + i) * (CARD_W + COL_GAP),
      };
    }),
  ];

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 p-1">
      <div className="relative" style={{ width, height }}>
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
          {bracket.matches.map((match) => (
            <g key={match.id}>
              {match.winnerToId && connection(match, match.winnerToId, false)}
              {match.loserToId && connection(match, match.loserToId, true)}
            </g>
          ))}
        </svg>
        {headings.map((heading) => (
          <span
            key={heading.x}
            className="absolute top-3 text-sm font-semibold text-gray-400"
            style={{ left: heading.x, width: CARD_W }}
          >
            {heading.label}
          </span>
        ))}
        {placed.map(({ match, x, y }) => {
          const homeWon = match.homeScore === 3;
          const awayWon = match.awayScore === 3;
          const box = (
            <>
              <div className={`flex h-[38px] items-center justify-between gap-2 border-b border-gray-700 px-3 ${homeWon ? "bg-green-950/40" : ""}`}>
                <span className={`truncate text-sm ${homeWon ? "font-semibold text-green-300" : "text-gray-100"}`} title={match.homeClubName ?? "TBD"}>
                  {match.homeClubName ?? "TBD"}
                </span>
                <span className="w-8 shrink-0 border-l border-gray-700 pl-2 text-right font-mono font-semibold text-gray-100">
                  {match.homeScore ?? "–"}
                </span>
              </div>
              <div className={`flex h-[38px] items-center justify-between gap-2 px-3 ${awayWon ? "bg-green-950/40" : ""}`}>
                <span className={`truncate text-sm ${awayWon ? "font-semibold text-green-300" : "text-gray-100"}`} title={match.awayClubName ?? "TBD"}>
                  {match.awayClubName ?? "TBD"}
                </span>
                <span className="w-8 shrink-0 border-l border-gray-700 pl-2 text-right font-mono font-semibold text-gray-100">
                  {match.awayScore ?? "–"}
                </span>
              </div>
            </>
          );
          const style = { left: x, top: y, width: CARD_W, height: CARD_H };
          const css = `absolute overflow-hidden rounded-md border text-left shadow-md ${
            selectedId === match.id ? "border-red-400 ring-1 ring-red-400" : "border-gray-700"
          } bg-gray-900 ${onSelect ? "cursor-pointer hover:border-red-500" : ""}`;
          return (
            <div key={match.id}>
              {match.phase === "third_place" && (
                <div className="absolute text-xs font-semibold text-amber-300" style={{ left: x, top: y - 21 }}>Third place</div>
              )}
              {onSelect ? (
                <button type="button" aria-label={`Edit ${match.round} match ${match.position + 1}`} className={css} style={style} onClick={() => onSelect(match.id)}>
                  {box}
                </button>
              ) : (
                <div className={css} style={style} aria-label={`${match.round} ${match.homeClubName ?? "TBD"} versus ${match.awayClubName ?? "TBD"}`}>
                  {box}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
