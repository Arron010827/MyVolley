// app/dashboard/events/page.tsx
// Admin view of all pending club-submitted events.
// Admin can approve or reject them from here.

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import EventApprovalButton from "@/components/EventApprovalButton";

export default async function AdminEventsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 mb-6">
            {"You don't have permission to view this page."}
          </p>
          <Link
            href="/dashboard"
            className="bg-red-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all pending events
  const { data: pendingEvents } = await supabase
    .from("events")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Fetch all approved and rejected events
  const { data: decidedEvents } = await supabase
    .from("events")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">
              Event Management
            </h1>
            <p className="text-gray-500 mt-1">
              Review and approve club-submitted events
            </p>
          </div>
          <Link
            href="/events/submit"
            className="bg-red-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-red-700 transition-colors text-sm"
          >
            + Submit Event
          </Link>
        </div>

        {/* Pending events */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Review
            {pendingEvents && pendingEvents.length > 0 && (
              <span className="ml-2 text-sm font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {pendingEvents.length}
              </span>
            )}
          </h2>

          {!pendingEvents || pendingEvents.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">
                {"No pending events — you're all caught up! 🎉"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        📍 {event.location}, {event.state}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        📅{" "}
                        {new Date(event.event_date).toLocaleDateString(
                          "en-MY",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Type:{" "}
                        {event.type.charAt(0).toUpperCase() +
                          event.type.slice(1)}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <EventApprovalButton
                      eventId={event.id}
                      currentStatus={event.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent decisions */}
        {decidedEvents && decidedEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Decisions
            </h2>
            <div className="flex flex-col gap-4 opacity-75">
              {decidedEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      📍 {event.location}, {event.state}
                    </p>
                  </div>
                  <EventApprovalButton
                    eventId={event.id}
                    currentStatus={event.status}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
