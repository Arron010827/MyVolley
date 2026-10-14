import type { createServerSupabaseClient } from "@/lib/supabase-server";
import type { BracketData, BracketMatch, BracketPhase, BracketSet, BracketSlot } from "@/lib/bracket-types";

type ServerDb = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getEventBracket(
  supabase: ServerDb,
  eventId: string,
): Promise<BracketData | null> {
  const { data: bracket, error: bracketError } = await supabase
    .from("event_brackets")
    .select("id, bracket_size, third_place_enabled, repechage_count")
    .eq("event_id", eventId)
    .maybeSingle();
  if (bracketError) throw new Error(`Loading bracket: ${bracketError.message}`);
  if (!bracket) return null;

  const { data: nodes, error: nodeError } = await supabase
    .from("event_bracket_matches")
    .select("id,match_id,phase,round_index,position,next_winner_match_id,next_winner_slot,next_loser_match_id,next_loser_slot")
    .eq("bracket_id", bracket.id)
    .order("round_index")
    .order("position");
  if (nodeError) throw new Error(`Loading bracket matches: ${nodeError.message}`);

  const ids = (nodes ?? []).map((m) => m.match_id);
  if (!ids.length) return {
    id: bracket.id,
    bracketSize: bracket.bracket_size as 4 | 8 | 16 | 32 | 64,
    thirdPlaceEnabled: bracket.third_place_enabled,
    repechageCount: bracket.repechage_count,
    matches: [],
  };

  const { data: matches, error: matchError } = await supabase
    .from("event_matches")
    .select(`
      id, round, home_club_id, away_club_id, home_score, away_score,
      home_club:home_club_id(club_name),
      away_club:away_club_id(club_name),
      event_match_sets(set_number, home_points, away_points)
    `)
    .in("id", ids);
  if (matchError) throw new Error(`Loading bracket results: ${matchError.message}`);

  const byId = new Map((matches ?? []).map((m) => [m.id, m]));
  const result: BracketMatch[] = (nodes ?? []).map((node) => {
    const match = byId.get(node.match_id);
    if (!match) throw new Error(`Missing event match for bracket node ${node.id}`);
    return {
      id: node.id,
      matchId: node.match_id,
      phase: node.phase as BracketPhase,
      roundIndex: node.round_index,
      position: node.position,
      winnerToId: node.next_winner_match_id,
      winnerToSlot: node.next_winner_slot as BracketSlot | null,
      loserToId: node.next_loser_match_id,
      loserToSlot: node.next_loser_slot as BracketSlot | null,
      round: match.round ?? "",
      homeClubId: match.home_club_id,
      awayClubId: match.away_club_id,
      homeClubName: first(match.home_club)?.club_name ?? null,
      awayClubName: first(match.away_club)?.club_name ?? null,
      homeScore: match.home_score,
      awayScore: match.away_score,
      sets: [...(match.event_match_sets ?? [])].sort(
        (a: BracketSet, b: BracketSet) => a.set_number - b.set_number,
      ),
    };
  });

  return {
    id: bracket.id,
    bracketSize: bracket.bracket_size as 4 | 8 | 16 | 32 | 64,
    thirdPlaceEnabled: bracket.third_place_enabled,
    repechageCount: bracket.repechage_count,
    matches: result,
  };
}
