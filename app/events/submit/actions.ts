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
  entryFee: string;
  teamSize: string;
  teamCapacity: string;
  competitionFormat: string;
  netHeight: string;
  winningPoints: string;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (
    formData.entryFee &&
    (!Number.isFinite(Number(formData.entryFee)) ||
      Number(formData.entryFee) < 0)
  ) {
    return { error: "Please enter a valid entry fee." };
  }

  if (
    formData.teamSize &&
    (!Number.isInteger(Number(formData.teamSize)) ||
      Number(formData.teamSize) <= 0)
  ) {
    return { error: "Team size must be a positive whole number." };
  }

  if (
    formData.teamCapacity &&
    (!Number.isInteger(Number(formData.teamCapacity)) ||
      Number(formData.teamCapacity) <= 0)
  ) {
    return { error: "Team capacity must be a positive whole number." };
  }

  if (
    formData.competitionFormat &&
    ![
      "single_elimination_first_round",
      "group_stage_single_elimination_second_round",
    ].includes(formData.competitionFormat)
  ) {
    return { error: "Invalid competition format." };
  }

  if (
    formData.netHeight &&
    (!Number.isInteger(Number(formData.netHeight)) ||
      Number(formData.netHeight) <= 0)
  ) {
    return { error: "Please enter a valid net height." };
  }

  if (
    formData.winningPoints &&
    !["25", "31"].includes(formData.winningPoints)
  ) {
    return { error: "Invalid winning points selection." };
  }

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
    entry_fee: formData.entryFee ? Number(formData.entryFee) : null,
    team_size: formData.teamSize ? Number(formData.teamSize) : null,
    team_capacity: formData.teamCapacity
      ? Number(formData.teamCapacity)
      : null,
    competition_format: formData.competitionFormat || null,
    net_height: formData.netHeight ? Number(formData.netHeight) : null,
    winning_points: formData.winningPoints
      ? Number(formData.winningPoints)
      : null,
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
