"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateStreamAssignment } from "@/lib/stream-validation";
import { validateMatchSets } from "@/lib/match-score-validation";

// ─── Verify user is organiser or admin ───────────────────────────────────────
async function verifyAccess(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { data: organiser } = await supabase
    .from("event_organisers")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin && !organiser) redirect(`/events/${eventId}`);

  return supabase;
}

/**
 * Save the Rules & Regulations URL for an event.
 * An empty URL clears the existing link.
 */
export async function saveRulesUrl(
  eventId: string,
  rulesUrl: string,
) {
  const supabase = await verifyAccess(eventId);

  const trimmedUrl = rulesUrl.trim();
  let normalizedUrl: string | null = null;

  if (trimmedUrl) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      throw new Error("Please enter a valid URL.");
    }

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      throw new Error("The URL must start with http:// or https://.");
    }

    normalizedUrl = parsedUrl.toString();
  }

  const { error } = await supabase
    .from("events")
    .update({ rules_url: normalizedUrl })
    .eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);

  return { success: true };
}

// ─── Add club to event with group ────────────────────────────────────────────
export async function addClubToEventWithGroup(
  eventId: string,
  formData: FormData,
) {
  const supabase = await verifyAccess(eventId);

  const club_id = formData.get("club_id") as string;
  const group_name = (formData.get("group_name") as string) || null;

  if (!club_id) return;

  // Check if club already in event
  const { data: existing } = await supabase
    .from("club_events")
    .select("id")
    .eq("event_id", eventId)
    .eq("club_id", club_id)
    .single();

  if (existing) return { alreadyAdded: true };

  const { error } = await supabase.from("club_events").insert({
    event_id: eventId,
    club_id,
    group_name: group_name || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
  return { success: true };
}

// ─── Update club group ────────────────────────────────────────────────────────
export async function updateClubGroup(
  eventId: string,
  clubId: string,
  groupName: string | null,
) {
  const supabase = await verifyAccess(eventId);

  const { error } = await supabase
    .from("club_events")
    .update({ group_name: groupName || null })
    .eq("event_id", eventId)
    .eq("club_id", clubId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
}

// ─── Remove club from event ───────────────────────────────────────────────────
export async function removeClubFromEvent(eventId: string, clubId: string) {
  const supabase = await verifyAccess(eventId);

  const { error } = await supabase
    .from("club_events")
    .delete()
    .eq("event_id", eventId)
    .eq("club_id", clubId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
}

// ─── Save generated matches ───────────────────────────────────────────────────
export async function saveMatches(
  eventId: string,
  matches: {
    match_number: number;
    home_club_id: string;
    away_club_id: string;
    court: string;
    match_date: string;
    match_time: string;
    group_name: string | null;
    round: string;
  }[],
  stage: "group" | "league",
  confirmReset = false,
) {
  const supabase = await verifyAccess(eventId);

  const expectedRound =
  stage === "group" ? "Group Stage" : "League Stage";
  
  if (matches.some((m) => m.round !== expectedRound)) {
    throw new Error(
      `Only ${expectedRound} matches can be generated here.`,
    );
  }

  // Perform schedule regeneration in one
  // PostgreSQL transaction.
  const { error } = await supabase.rpc(
    "regenerate_event_stage_schedule",
    {
      p_event_id: eventId,
      p_stage: stage,
      p_matches: matches,
      p_confirm_reset: confirmReset,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
}

// ─── Update match score ───────────────────────────────────────────────────────
// export async function updateMatchScore(
//   eventId: string,
//   matchId: string,
//   homeScore: number,
//   awayScore: number,
// ) {
//   const supabase = await verifyAccess(eventId);

//   const { error } = await supabase
//     .from("event_matches")
//     .update({ home_score: homeScore, away_score: awayScore })
//     .eq("id", matchId)
//     .eq("event_id", eventId);

//   if (error) throw new Error(error.message);

//   revalidatePath(`/events/${eventId}/manage`);
// }

// ─── Save match sets + auto-calculate match score ─────────────────────────────
export async function saveMatchSets(
  eventId: string,
  matchId: string,
  sets: { set_number: number; home_points: number; away_points: number }[],
) {
  const supabase = await verifyAccess(eventId);

  // Validate Sets
  const validationError = validateMatchSets(sets);

  if (validationError) {
    throw new Error(validationError);
  }
  
  // Delete existing sets for this match first
  await supabase.from("event_match_sets").delete().eq("match_id", matchId);

  // Insert new sets
  const { error: setsError } = await supabase
    .from("event_match_sets")
    .insert(sets.map((s) => ({ ...s, match_id: matchId })));

  if (setsError) throw new Error(setsError.message);

  // Auto-calculate match score from sets
  const homeScore = sets.filter((s) => s.home_points > s.away_points).length;
  const awayScore = sets.filter((s) => s.away_points > s.home_points).length;

  // Update match with calculated scores
  const { error: matchError } = await supabase
    .from("event_matches")
    .update({ home_score: homeScore, away_score: awayScore })
    .eq("id", matchId);

  if (matchError) throw new Error(matchError.message);

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
}


// ------------------------- Stream Management --------------------------------------------

// ─── Assign a new stream to a match ──────────────────────────────────────────
export async function assignStream(
  eventId: string,
  matchId: string,
  youtubeUrl: string,
) {
  const supabase = await verifyAccess(eventId);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Validate YouTube URL
  const videoId =   await validateStreamAssignment(supabase, {
    youtubeUrl,
    matchId,
  });
  if (!videoId) throw new Error("Invalid YouTube URL");

  const { error } = await supabase.from("streams").insert({
    youtube_url: youtubeUrl,
    youtube_video_id: videoId,
    event_id: eventId,
    match_id: matchId,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
}

// ─── Edit stream YouTube URL ──────────────────────────────────────────────────
export async function editStream(
  eventId: string,
  streamId: string,
  youtubeUrl: string,
  matchId: string,
  newEventId: string,
) {
  const supabase = await verifyAccess(eventId);

  const videoId = await validateStreamAssignment(supabase, {
    youtubeUrl,
    matchId,
    excludeStreamId: streamId,
  });
  if (!videoId) throw new Error("Invalid YouTube URL");

  const { error } = await supabase
    .from("streams")
    .update({
      youtube_url: youtubeUrl,
      youtube_video_id: videoId,
      match_id: matchId || null,
      event_id: newEventId || null,
    })
    .eq("id", streamId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/live");
}

// ─── Toggle is_live ───────────────────────────────────────────────────────────
export async function toggleStreamLive(
  eventId: string,
  streamId: string,
  currentStatus: boolean,
) {
  const supabase = await verifyAccess(eventId);

  const { error } = await supabase
    .from("streams")
    .update({ is_live: !currentStatus })
    .eq("id", streamId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/live");
}

// ─── Delete a stream ──────────────────────────────────────────────────────────
export async function deleteStream(eventId: string, streamId: string) {
  const supabase = await verifyAccess(eventId);

  const { error } = await supabase.from("streams").delete().eq("id", streamId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/live");
}
