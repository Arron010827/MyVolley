"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

export async function updateClub(clubId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient();

  // Verify the user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the club to verify ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("owner_id")
    .eq("id", clubId)
    .single();

  // Only the owner can edit — redirect if not owner
  if (!club || club.owner_id !== user.id) redirect(`/clubs/${clubId}`);

  // Extract form fields
  const club_name = formData.get("club_name") as string;
  const district = formData.get("district") as string;
  const description = (formData.get("description") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;
  const address = (formData.get("address") as string) || null;
  const facebook_url = (formData.get("facebook_url") as string) || null;
  const instagram_url = (formData.get("instagram_url") as string) || null;
  const rednote_url = (formData.get("rednote_url") as string) || null;
  const youtube_url = (formData.get("youtube_url") as string) || null;
  const x_url = (formData.get("x_url") as string) || null;
  const logo_url = (formData.get("logo_url") as string) || null;

  // Parse coordinates if address was updated via autocomplete
  const latRaw = formData.get("latitude") as string;
  const lngRaw = formData.get("longitude") as string;
  const latitude = latRaw ? parseFloat(latRaw) : null;
  const longitude = lngRaw ? parseFloat(lngRaw) : null;

  const { error } = await supabase
    .from("clubs")
    .update({
      club_name: toTitleCase(club_name),
      district: toTitleCase(district),
      description,
      contact_email: contact_email?.trim().toLowerCase() ?? null,
      address,
      latitude,
      longitude,
      logo_url, // ← add this line
      facebook_url: facebook_url || null,
      instagram_url: instagram_url || null,
      rednote_url: rednote_url || null,
      youtube_url: youtube_url || null,
      x_url: x_url || null,
    })
    .eq("id", clubId);

  if (error) throw new Error(error.message);

  revalidatePath(`/clubs/${clubId}`);
  redirect(`/clubs/${clubId}`);
}
