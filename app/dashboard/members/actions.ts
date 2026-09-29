"use server";

// app/dashboard/members/actions.ts
// Server actions for approving and rejecting club join requests.

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateMemberStatus(
  memberId: string,
  status: "approved" | "rejected",
) {
  const supabase = await createServerSupabaseClient();

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in" };

  // Update the status of the join request
  // RLS policy ensures only the club owner can do this
  const { error } = await supabase
    .from("club_members")
    .update({ status })
    .eq("id", memberId);

  if (error) return { error: error.message };

  // revalidatePath tells Next.js to refresh this page's data
  // without a full browser reload — like a smart cache refresh
  revalidatePath("/dashboard/members");

  return { success: true };
}
