import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ClubRegisterForm from "@/components/ClubRegisterForm";

export default async function RegisterClubPage() {
  const supabase = await createServerSupabaseClient();

  // Must be logged in to register a club
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Register Your Club</h1>
          <p className="text-gray-400 mt-1">
            {"Submit your club for review — we'll approve it within 24 hours"}
          </p>
        </div>

        {/* Load Google Maps script with Places library */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initAutocomplete`}
          async
          defer
        />

        {/* Registration form */}
        <ClubRegisterForm />
      </div>
    </main>
  );
}
