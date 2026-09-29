"use server";

// app/clubs/actions.ts
// Server actions for club-related operations.

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function requestToJoinClub(clubId: string) {
  const supabase = await createServerSupabaseClient();

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if the user already has a pending or approved request for this club
  const { data: existingRequest } = await supabase
    .from("club_members")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("player_id", user.id)
    .single();

  if (existingRequest) {
    return {
      error: `You already have a ${existingRequest.status} request for this club.`,
    };
  }

  // Insert the join request
  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    player_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
