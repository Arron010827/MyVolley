
import {
  validateMatchSets,
  type MatchSet,
} from "@/lib/match-score-validation";

// Clubs registered for this event.
export interface StandingClub {
  club_id: string;
  club_name: string;
  group_name: string | null;
}

// Existing match data.
export interface StandingMatch {
  id: string;
  home_club_id: string;
  away_club_id: string;
  home_score: number | null;
  away_score: number | null;
  stage?: string | null;
  round: string | null;
  group_name: string | null;
  sets: MatchSet[];
}

export interface RankedClub {
  clubId: string;
  clubName: string;
  groupName: string | null;
  position: number;
  mp: number;
  mw: number;
  ml: number;
  sw: number;
  sl: number;
  pw: number;
  pl: number;
  setDifference: number;
  pointsRatio: number;
}

export interface GroupStanding {
  groupName: string | null;
  label: string;
  clubs: RankedClub[];
  scheduledMatches: number;
  completedMatches: number;
  isReady: boolean;
  warnings: string[];
}

// Determine whether the match belongs to the
// group or league competition stage.
function isQualificationMatch(match: StandingMatch) {
  if (match.stage != null) {
    return (
      match.stage === "group" ||
      match.stage === "league"
    );
  }

  // Legacy records without stage.
  return (
    match.round === "Group Stage" ||
    match.round === "League Stage"
  );
}

// Only accept completed best-of-five matches
// with valid set-level results.
function getCompletedResult(match: StandingMatch) {
  const home = match.home_score;
  const away = match.away_score;

  if (home === null || away === null) return null;

  const validScore =
    (home === 3 && Number.isInteger(away) &&
      away >= 0 && away <= 2) ||
    (away === 3 && Number.isInteger(home) &&
      home >= 0 && home <= 2);

  if (!validScore) return null;

  if (match.sets.length !== home + away) return null;

  if (validateMatchSets(match.sets) !== null) {
    return null;
  }

  const homeWins = match.sets.filter(
    (set) => set.home_points > set.away_points
  ).length;

  const awayWins = match.sets.filter(
    (set) => set.away_points > set.home_points
  ).length;

  if (homeWins !== home || awayWins !== away) {
    return null;
  }

  return { home, away };
}

export function calculateGroupStandings(
  clubs: StandingClub[],
  matches: StandingMatch[],
): GroupStanding[] {
  const groups = new Map<string, GroupStanding>();
  const clubGroup = new Map<string, string>();

  // 1. Create each group and its registered clubs.
  for (const club of clubs) {
    const groupName = club.group_name ?? null;
    const key = groupName ?? "__ungrouped__";

    clubGroup.set(club.club_id, key);

    if (!groups.has(key)) {
      groups.set(key, {
        groupName,
        label: groupName
          ? `Group ${groupName}`
          : "League / Ungrouped",
        clubs: [],
        scheduledMatches: 0,
        completedMatches: 0,
        isReady: false,
        warnings: [],
      });
    }

    groups.get(key)!.clubs.push({
      clubId: club.club_id,
      clubName: club.club_name,
      groupName,
      position: 0,
      mp: 0,
      mw: 0,
      ml: 0,
      sw: 0,
      sl: 0,
      pw: 0,
      pl: 0,
      setDifference: 0,
      pointsRatio: 0,
    });
  }

  // 2. Process group/league matches only.
  const relevantMatches = matches.filter(
    isQualificationMatch
  );

  for (const match of relevantMatches) {
    const homeGroup = clubGroup.get(match.home_club_id);
    const awayGroup = clubGroup.get(match.away_club_id);

    // Both clubs must belong to the same group.
    if (!homeGroup || homeGroup !== awayGroup) {
      for (const key of [homeGroup, awayGroup]) {
        if (key) {
          groups.get(key)?.warnings.push(
            `Match ${match.id} has invalid group membership.`
          );
        }
      }
      continue;
    }

    const group = groups.get(homeGroup);
    if (!group) continue;

    group.scheduledMatches++;

    const result = getCompletedResult(match);

    // Incomplete matches are not counted in standings.
    if (!result) continue;

    const home = group.clubs.find(
      (club) => club.clubId === match.home_club_id
    );

    const away = group.clubs.find(
      (club) => club.clubId === match.away_club_id
    );

    if (!home || !away || home.clubId === away.clubId) {
      group.warnings.push(
        `Match ${match.id} has invalid participants.`
      );
      continue;
    }

    group.completedMatches++;

    home.mp++;
    away.mp++;

    if (result.home > result.away) {
      home.mw++;
      away.ml++;
    } else {
      away.mw++;
      home.ml++;
    }

    home.sw += result.home;
    home.sl += result.away;

    away.sw += result.away;
    away.sl += result.home;

    for (const set of match.sets) {
      home.pw += set.home_points;
      home.pl += set.away_points;

      away.pw += set.away_points;
      away.pl += set.home_points;
    }
  }

  // 3. Calculate ratios and rank every group.
  for (const group of groups.values()) {
    for (const club of group.clubs) {
      club.setDifference = club.sw - club.sl;

      // Matches the current public standings logic.
      club.pointsRatio =
        club.pl === 0
          ? club.pw
          : club.pw / club.pl;
    }

    group.clubs.sort((a, b) => {
      // Highest number of match wins first.
      if (b.mw !== a.mw) return b.mw - a.mw;

      // Then higher set difference.
      if (b.setDifference !== a.setDifference) {
        return b.setDifference - a.setDifference;
      }

      // Then higher points ratio.
      if (b.pointsRatio !== a.pointsRatio) {
        return b.pointsRatio - a.pointsRatio;
      }

      // Deterministic display order only.
      // This does not resolve a sporting tie.
      return a.clubName.localeCompare(b.clubName);
    });

    group.clubs.forEach((club, index) => {
      club.position = index + 1;
    });

    // Qualifying is permitted only when all matches
    // in the group's schedule have valid final scores.
    group.isReady =
      group.scheduledMatches > 0 &&
      group.completedMatches === group.scheduledMatches &&
      group.warnings.length === 0;
  }

  return [...groups.values()].sort(
    (a, b) => a.label.localeCompare(b.label)
  );
}
