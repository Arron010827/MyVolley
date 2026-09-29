"use client";

import { useState } from "react";
import Link from "next/link";
import StreamCard, {
  extractMatch,
  getStreamTitle,
  formatMatchDateTime,
  isUpcomingStream,
  isPastStream,
} from "@/components/StreamCard";
import FeaturedStream from "./FeaturedStream";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stream {
  id: string;
  youtube_url: string;
  event_matches: unknown;
  match_id: string;
  is_live: boolean;
}

interface ClubInfo {
  id: string;
  club_name: string;
  logo_url: string | null;
}

interface Match {
  id: string;
  match_number: number;
  court: string | null;
  match_date: string | null;
  match_time: string | null;
  home_score: number | null;
  away_score: number | null;
  group_name: string | null;
  round: string | null;
  home_club: ClubInfo | null;
  away_club: ClubInfo | null;
  home_club_id: string;
  away_club_id: string;
  sets: { set_number: number; home_points: number; away_points: number }[];
}

interface ClubEvent {
  club_id: string;
  group_name: string | null;
  club_name: string;
}

interface Event {
  id: string;
  title: string;
  type: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string;
  state: string;
  is_association_event: boolean;
  gender: string;
}

interface MatchSet {
  match_id: string;
  home_points: number;
  away_points: number;
}

interface Props {
  event: Event;
  streams: Stream[];
  matches: Match[];
  clubEvents: ClubEvent[];
  matchSets: MatchSet[];
  eventId: string;
  now: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const TYPE_COLORS: Record<string, string> = {
  tournament: "bg-orange-900/50 text-orange-300",
  league: "bg-blue-900/50 text-blue-300",
};

// ─── Standings calculator ─────────────────────────────────────────────────────
function calculateStandings(
  matches: Match[],
  clubEvents: ClubEvent[],
  matchSets: { match_id: string; home_points: number; away_points: number }[],
) {
  const safeSets = matchSets ?? [];

  // Build stats per club
  const stats: Record<
    string,
    {
      club_id: string;
      club_name: string;
      group_name: string | null;
      mp: number; // matches played
      mw: number; // match wins
      ml: number; // match losses
      sw: number; // sets won
      sl: number; // sets lost
      pw: number; // points won
      pl: number; // points lost
    }
  > = {};

  // Initialise all clubs
  clubEvents.forEach((ce) => {
    stats[ce.club_id] = {
      club_id: ce.club_id,
      club_name: ce.club_name,
      group_name: ce.group_name,
      mp: 0,
      mw: 0,
      ml: 0,
      sw: 0,
      sl: 0,
      pw: 0,
      pl: 0,
    };
  });

  // Build a lookup: match_id → all sets for that match
  const setsByMatch: Record<
    string,
    { home_points: number; away_points: number }[]
  > = {};
  safeSets.forEach((s) => {
    if (!setsByMatch[s.match_id]) setsByMatch[s.match_id] = [];
    setsByMatch[s.match_id].push(s);
  });

  // Process completed matches only
  matches
    .filter((m) => m.home_score !== null && m.away_score !== null)
    .forEach((m) => {
      const home = stats[m.home_club_id];
      const away = stats[m.away_club_id];
      if (!home || !away) return;

      const hs = m.home_score!;
      const as_ = m.away_score!;

      // Match played
      home.mp++;
      away.mp++;

      // Match win/loss
      if (hs > as_) {
        home.mw++;
        away.ml++;
      } else {
        away.mw++;
        home.ml++;
      }

      // Sets
      home.sw += hs;
      home.sl += as_;
      away.sw += as_;
      away.sl += hs;

      // Points from individual sets
      const sets = setsByMatch[m.id] ?? [];
      sets.forEach((set) => {
        home.pw += set.home_points;
        home.pl += set.away_points;
        away.pw += set.away_points;
        away.pl += set.home_points;
      });
    });

  return Object.values(stats);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EventTabs({
  event,
  streams,
  matches,
  clubEvents,
  matchSets,
  eventId,
  now,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "featured" | "schedule" | "standings" | "bracket"
  >("featured");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const upcomingStreams = streams.filter((s) => isUpcomingStream(s, now));
  const pastStreams = streams.filter((s) => isPastStream(s, now));

  // Group matches by group
  const matchesByGroup = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.group_name ?? "all";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Calculate standings per group
  const allStats = calculateStandings(matches, clubEvents, matchSets ?? []);
  const statsByGroup = allStats.reduce<Record<string, typeof allStats>>(
    (acc, s) => {
      const key = s.group_name ?? "all";
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {},
  );

  const tabs = [
    { key: "featured", label: "📺 Featured" },
    { key: "schedule", label: "📅 Schedule" },
    { key: "standings", label: "🏆 Standings" },
    { key: "bracket", label: "🔱 Bracket" },
  ] as const;

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-gray-900 border border-b-0 border-gray-800 text-white"
                : "text-gray-500 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Featured tab */}
      {activeTab === "featured" && (
        <FeaturedStream
          streams={streams}
          matches={matches}
          eventId={eventId}
          now={now}
        />
      )}

      {/* ── Schedule tab ──────────────────────────────────────────────────── */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {matches.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
              <p>No schedule published yet</p>
              <p className="text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            Object.entries(matchesByGroup).map(([groupKey, groupMatches]) => (
              <div
                key={groupKey}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-gray-800">
                  <span className="text-sm font-bold text-white">
                    {groupKey === "all"
                      ? event.type === "league"
                        ? "League Stage"
                        : "Group Stage"
                      : `Group ${groupKey}`}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    {groupMatches.length} matches
                  </span>
                </div>

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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {groupMatches.map((match) => (
                        <tr key={match.id} className="hover:bg-gray-800/50">
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
                          <td className="px-5 py-3 text-center font-mono text-white">
                            {/* Match score */}
                            <span
                              className={`font-mono font-bold block text-xl ${
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
                              <span className="text-gray-500 text-xs font-mono block mt-0.5">
                                {match.sets
                                  .sort((a, b) => a.set_number - b.set_number)
                                  .map(
                                    (set) =>
                                      `${set.home_points}-${set.away_points}`,
                                  )
                                  .join(" | ")}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-medium text-center text-white">
                            {match.away_club?.club_name ?? "—"}
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
      )}

      {/* ── Standings tab ─────────────────────────────────────────────────── */}
      {activeTab === "standings" && (
        <div className="space-y-6">
          {Object.keys(statsByGroup).length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
              <p>No standings yet</p>
              <p className="text-sm mt-1">
                Standings will appear once matches are played
              </p>
            </div>
          ) : (
            Object.entries(statsByGroup).map(([groupKey, groupStats]) => {
              // Sort: MW desc → Pts desc → PR desc
              const sorted = [...groupStats].sort((a, b) => {
                if (b.mw !== a.mw) return b.mw - a.mw;
                const aPts = a.sw - a.sl;
                const bPts = b.sw - b.sl;
                if (bPts !== aPts) return bPts - aPts;
                const aPR = a.pl === 0 ? a.pw : a.pw / a.pl;
                const bPR = b.pl === 0 ? b.pw : b.pw / b.pl;
                return bPR - aPR;
              });

              return (
                <div
                  key={groupKey}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-gray-800">
                    <span className="text-sm font-bold text-white">
                      {groupKey === "all"
                        ? event.type === "league"
                          ? "League Standings"
                          : "Group Standings"
                        : `Group ${groupKey}`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-xs">
                          <th className="px-5 py-3 text-left w-12">Pos</th>
                          <th className="px-5 py-3 text-left">Club</th>
                          <th className="px-5 py-3 text-center w-12">MP</th>
                          <th className="px-5 py-3 text-center w-12">MW</th>
                          <th className="px-5 py-3 text-center w-12">ML</th>
                          <th className="px-5 py-3 text-center w-16">SR</th>
                          <th className="px-5 py-3 text-center w-16">PR</th>
                          <th className="px-5 py-3 text-center w-16">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {sorted.map((club, index) => {
                          const pts = club.sw - club.sl;
                          const sr =
                            club.sl === 0
                              ? club.sw.toFixed(2)
                              : (club.sw / club.sl).toFixed(2);
                          const pr =
                            club.pl === 0
                              ? club.pw.toFixed(2)
                              : (club.pw / club.pl).toFixed(2);

                          return (
                            <tr
                              key={club.club_id}
                              className={`hover:bg-gray-800/50 ${
                                index === 0 ? "text-yellow-400" : ""
                              }`}
                            >
                              <td className="px-5 py-3 font-bold">
                                {index + 1}
                              </td>
                              <td className="px-5 py-3">
                                <Link
                                  href={`/clubs/${club.club_id}`}
                                  className="font-medium hover:text-red-400 transition-colors"
                                >
                                  {club.club_name}
                                </Link>
                              </td>
                              <td className="px-5 py-3 text-center text-gray-300">
                                {club.mp}
                              </td>
                              <td className="px-5 py-3 text-center text-green-400">
                                {club.mw}
                              </td>
                              <td className="px-5 py-3 text-center text-red-400">
                                {club.ml}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-300">
                                {sr}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-300">
                                {pr}
                              </td>
                              <td className="px-5 py-3 text-center font-bold text-white">
                                {pts}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Bracket tab ───────────────────────────────────────────────────── */}
      {activeTab === "bracket" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
          <p className="text-2xl mb-2">🔱</p>
          <p className="text-lg font-medium text-gray-400">
            Bracket Coming Soon
          </p>
          <p className="text-sm mt-1">
            Elimination bracket will be available in a future update
          </p>
        </div>
      )}
    </div>
  );
}
