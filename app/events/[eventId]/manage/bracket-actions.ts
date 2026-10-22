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

export async function generateBracketWithAssignments(
  eventId: string,
  size: number,
  thirdPlace: boolean,
  repechageCount: number,
  assignments: {
    phase: "main" | "repechage";
    position: number;
    slot: BracketSlot;
    club_id: string;
  }[],
  confirmReset = false,
) {
  if (![4, 8, 16, 32, 64].includes(size)) {
    throw new Error("Invalid bracket size.");
  }

  if (
    !Number.isInteger(repechageCount) ||
    repechageCount < 0 ||
    repechageCount > size
  ) {
    throw new Error("Invalid repechage match count.");
  }

  if (assignments.length === 0) {
    throw new Error("No bracket assignments were provided.");
  }

  const slotKeys = assignments.map(
    (item) => `${item.phase}:${item.position}:${item.slot}`,
  );
  const clubIds = assignments.map((item) => item.club_id);

  if (
    assignments.some(
      (item) =>
        !item.club_id ||
        !Number.isInteger(item.position) ||
        item.position < 0 ||
        !["main", "repechage"].includes(item.phase) ||
        !["home", "away"].includes(item.slot),
    )
  ) {
    throw new Error("One or more bracket assignments are invalid.");
  }

  if (new Set(slotKeys).size !== slotKeys.length) {
    throw new Error("A bracket position has been assigned more than once.");
  }

  if (new Set(clubIds).size !== clubIds.length) {
    throw new Error("A club cannot be assigned to multiple positions.");
  }

  const supabase = await authenticatedDb();

  const { error } = await supabase.rpc(
    "generate_event_bracket_with_assignments",
    {
      p_event_id: eventId,
      p_size: size,
      p_third_place: thirdPlace,
      p_repechage_count: repechageCount,
      p_assignments: assignments,
      p_confirm_reset: confirmReset,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

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

export async function saveQualificationAssignments(
  eventId: string,
  assignments: {
    bracket_match_id: string;
    club_id: string;
    slot: BracketSlot;
  }[],
  confirmReset = false,
) {
  if (assignments.length === 0) {
    throw new Error("No qualification assignments were provided.");
  }

  const slotKeys = assignments.map(
    (item) => `${item.bracket_match_id}:${item.slot}`,
  );

  const clubIds = assignments.map((item) => item.club_id);

  if (
    assignments.some(
      (item) =>
        !item.bracket_match_id ||
        !item.club_id ||
        !["home", "away"].includes(item.slot),
    )
  ) {
    throw new Error("One or more qualification assignments are invalid.");
  }

  if (new Set(slotKeys).size !== slotKeys.length) {
    throw new Error("A bracket position has been assigned more than once.");
  }

  if (new Set(clubIds).size !== clubIds.length) {
    throw new Error("A club cannot be assigned more than once.");
  }

  const supabase = await authenticatedDb();

  const { error } = await supabase.rpc(
    "save_qualification_assignments",
    {
      p_event_id: eventId,
      p_assignments: assignments,
      p_confirm_reset: confirmReset,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

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

//_______ Save knockout match schedule___________________________
export async function saveKnockoutSchedule(
  eventId: string,
  schedule: {
    match_id: string;
    court: string;
    match_date: string;
    match_time: string;
  }[],
) {
  if (schedule.length === 0) {
    throw new Error("No knockout matches were provided.");
  }

  if (
    schedule.some(
      (match) =>
        !match.match_id ||
        !match.court.trim() ||
        !match.match_date ||
        !match.match_time,
    )
  ) {
    throw new Error(
      "Every knockout match must have a date, time, and court.",
    );
  }

  if (
    new Set(schedule.map((match) => match.match_id)).size !==
    schedule.length
  ) {
    throw new Error("Duplicate match IDs were provided.");
  }

  const supabase = await authenticatedDb();

  const { error } = await supabase.rpc("save_knockout_schedule", {
    p_event_id: eventId,
    p_schedule: schedule,
  });

  if (error) {
    throw new Error(error.message);
  }

  refresh(eventId);
}
