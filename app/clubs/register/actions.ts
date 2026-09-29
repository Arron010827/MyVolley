"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function toTitleCase(str: string): string {
  return str
    .toLowerCase() // first lowercase everything
    .split(" ") // split into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // capitalise first letter of each word
    .join(" ") // rejoin into a string
    .trim(); // remove leading/trailing spaces
}

export async function createClub(formData: FormData) {
  // ✅ FormData not plain object
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ✅ Use .get() instead of formData.name, formData.state etc.
  const name = formData.get("club_name") as string;
  const state = formData.get("state") as string;
  const district = formData.get("district") as string;
  const address = (formData.get("address") as string) || null;
  const experienceLevel = formData.get("experience_level") as string;
  const description = (formData.get("description") as string) || null;
  const contactEmail = (formData.get("contact_email") as string) || null;
  const latRaw = formData.get("latitude") as string;
  const lngRaw = formData.get("longitude") as string;

  const latitude = latRaw ? parseFloat(latRaw) : null;
  const longitude = lngRaw ? parseFloat(lngRaw) : null;

  let finalLat = latitude;
  let finalLng = longitude;

  if (!finalLat && !finalLng && district) {
    const geocoded = await geocodeDistrict(district, state);
    if (geocoded) {
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }
  }

  const { error } = await supabase.from("clubs").insert({
    club_name: toTitleCase(name).trim(),
    state: state,
    district: toTitleCase(district),
    address: address,
    experience_level: experienceLevel,
    owner_id: user.id,
    contact_email: contactEmail?.trim().toLowerCase() ?? null,
    description: description?.trim() ?? null,
    latitude: finalLat,
    longitude: finalLng,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/clubs");
  redirect("/dashboard");
}

// ─── Geocode a district using Google Maps Geocoding API ──────────────────────
async function geocodeDistrict(
  district: string,
  state: string,
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const query = encodeURIComponent(`${district}, ${state}, Malaysia`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }

    return null;
  } catch {
    return null;
  }
}
