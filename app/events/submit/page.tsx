"use client";

// app/events/create/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvent } from "./actions";
import EventDetailsForm, {  type EventDetails, } from "@/app/events/components/EventDetailsForm";

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

export default function CreateEventPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleCreateEvent(values: EventDetails) {
    setLoading(true);
    setError("");

    try {
      const result = await createEvent(values);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Event posted!
          </h2>
          <p className="text-gray-500 mb-6">
            {"Your event has been submitted for review."}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/events"
              className="bg-red-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-700 transition-colors"
            >
              View Events
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setFormKey((prev) => prev + 1);
              }}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Post Another Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/events"
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            ← Back to Events
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Post an Event
          </h1>
          <p className="text-gray-500 mt-1">
            {"Create a new volleyball event for Malaysia's community"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}
            <EventDetailsForm
              key={formKey}
              initialValues={{
                title: "",
                gender: "",
                type: "",
                eventDate: "",
                endDate: "",
                location: "",
                state: "",
                description: "",
              }}
              submitLabel="Post Event"
              loadingLabel="Posting event..."
              loading={loading}
              error={error}
              onSubmit={handleCreateEvent}
            />

        <p className="text-center text-xs text-gray-400 mt-4">
          Fields marked with <span className="text-red-500">*</span> are
          required
        </p>
      </div>
    </div>
  );
}
