// app/dashboard/members/page.tsx
// Club manager's view — shows all join requests for their clubs.
// Server component that fetches data, with client components for buttons.

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import MemberRequestButton from "@/components/MemberRequestButton";

// Define the shape of the joined profile data
// This tells TypeScript exactly what fields to expect
// from the profiles table join
type RequestWithProfile = {
  id: string;
  status: string;
  created_at: string;
  club_id: string;
  player_id: string;
};

export default async function MembersPage() {
  const supabase = await createServerSupabaseClient();

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all clubs owned by this user
  const { data: ownedClubs } = await supabase
    .from("clubs")
    .select("id, club_name")
    .eq("owner_id", user.id);

  // If they don't own any clubs, show a message
  if (!ownedClubs || ownedClubs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No clubs yet
          </h2>
          <p className="text-gray-500 mb-6">
            {
              "You don't own any clubs yet. Register one to start managing members."
            }
          </p>
          <Link
            href="/clubs/register"
            className="bg-red-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-700 transition-colors"
          >
            Register a Club
          </Link>
        </div>
      </div>
    );
  }

  // Get all club IDs owned by this user
  const clubIds = ownedClubs.map((club) => club.id);

  // Step 1 — Fetch all join requests for owned clubs
  const { data: requests, error } = await supabase
    .from("club_members")
    .select("id, status, created_at, club_id, player_id")
    .in("club_id", clubIds)
    .order("created_at", { ascending: false });

  // Step 2 — Fetch profiles for all players in those requests
  // We collect all player IDs first, then fetch their profiles in one query
  const playerIds = requests?.map((r) => r.player_id) ?? [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, position, experience_level")
    .in("id", playerIds);

  // Helper — get club name from club id
  function getClubName(clubId: string) {
    return (
      ownedClubs?.find((c) => c.id === clubId)?.club_name ?? "Unknown Club"
    );
  }

  // Helper function — get profile for a specific player
  function getProfile(playerId: string) {
    return profiles?.find((p) => p.id === playerId) ?? null;
  }

  // Separate requests by status
  const pendingRequests = requests?.filter((r) => r.status === "pending") ?? [];
  const decidedRequests = requests?.filter((r) => r.status !== "pending") ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Member Requests
          </h1>
          <p className="text-gray-500 mt-1">
            Manage join requests for your clubs
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {"Something went wrong loading requests. Please try again."}
          </div>
        )}

        {/* Pending requests section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 text-sm font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </h2>

          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">
                {"No pending requests — you're all caught up! 🎉"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between gap-4"
                >
                  <div>
                    {/* Player name */}
                    <p className="font-semibold text-gray-900">
                      {getProfile(request.player_id)?.full_name ??
                        "Unknown Player"}
                    </p>
                    {/* Player details */}
                    <div className="flex gap-3 mt-1">
                      {getProfile(request.player_id)?.position && (
                        <span className="text-xs text-gray-500">
                          {getProfile(request.player_id)?.position}
                        </span>
                      )}
                      {getProfile(request.player_id)?.experience_level && (
                        <span className="text-xs text-gray-500">
                          {getProfile(request.player_id)?.experience_level}
                        </span>
                      )}
                    </div>
                    {/* Which club they're requesting to join */}
                    <p className="text-xs text-gray-400 mt-1">
                      → {getClubName(request.club_id)}
                    </p>
                    {/* When they requested */}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(request.created_at).toLocaleDateString(
                        "en-MY",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  {/* Approve/reject buttons */}
                  <MemberRequestButton
                    memberId={request.id}
                    currentStatus={request.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Previous decisions section */}
        {decidedRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Previous Decisions
            </h2>
            <div className="flex flex-col gap-4">
              {decidedRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 opacity-75"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {getProfile(request.player_id)?.full_name ??
                        "Unknown Player"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      → {getClubName(request.club_id)}
                    </p>
                  </div>
                  <MemberRequestButton
                    memberId={request.id}
                    currentStatus={request.status}
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
