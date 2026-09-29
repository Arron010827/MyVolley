"use client";

// components/JoinClubButton.tsx
// A client component for the "Request to Join" button.
// Extracted into its own file because it needs useState and onClick,
// while the parent clubs page stays as a server component.

import { useState } from "react";
import { requestToJoinClub } from "@/app/clubs/actions";

// Props — data passed into this component from the parent
// Think of it like constructor parameters in Java
interface JoinClubButtonProps {
  clubId: string;
  isLoggedIn: boolean;
}

export default function JoinClubButton({
  clubId,
  isLoggedIn,
}: JoinClubButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleJoin() {
    // If not logged in, redirect to login
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setStatus("idle");

    const result = await requestToJoinClub(clubId);

    setLoading(false);

    if (result?.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("Request sent! The club manager will review your request.");
    }
  }

  // Show success state
  if (status === "success") {
    return (
      <div className="w-full text-center text-sm text-green-600 font-medium py-2">
        ✅ Request sent!
      </div>
    );
  }

  return (
    <div>
      {/* Error message */}
      {status === "error" && (
        <p className="text-xs text-red-500 mb-2 text-center">{message}</p>
      )}

      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full text-sm font-medium text-red-600 border border-red-200 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Sending request..."
          : isLoggedIn
            ? "Request to Join"
            : "Log in to Join"}
      </button>
    </div>
  );
}
