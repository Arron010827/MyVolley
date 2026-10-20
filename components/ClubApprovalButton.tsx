
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveClub,
  rejectClub,
} from "@/app/dashboard/clubs/actions";

interface ClubApprovalButtonProps {
  clubId: string;
  currentStatus: string;
}

export default function ClubApprovalButton({
  clubId,
  currentStatus,
}: ClubApprovalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<
    "approving" | "rejecting" | null
  >(null);
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState("");

  async function handleDecision(
    decision: "approved" | "rejected",
  ) {
    setLoading(decision === "approved" ? "approving" : "rejecting");
    setError("");

    try {
      const result =
        decision === "approved"
          ? await approveClub(clubId)
          : await rejectClub(clubId);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.success) {
        setStatus(decision);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "approved") {
    return (
      <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-red-100 text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleDecision("approved")}
          disabled={loading !== null}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === "approving" ? "Approving..." : "Approve"}
        </button>

        <button
          type="button"
          onClick={() => handleDecision("rejected")}
          disabled={loading !== null}
          className="text-xs font-medium px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          {loading === "rejecting" ? "Rejecting..." : "Reject"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600 max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
