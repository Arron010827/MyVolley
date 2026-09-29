import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StreamCreateForm from "./StreamCreateForm";

export default async function CreateStreamPage() {
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

  if (!profile?.is_admin) redirect("/dashboard");

  // Fetch data for dropdowns
  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .order("event_date", { ascending: false });

  const { data: matches } = await supabase
    .from("event_matches")
    .select(
      `
      id, match_number, round, group_name, event_id,
      home_club:home_club_id(club_name),
      away_club:away_club_id(club_name)
    `,
    )
    .order("match_number", { ascending: true });

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/streams"
            className="text-red-400 hover:text-red-300 text-sm mb-4 inline-block"
          >
            ← Back to streams
          </Link>
          <h1 className="text-3xl font-bold">Add New Stream</h1>
          <p className="text-gray-400 mt-1">
            Add a YouTube live stream or highlight video
          </p>
        </div>

        <StreamCreateForm events={events ?? []} matches={matches ?? []} />
      </div>
    </main>
  );
}
