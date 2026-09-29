"use client";

import { useState } from "react";
import { assignOrganiser } from "@/app/dashboard/event-organisers/actions";

interface Props {
  events: { id: string; title: string }[];
  profiles: { id: string; full_name: string }[];
}

export default function AssignOrganiserForm({ events, profiles }: Props) {
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await assignOrganiser(formData);

    setLoading(false);

    if (result?.alreadyAssigned) {
      setMessage({
        text: "This user is already assigned as organiser for this event.",
        type: "error",
      });
    } else {
      setMessage({ text: "Organiser assigned successfully!", type: "success" });
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        {/* Event dropdown */}
        <select
          name="event_id"
          required
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
        >
          <option value="">— Select an event —</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>

        {/* User dropdown */}
        <select
          name="user_id"
          required
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
        >
          <option value="">— Select a user —</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Assign"}
        </button>
      </form>

      {/* Feedback message */}
      {message && (
        <div
          className={`mt-3 text-sm px-4 py-3 rounded-lg ${
            message.type === "error"
              ? "bg-red-900/40 border border-red-700 text-red-300"
              : "bg-green-900/40 border border-green-700 text-green-300"
          }`}
        >
          {message.type === "error" ? "⚠️" : "✓"} {message.text}
        </div>
      )}
    </div>
  );
}
