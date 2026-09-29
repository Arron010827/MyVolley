"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

// ─── Assign an organiser to an event ─────────────────────────────────────────
export async function assignOrganiser(formData: FormData) {
  const supabase = await verifyAdmin();

  const event_id = formData.get("event_id") as string;
  const user_id = formData.get("user_id") as string;

  if (!event_id || !user_id) return;

  // Check if already assigned
  const { data: existing } = await supabase
    .from("event_organisers")
    .select("id")
    .eq("event_id", event_id)
    .eq("user_id", user_id)
    .single();

  // ✅ Return a flag instead of silently skipping
  if (existing) return { alreadyAssigned: true };

  const { error } = await supabase
    .from("event_organisers")
    .insert({ event_id, user_id });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/event-organisers");
  return { success: true };
}

// ─── Remove an organiser from an event ───────────────────────────────────────
export async function removeOrganiser(eventId: string, userId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase
    .from("event_organisers")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/event-organisers");
}
