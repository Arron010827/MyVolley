import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { assignOrganiser, removeOrganiser } from "./actions";
import AssignOrganiserForm from "@/components/AssignOrganiserForm";

export default async function EventOrganisersPage() {
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

  // Fetch all approved events
  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .eq("status", "approved")
    .order("event_date", { ascending: false });

  // Fetch all profiles (potential organisers)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  // Fetch existing assignments with event + profile names
  const { data: assignmentsRaw } = await supabase
    .from("event_organisers")
    .select("event_id, user_id, assigned_at, events(title)")
    .order("assigned_at", { ascending: false });

  // Get all unique user_ids from assignments
  const userIds = [...new Set((assignmentsRaw ?? []).map((a) => a.user_id))];

  // Fetch matching profiles separately
  const { data: assignedProfiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : { data: [] };

  // Build a lookup map for quick access
  const profileMap = Object.fromEntries(
    (assignedProfiles ?? []).map((p) => [p.id, p.full_name]),
  );

  // Safely extract joined data
  const assignments = (assignmentsRaw ?? []).map((row) => {
    const event = Array.isArray(row.events)
      ? (row.events[0] as { title: string } | undefined)
      : (row.events as { title: string } | null);

    return {
      event_id: row.event_id,
      user_id: row.user_id,
      assigned_at: row.assigned_at,
      event_title: event?.title ?? "—",
      full_name: profileMap[row.user_id] ?? "—",
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
          <h1 className="text-3xl font-bold">Event Organisers</h1>
          <p className="text-gray-400 mt-1">
            Assign users as organisers for specific events
          </p>
        </div>

        {/* Assign form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Assign Organiser</h2>
          <AssignOrganiserForm
            events={events ?? []}
            profiles={profiles ?? []}
          />
        </div>

        {/* Existing assignments */}
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
              <p>No organisers assigned yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {assignments.map((assignment) => (
                <div
                  key={`${assignment.event_id}-${assignment.user_id}`}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {assignment.event_title}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      👤 {assignment.full_name}
                    </p>
                  </div>
                  <p className="text-gray-500 text-xs flex-shrink-0">
                    {new Date(assignment.assigned_at).toLocaleDateString(
                      "en-MY",
                    )}
                  </p>
                  <form
                    action={removeOrganiser.bind(
                      null,
                      assignment.event_id,
                      assignment.user_id,
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
