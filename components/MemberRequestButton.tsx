"use client";

// components/MemberRequestButton.tsx
// Approve and reject buttons for club join requests.
// Extracted as a client component because it needs onClick interactivity.

import { useState } from "react";
import { updateMemberStatus } from "@/app/dashboard/members/actions";

interface MemberRequestButtonProps {
  memberId: string;
  currentStatus: string;
}

export default function MemberRequestButton({
  memberId,
  currentStatus,
}: MemberRequestButtonProps) {
  const [loading, setLoading] = useState<"approving" | "rejecting" | null>(
    null,
  );
  const [status, setStatus] = useState(currentStatus);

  async function handleUpdate(newStatus: "approved" | "rejected") {
    setLoading(newStatus === "approved" ? "approving" : "rejecting");

    const result = await updateMemberStatus(memberId, newStatus);

    setLoading(null);

    if (!result?.error) {
      setStatus(newStatus);
    }
  }

  // Show badge if already approved or rejected
  if (status === "approved") {
    return (
      <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">
        ✅ Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="text-xs font-medium px-3 py-1 rounded-full bg-red-100 text-red-700">
        ❌ Rejected
      </span>
    );
  }

  // Show approve/reject buttons for pending requests
  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleUpdate("approved")}
        disabled={loading !== null}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading === "approving" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={() => handleUpdate("rejected")}
        disabled={loading !== null}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        {loading === "rejecting" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
