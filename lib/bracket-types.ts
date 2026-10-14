export type BracketPhase = "main" | "repechage" | "third_place";
export type BracketSlot = "home" | "away";

export type BracketSet = {
  set_number: number;
  home_points: number;
  away_points: number;
};

export type BracketMatch = {
  id: string; // event_bracket_matches.id
  matchId: string; // event_matches.id
  phase: BracketPhase;
  roundIndex: number; // 1 = first main round; 0 = repechage
  position: number;
  winnerToId: string | null;
  winnerToSlot: BracketSlot | null;
  loserToId: string | null;
  loserToSlot: BracketSlot | null;
  round: string;
  homeClubId: string | null;
  awayClubId: string | null;
  homeClubName: string | null;
  awayClubName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  sets: BracketSet[];
};

export type BracketData = {
  id: string;
  bracketSize: 4 | 8 | 16 | 32 | 64;
  thirdPlaceEnabled: boolean;
  repechageCount: number;
  matches: BracketMatch[];
};

export type BracketClub = {
  club_id: string;
  club_name: string;
};
