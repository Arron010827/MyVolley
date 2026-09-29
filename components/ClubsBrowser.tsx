"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ClubAvatar from "./ClubAvatar";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Club {
  id: string;
  club_name: string;
  state: string;
  district: string | null;
  experience_level: string;
  description: string | null;
  logo_url: string | null;
  // points will be added later when scoring system is built
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "W.P. Kuala Lumpur",
  "W.P. Labuan",
  "W.P. Putrajaya",
];

const EXPERIENCE_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All levels",
];

const EXPERIENCE_COLORS: Record<string, string> = {
  Beginner: "bg-green-900 text-green-300",
  Intermediate: "bg-blue-900 text-blue-300",
  Advanced: "bg-red-900 text-red-300",
  "All levels": "bg-gray-700 text-gray-300",
};

// ─── Placeholder points — replace with real scoring later ────────────────────
// Assigns fake points based on array index so UI looks realistic
function getPlaceholderPoints(index: number): number {
  const basePoints = [980, 940, 900, 860, 820, 790, 760, 730, 700, 670];
  return basePoints[index] ?? 0;
}

// ─── Podium medal colours ────────────────────────────────────────────────────
const PODIUM_STYLES = [
  { bg: "bg-yellow-500", text: "text-yellow-900", label: "🥇", height: "h-24" },
  { bg: "bg-gray-400", text: "text-gray-900", label: "🥈", height: "h-16" },
  { bg: "bg-orange-600", text: "text-orange-100", label: "🥉", height: "h-12" },
];

export default function ClubsBrowser({ clubs }: { clubs: Club[] }) {
  // ─── Shared filter state ──────────────────────────────────────────────────
  const [selectedState, setSelectedState] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  // ─── Filter clubs based on dropdowns ─────────────────────────────────────
  // useMemo recalculates only when clubs, selectedState, or selectedLevel changes
  // Java analogy: like caching the result of an expensive filter operation
  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesState = !selectedState || club.state === selectedState;
      const matchesLevel =
        !selectedLevel || club.experience_level === selectedLevel;
      return matchesState && matchesLevel;
    });
  }, [clubs, selectedState, selectedLevel]);

  // ─── Left section: A-Z sorted ────────────────────────────────────────────
  const sortedClubs = useMemo(() => {
    return [...filteredClubs].sort((a, b) =>
      a.club_name.localeCompare(b.club_name),
    );
  }, [filteredClubs]);

  // ─── Right section: top 10 (placeholder order = registration order for now)
  const top10Clubs = filteredClubs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* ── Shared filter bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-gray-400 text-sm font-medium">Filter by:</span>

        {/* State filter */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
        >
          <option value="">All States</option>
          {STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        {/* Level filter */}
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
        >
          <option value="">All Levels</option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {(selectedState || selectedLevel) && (
          <button
            onClick={() => {
              setSelectedState("");
              setSelectedLevel("");
            }}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Clear filters ✕
          </button>
        )}

        {/* Result count */}
        <span className="text-gray-500 text-sm ml-auto">
          {filteredClubs.length} club{filteredClubs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Two column layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT: Browse All ──────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">
              Browse All
              <span className="ml-2 text-sm text-gray-500 font-normal">
                A–Z
              </span>
            </h2>
          </div>

          {/* Scrollable club list — fixed height */}
          <div className="overflow-y-auto h-[500px] bg-gray-950 p-3 space-y-2">
            {sortedClubs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No clubs match your filters
              </div>
            ) : (
              sortedClubs.map((club, index) => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.id}`}
                  className="flex items-center gap-4 px-5 py-4 bg-red-950/60 hover:bg-red-900/60 border border-red-900/40 rounded-xl transition-colors group"
                >
                  {/* Club Avatar */}
                  <ClubAvatar
                    clubName={club.club_name}
                    logoUrl={club.logo_url}
                    size="sm"
                  />
                  {/* Centre: name + location + level */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                      {club.club_name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      📍 {club.district ? `${club.district}, ` : ""}
                      {club.state}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${EXPERIENCE_COLORS[club.experience_level] ?? "bg-gray-700 text-gray-300"}`}
                    >
                      {club.experience_level}
                    </span>
                  </div>

                  {/* Right: description */}
                  {club.description && (
                    <p className="text-gray-500 text-xs text-right max-w-[120px] flex-shrink-0 self-start break-words">
                      {club.description}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Top Picks ──────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">
              Top Picks
              <span className="ml-2 text-xs text-gray-500 font-normal">
                Ranking system coming soon
              </span>
            </h2>
          </div>

          {top10Clubs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              No clubs match your filters
            </div>
          ) : (
            <div className="p-5">
              {/* Podium — top 3 only */}
              {top10Clubs.length >= 1 && (
                <div className="flex items-end justify-center gap-3 mb-8 mt-2">
                  {/* Render order: 2nd, 1st, 3rd for podium visual */}
                  {[1, 0, 2].map((rankIndex) => {
                    const club = top10Clubs[rankIndex];
                    const style = PODIUM_STYLES[rankIndex];
                    // Empty podium slot
                    if (!club)
                      return (
                        <div
                          key={rankIndex}
                          className="flex flex-col items-center gap-2 flex-1"
                        >
                          <p className="text-xs text-gray-600">—</p>
                          <p className="text-xs text-gray-600">—</p>
                          <div
                            className={`w-full ${style.height} bg-gray-800 rounded-t-lg flex items-center justify-center text-2xl opacity-30`}
                          >
                            {style.label}
                          </div>
                        </div>
                      );

                    return (
                      <Link
                        key={club.id}
                        href={`/clubs/${club.id}`}
                        className="flex flex-col items-center gap-0 group flex-1"
                      >
                        <div className="relative flex flex-col items-center w-full mb-1">
                          {/* Logo avatar */}
                          <ClubAvatar
                            clubName={club.club_name}
                            logoUrl={club.logo_url}
                            size={rankIndex === 0 ? "lg" : "md"} // 1st place gets bigger avatar
                          />

                          {/* Club name overlap with Avatar */}
                          <p className="max-h-[40px] max-w-[100px] z-10 px-2 py-0.5 -mt-3 text-xs text-center wrap-break-words text-ellipsis overflow-hidden bg-gray-800/90 border border-gray-700 rounded-lg text-gray-300 group-hover:text-red-400 transition-colors font-medium line-clamp-2 px-1">
                            {club.club_name}
                          </p>
                        </div>

                        {/* Points */}
                        <p className="text-xs text-gray-500">
                          {getPlaceholderPoints(rankIndex)} pts
                        </p>

                        {/* Podium block */}
                        <div
                          className={`w-full ${style.height} ${style.bg} rounded-t-lg flex items-center justify-center text-2xl`}
                        >
                          {style.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Ranks 4–10 as list */}
              <div className="space-y-2">
                {top10Clubs.slice(3).map((club, index) => (
                  <Link
                    key={club.id}
                    href={`/clubs/${club.id}`}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    {/* Rank number */}
                    <span className="text-gray-500 text-sm font-medium w-5 text-center">
                      {index + 4}
                    </span>

                    {/* Club avatar */}
                    <ClubAvatar
                      clubName={club.club_name}
                      logoUrl={club.logo_url}
                      size="sm"
                    />

                    {/* Club name + location */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-red-400 transition-colors truncate">
                        {club.club_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {club.district ? `${club.district}, ` : ""}
                        {club.state}
                      </p>
                    </div>

                    {/* Points */}
                    <span className="text-sm text-gray-400 flex-shrink-0">
                      {getPlaceholderPoints(index + 3)} pts
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
