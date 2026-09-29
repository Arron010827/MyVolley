"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to MyVolley 🏐</p>
        </div>

        {/* Quick links grid */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Profile */}
          <Link
            href="/profile"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">👤 My Profile</p>
            <p className="text-sm text-gray-500 mt-1">
              View and edit your player profile
            </p>
          </Link>

          {/* Clubs */}
          <Link
            href="/clubs"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">
              🏐 Browse Clubs
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Find and join volleyball clubs in Malaysia
            </p>
          </Link>

          {/* Register club */}
          <Link
            href="/clubs/register"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">
              ➕ Register a Club
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Submit your club for approval
            </p>
          </Link>

          {/* Member requests */}
          <Link
            href="/dashboard/members"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">
              👥 Member Requests
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Manage join requests for your clubs
            </p>
          </Link>

          {/* Events */}
          <Link
            href="/events"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">
              🏆 Browse Events
            </p>
            <p className="text-sm text-gray-500 mt-1">
              View upcoming tournaments and leagues
            </p>
          </Link>

          {/* Admin — event management */}
          <Link
            href="/dashboard/events"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">
              ⚙️ Event Management
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Post and approve events (admin only)
            </p>
          </Link>

          <Link
            href="/dashboard/streams"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <p className="text-lg font-semibold text-gray-900">
              📺 Stream Management
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Add and manage live streams (admin only)
            </p>
          </Link>

          <Link
            href="/dashboard/club-events"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              🔗 Club — Event Assignments
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Assign clubs to their events (admin only)
            </p>
          </Link>

          <Link
            href="/dashboard/event-organisers"
            className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 hover:shadow-md hover:scale-[1.01] transition-all duration-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              👤 Event Organisers
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Assign organisers to manage events
            </p>
          </Link>
        </div>

        {/* Log out button */}
        <button
          onClick={handleLogOut}
          disabled={loading}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? "Logging out..." : "Log Out"}
        </button>
      </div>
    </div>
  );
}
