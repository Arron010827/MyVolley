"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { validateMatchSets } from "@/lib/match-score-validation";
import type { BracketSet, BracketSlot } from "@/lib/bracket-types";

// Do not expose unrestricted table mutations to clients: SQL RPCs enforce
// organiser/admin permissions and perform each change in one transaction.
async function authenticatedDb() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

function refresh(eventId: string) {
  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
}

export async function createEventBracket(
  eventId: string,
  size: number,
  thirdPlace: boolean,
  repechageCount: number,
  confirmReset = false,
) {
  const supabase = await authenticatedDb();
  const { error } = await supabase.rpc("create_event_bracket", {
    p_event_id: eventId,
    p_size: size,
    p_third_place: thirdPlace,
    p_repechage_count: repechageCount,
    p_confirm_reset: confirmReset,
  });
  if (error) throw new Error(error.message);
  refresh(eventId);
}

export async function assignBracketClub(
  eventId: string,
  bracketMatchId: string,
  slot: BracketSlot,
  clubId: string | null,
  confirmReset = false,
) {
  const supabase = await authenticatedDb();
  const { error } = await supabase.rpc("assign_bracket_club", {
    p_event_id: eventId,
    p_bracket_match_id: bracketMatchId,
    p_slot: slot,
    p_club_id: clubId,
    p_confirm_reset: confirmReset,
  });
  if (error) throw new Error(error.message);
  refresh(eventId);
}

export async function saveBracketSets(
  eventId: string,
  matchId: string,
  sets: BracketSet[],
  confirmReset = false,
) {
  const validationError = validateMatchSets(sets);
  if (validationError) throw new Error(validationError);
  const supabase = await authenticatedDb();
  const { error } = await supabase.rpc("save_bracket_match_sets", {
    p_event_id: eventId,
    p_match_id: matchId,
    p_sets: sets,
    p_confirm_reset: confirmReset,
  });
  if (error) throw new Error(error.message);
  refresh(eventId);
}

export async function applyGroupQualifiers(
  eventId: string,
  perGroup: number,
  assignments: {
    bracket_match_id: string;
    club_id: string;
    slot: BracketSlot;
  }[],
  confirmReplace = false,
) {
  // Validate basic inputs before calling PostgreSQL.
  if (
    !Number.isInteger(perGroup) ||
    perGroup < 1 ||
    perGroup > 64
  ) {
    throw new Error(
      "Invalid number of qualifiers per group.",
    );
  }

  if (assignments.length === 0) {
    throw new Error(
      "No qualified clubs have been assigned.",
    );
  }

  const supabase = await authenticatedDb();

  // PostgreSQL recalculates qualification and
  // atomically updates the bracket assignments.
  const { error } = await supabase.rpc(
    "apply_group_qualifiers",
    {
      p_event_id: eventId,
      p_per_group: perGroup,
      p_assignments: assignments,
      p_confirm_replace: confirmReplace,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  // Refresh organiser and public bracket views.
  refresh(eventId);
}