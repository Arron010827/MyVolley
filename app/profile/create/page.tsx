"use client";

// app/profile/create/page.tsx
// This page lets a logged-in user create their volleyball player profile.
// It saves the data to the profiles table in Supabase.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { createProfile } from "./actions";

// Fixed options for position dropdown
// Using a const array outside the component so it's not recreated on every render
const POSITIONS = [
  "Setter",
  "Libero",
  "Outside Hitter",
  "Middle Blocker",
  "Opposite Hitter",
  "Defensive Specialist",
];

// All 16 Malaysian states + federal territories
const STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];

const EXPERIENCE_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
];

const DOMINANT_HANDS = ["Right", "Left"];

export default function CreateProfilePage() {
  const router = useRouter();

  // Form field states — one per column in the profiles table
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [state, setState] = useState("");
  const [height, setHeight] = useState("");
  const [dominantHand, setDominantHand] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [spikeHeight, setSpikeHeight] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateProfile() {
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (height && (Number(height) < 100 || Number(height) > 250)) {
      setError("Please enter a valid height between 100cm and 250cm.");
      return;
    }

    if (
      spikeHeight &&
      (Number(spikeHeight) < 150 || Number(spikeHeight) > 400)
    ) {
      setError("Please enter a valid spike height between 150cm and 400cm.");
      return;
    }

    setLoading(true);

    // Call the server action instead of inserting directly from the browser
    const result = await createProfile({
      fullName,
      position,
      state,
      height,
      dominantHand,
      experienceLevel,
      spikeHeight,
    });

    setLoading(false);

    if (result?.error) {
      if (result.code === "23505") {
        setError("You already have a profile. Redirecting...");
        setTimeout(() => router.push("/profile"), 2000);
      } else {
        setError(result.error);
      }
    } else {
      router.push("/profile");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Create your profile
          </h1>
          <p className="text-gray-500 mt-1">
            Tell the volleyball community about yourself
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col gap-6">
            {/* Full Name — required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ahmad Faris"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>

            {/* Position — dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Playing Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
              >
                <option value="">Select a position</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            {/* State — dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
              >
                <option value="">Select a state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Height and Spike Height — side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 185"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spike Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 310"
                  value={spikeHeight}
                  onChange={(e) => setSpikeHeight(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Dominant Hand — dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dominant Hand
              </label>
              <select
                value={dominantHand}
                onChange={(e) => setDominantHand(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
              >
                <option value="">Select dominant hand</option>
                {DOMINANT_HANDS.map((hand) => (
                  <option key={hand} value={hand}>
                    {hand}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Level — dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
              >
                <option value="">Select experience level</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit button */}
            <button
              onClick={handleCreateProfile}
              disabled={loading}
              className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
            >
              {loading ? "Saving profile..." : "Create Profile"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Fields marked with <span className="text-red-500">*</span> are
          required
        </p>
      </div>
    </div>
  );
}
