"use server";

// app/dashboard/events/create/actions.ts
// Server action for admin to post events directly.
// Admin events are auto-approved and marked as association events.

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function createEvent(formData: {
  title: string;
  description: string;
  eventDate: string;
  endDate: string;
  location: string;
  state: string;
  type: string;
  gender: string;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin events are auto-approved
  const { error } = await supabase.from("events").insert({
    title: formData.title.trim(),
    description: formData.description || null,
    event_date: formData.eventDate,
    end_date: formData.endDate || null,
    location: formData.location.trim(),
    state: formData.state,
    type: formData.type,
    created_by: user.id,
    gender: formData.gender.trim() || "mix",
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function approveEvent(eventId: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "You do not have permission to approve events." };
  }

  const { error } = await supabase
    .from("events")
    .update({ status: "approved" })
    .eq("id", eventId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function rejectEvent(eventId: string) {
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

  if (!profile?.is_admin) {
    return { error: "You do not have permission to reject events." };
  }

  const { error } = await supabase
    .from("events")
    .update({ status: "rejected" })
    .eq("id", eventId);

  if (error) return { error: error.message };

  return { success: true };
}
