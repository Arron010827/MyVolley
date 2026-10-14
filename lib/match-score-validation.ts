export type MatchSet = {
  set_number: number;
  home_points: number;
  away_points: number;
};

export function validateMatchSets(sets: MatchSet[]): string | null {
  if (sets.length > 5) {
    return "A match cannot have more than 5 sets.";
  }

  const sortedSets = [...sets].sort(
    (a, b) => a.set_number - b.set_number
  );

  let homeWins = 0;
  let awayWins = 0;

  for (let i = 0; i < sortedSets.length; i++) {
    const set = sortedSets[i];
    const target = set.set_number === 5 ? 15 : 25;
    const maxScore = Math.max(set.home_points, set.away_points);
    const minScore = Math.min(set.home_points, set.away_points);

    if (set.set_number !== i + 1) {
      return "Set numbers must be consecutive.";
    }

    if (
      !Number.isInteger(set.home_points) ||
      !Number.isInteger(set.away_points) ||
      minScore < 0
    ) {
      return `Set ${set.set_number}: invalid points.`;
    }

    if (homeWins === 3 || awayWins === 3) {
      return `Match already ended before Set ${set.set_number}.`;
    }

    if (maxScore < target) {
      return `Set ${set.set_number}: winner must reach at least ${target} points.`;
    }

    if (minScore < target - 1) {
      if (maxScore !== target) {
        return `Set ${set.set_number}: winning score must be exactly ${target}.`;
      }
    } else if (maxScore - minScore !== 2) {
      return `  Set ${set.set_number}: winner must lead by exactly 2 points.`;
    }

    if (set.home_points > set.away_points) {
      homeWins++;
    } else {
      awayWins++;
    }
  }

  return null;
}