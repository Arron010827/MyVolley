// app/profile/page.tsx
// This is a SERVER COMPONENT — no "use client" needed.
// It fetches the logged-in user's profile on the server
// and displays it. If no profile exists, it prompts them to create one.

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Position badge colours — maps each position to a Tailwind colour
const POSITION_COLORS: Record<string, string> = {
  Setter: "bg-blue-100 text-blue-700",
  Libero: "bg-green-100 text-green-700",
  "Outside Hitter": "bg-red-100 text-red-700",
  "Middle Blocker": "bg-purple-100 text-purple-700",
  "Opposite Hitter": "bg-orange-100 text-orange-700",
  "Defensive Specialist": "bg-yellow-100 text-yellow-700",
};

// Experience level badge colours
const EXPERIENCE_COLORS: Record<string, string> = {
  Beginner: "bg-gray-100 text-gray-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-red-100 text-red-700",
  Professional: "bg-yellow-100 text-yellow-800",
};

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();

  // Get the logged-in user — redirect to login if not logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the user's profile from the profiles table
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id) // only fetch the row where id matches the logged-in user
    .single(); // .single() returns one object instead of an array

  // If no profile exists yet, show a prompt to create one
  if (!profile || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No profile yet
          </h2>
          <p className="text-gray-500 mb-6">
            Create your player profile to join the MyVolley community.
          </p>
          <Link
            href="/profile/create"
            className="bg-red-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-700 transition-colors"
          >
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/profile/edit"
            className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Profile header — name and badges */}
          <div className="bg-gradient-to-br from-red-600 to-red-800 px-8 py-10 text-white">
            <div className="flex items-start justify-between">
              <div>
                {/* Avatar — just initials for now */}
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                {profile.state && (
                  <p className="text-red-200 mt-1">📍 {profile.state}</p>
                )}
              </div>

              {/* Position badge */}
              {profile.position && (
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${POSITION_COLORS[profile.position] ?? "bg-white/20 text-white"}`}
                >
                  {profile.position}
                </span>
              )}
            </div>
          </div>

          {/* Profile details */}
          <div className="px-8 py-8">
            {/* Experience level */}
            {profile.experience_level && (
              <div className="mb-6">
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${EXPERIENCE_COLORS[profile.experience_level] ?? "bg-gray-100 text-gray-700"}`}
                >
                  {profile.experience_level}
                </span>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-6">
              {profile.height && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Height
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.height}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      cm
                    </span>
                  </p>
                </div>
              )}

              {profile.spike_height && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Spike Height
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.spike_height}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      cm
                    </span>
                  </p>
                </div>
              )}

              {profile.dominant_hand && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Dominant Hand
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {profile.dominant_hand}
                  </p>
                </div>
              )}

              {/* Member since */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Member Since
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString("en-MY", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email section — shown separately since it comes from auth, not profiles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 mt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Email Address
          </p>
          <p className="text-gray-900 font-medium">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
