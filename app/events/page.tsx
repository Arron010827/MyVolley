import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import EventsPageClient from "./components/EventsPageClient";

export default async function EventsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "approved")
    .order("event_date", { ascending: true });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Page header */}
      <div className="bg-gradient-to-b from-red-950 to-gray-950 px-4 py-12">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Events & Leagues</h1>
            <p className="text-gray-400 mt-1">
              Volleyball events across Malaysia
            </p>
          </div>
          <Link
            href="/events/submit"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            + Submit Event
          </Link>
        </div>
      </div>

      {/* Client component handles all interactivity */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EventsPageClient events={events ?? []} />
      </div>
    </main>
  );
}
