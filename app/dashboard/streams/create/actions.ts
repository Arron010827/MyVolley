"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractYouTubeId } from "@/lib/youtube";

// ─── Create a new stream ─────────────────────────────────────────────────────
export async function createStream(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  // Verify the user is an admin before doing anything
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // Extract form values
  const youtube_url = formData.get("youtube_url") as string;
  const event_id = (formData.get("event_id") as string) || null;
  const match_id = (formData.get("match_id") as string) || null;

  if (!match_id) throw new Error("A match must be selected");

  // Validate the YouTube URL before saving
  const videoId = extractYouTubeId(youtube_url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL — please use a standard YouTube link");
  }

  const { error } = await supabase.from("streams").insert({
    youtube_url,
    event_id: event_id || null, // empty string → null in DB
    match_id: match_id || null,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/streams");
  revalidatePath("/live");
  redirect("/dashboard/streams");
}

// ─── Link unlinked stream to a match ─────────────────────────────────────────
export async function linkStreamToMatch(
  streamId: string,
  youtubeUrl: string,
  matchId: string,
  eventId: string,
) {
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

  if (!profile?.is_admin) redirect("/dashboard");

  const { extractYouTubeId } = await import("@/lib/youtube");
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const { error } = await supabase
    .from("streams")
    .update({
      youtube_url: youtubeUrl,
      match_id: matchId || null,
      event_id: eventId || null,
    })
    .eq("id", streamId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/streams");
  revalidatePath("/live");
}

// ─── Toggle is_live on/off ───────────────────────────────────────────────────
export async function toggleLiveStatus(
  streamId: string,
  currentStatus: boolean,
) {
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

  if (!profile?.is_admin) redirect("/dashboard");

  const { error } = await supabase
    .from("streams")
    .update({ is_live: !currentStatus }) // flip the current value
    .eq("id", streamId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/streams");
  revalidatePath("/live");
}

// ─── Delete a stream ─────────────────────────────────────────────────────────
export async function deleteStream(streamId: string) {
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

  if (!profile?.is_admin) redirect("/dashboard");

  const { error } = await supabase.from("streams").delete().eq("id", streamId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/streams");
  revalidatePath("/live");
}
