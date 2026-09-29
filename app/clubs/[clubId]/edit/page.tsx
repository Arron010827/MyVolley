import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import EditClubForm from "@/components/EditClubForm";

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { clubId } = await params;

  // Must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the club
  const { data: club } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single();

  if (!club) notFound();

  // Only owner can access this page
  if (club.owner_id !== user.id) redirect(`/clubs/${clubId}`);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/clubs/${clubId}`}
            className="text-red-400 hover:text-red-300 text-sm mb-4 inline-block"
          >
            ← Back to club page
          </Link>
          <h1 className="text-3xl font-bold">Edit Club</h1>
          <p className="text-gray-400 mt-1">
            {"Update your club's information and social links"}
          </p>
        </div>

        {/* Google Maps script for address autocomplete */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initAutocomplete`}
          async
          defer
        />

        {/* Edit form — client component handles all interactivity */}
        <EditClubForm club={club} />
      </div>
    </main>
  );
}
