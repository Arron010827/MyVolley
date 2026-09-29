"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
) {
  const supabase = await verifyAccess(eventId);

  // Delete existing matches for this event first
  await supabase.from("event_matches").delete().eq("event_id", eventId);

  // Check how many matches exist before delete
  const { count: beforeCount } = await supabase
    .from("event_matches")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  console.log("Matches before delete:", beforeCount);

  const { error: deleteError } = await supabase
    .from("event_matches")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

  // Check after delete
  const { count: afterCount } = await supabase
    .from("event_matches")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  console.log("Matches after delete:", afterCount);
  console.log("Inserting matches:", matches.length);

  // Insert new matches
  const { error } = await supabase
    .from("event_matches")
    .insert(matches.map((m) => ({ ...m, event_id: eventId })));

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/manage`);
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
  const { extractYouTubeId } = await import("@/lib/youtube");
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const { error } = await supabase.from("streams").insert({
    youtube_url: youtubeUrl,
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

  const { extractYouTubeId } = await import("@/lib/youtube");
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const { error } = await supabase
    .from("streams")
    .update({
      youtube_url: youtubeUrl,
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
