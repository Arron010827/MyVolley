
"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Verify that the logged-in user is an admin.
async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_admin) {
    redirect("/dashboard");
  }

  return supabase;
}

// Update a pending club's status.
async function updateClubStatus(
  clubId: string,
  status: "approved" | "rejected",
) {
  const supabase = await verifyAdmin();

  if (!clubId?.trim()) {
    return { error: "Invalid club ID." };
  }

  const { data, error } = await supabase
    .from("clubs")
    .update({ status })
    .eq("id", clubId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return {
      error: "This club is no longer pending or could not be found.",
    };
  }

  revalidatePath("/dashboard/clubs");
  revalidatePath("/dashboard");
  revalidatePath("/clubs");

  return { success: true };
}

export async function approveClub(clubId: string) {
  return updateClubStatus(clubId, "approved");
}

export async function rejectClub(clubId: string) {
  return updateClubStatus(clubId, "rejected");
}
