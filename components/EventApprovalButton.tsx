"use client";

// components/EventApprovalButton.tsx
// Approve and reject buttons for pending events — admin only.

import { useState } from "react";
import { approveEvent, rejectEvent } from "@/app/events/submit/actions";

interface EventApprovalButtonProps {
  eventId: string;
  currentStatus: string;
}

export default function EventApprovalButton({
  eventId,
  currentStatus,
}: EventApprovalButtonProps) {
  const [loading, setLoading] = useState<"approving" | "rejecting" | null>(
    null,
  );
  const [status, setStatus] = useState(currentStatus);

  async function handleApprove() {
    setLoading("approving");
    const result = await approveEvent(eventId);
    setLoading(null);
    if (!result?.error) setStatus("approved");
  }

  async function handleReject() {
    setLoading("rejecting");
    const result = await rejectEvent(eventId);
    setLoading(null);
    if (!result?.error) setStatus("rejected");
  }

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

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading === "approving" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        {loading === "rejecting" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
