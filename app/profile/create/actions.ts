"use server";

// app/profile/create/actions.ts
// Server Actions run on the server, not the browser.
// This means they can read cookies properly and have full auth context.
// Think of them like API endpoints but without needing to create a separate route.

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function createProfile(formData: {
  fullName: string;
  position: string;
  state: string;
  height: string;
  dominantHand: string;
  experienceLevel: string;
  spikeHeight: string;
}) {
  const supabase = await createServerSupabaseClient();

  // Get the logged-in user from the server-side session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Temporary debug — remove after testing
  console.log("User from server action:", user?.id ?? "NO USER FOUND");

  if (!user) {
    redirect("/login");
  }

  // Insert the profile using the server-side client
  // which has proper access to the session cookie
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: formData.fullName.trim(),
    position: formData.position || null,
    state: formData.state || null,
    height: formData.height ? parseInt(formData.height) : null,
    dominant_hand: formData.dominantHand || null,
    experience_level: formData.experienceLevel || null,
    spike_height: formData.spikeHeight ? parseInt(formData.spikeHeight) : null,
  });

  // Temporary debug — remove after testing
  console.log("Insert error:", JSON.stringify(error, null, 2));
  console.log("User ID being inserted:", user.id);

  if (error) {
    // Return the error so the client can display it
    return { error: error.message, code: error.code };
  }

  return { success: true };
}
