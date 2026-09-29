"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Helper: verify admin ────────────────────────────────────────────────────
async function verifyAdmin() {
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
  return supabase;
}

// ─── Add a club to an event ──────────────────────────────────────────────────
export async function addClubToEvent(formData: FormData) {
  const supabase = await verifyAdmin();

  const club_id = formData.get("club_id") as string;
  const event_id = formData.get("event_id") as string;

  if (!club_id || !event_id) return;

  const { error } = await supabase
    .from("club_events")
    .insert({ club_id, event_id });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/club-events");
}

// ─── Remove a club from an event ─────────────────────────────────────────────
export async function removeClubFromEvent(clubId: string, eventId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase
    .from("club_events")
    .delete()
    .eq("club_id", clubId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/club-events");
}
