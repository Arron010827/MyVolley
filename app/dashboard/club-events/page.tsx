import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { addClubToEvent, removeClubFromEvent } from "./actions";

export default async function ClubEventsPage() {
  const supabase = await createServerSupabaseClient();

  // Gate: admins only
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

  // Fetch all approved clubs
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, club_name, state")
    .eq("status", "approved")
    .order("club_name", { ascending: true });

  // Fetch all approved events
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, type")
    .eq("status", "approved")
    .order("event_date", { ascending: false });

  // Fetch all existing club-event assignments with club + event names
  const { data: assignmentsRaw } = await supabase
    .from("club_events")
    .select("club_id, event_id, joined_at, clubs(club_name), events(title)")
    .order("joined_at", { ascending: false });

  // Safely extract joined data using Array.isArray pattern
  const assignments = (assignmentsRaw ?? []).map((row) => {
    const club = Array.isArray(row.clubs)
      ? (row.clubs[0] as { club_name: string } | undefined)
      : (row.clubs as { club_name: string } | null);

    const event = Array.isArray(row.events)
      ? (row.events[0] as { title: string } | undefined)
      : (row.events as { title: string } | null);

    return {
      club_id: row.club_id,
      event_id: row.event_id,
      joined_at: row.joined_at,
      club_name: club?.club_name ?? "—",
      event_title: event?.title ?? "—",
    };
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-red-400 hover:text-red-300 text-sm mb-4 inline-block"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold">Club — Event Assignments</h1>
          <p className="text-gray-400 mt-1">
            Assign clubs to events they are participating in
          </p>
        </div>

        {/* Add assignment form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Assignment</h2>

          <form
            action={addClubToEvent}
            className="flex flex-col sm:flex-row gap-4"
          >
            {/* Event dropdown */}
            <select
              name="event_id"
              required
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            >
              <option value="">— Select an event —</option>
              {events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            {/* Club dropdown */}
            <select
              name="club_id"
              required
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            >
              <option value="">— Select a club —</option>
              {clubs?.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.club_name} ({club.state})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex-shrink-0"
            >
              Add
            </button>
          </form>
        </div>

        {/* Existing assignments list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold">
              Current Assignments
              <span className="ml-2 text-sm text-gray-500 font-normal">
                {assignments.length} total
              </span>
            </h2>
          </div>

          {assignments.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p>No assignments yet</p>
              <p className="text-sm mt-1">
                Use the form above to assign clubs to events
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {assignments.map((assignment) => (
                <div
                  key={`${assignment.club_id}-${assignment.event_id}`}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  {/* Club name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {assignment.club_name}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {assignment.event_title}
                    </p>
                  </div>

                  {/* Joined date */}
                  <p className="text-gray-500 text-xs flex-shrink-0">
                    {new Date(assignment.joined_at).toLocaleDateString("en-MY")}
                  </p>

                  {/* Remove button */}
                  <form
                    action={removeClubFromEvent.bind(
                      null,
                      assignment.club_id,
                      assignment.event_id,
                    )}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
