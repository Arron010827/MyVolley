
"use client";

import { useState } from "react";
import { saveRulesUrl } from "@/app/events/[eventId]/manage/actions";

interface Props {
  eventId: string;
  initialUrl: string | null;
}

export default function RulesUrlManager({
  eventId,
  initialUrl,
}: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setMessage("");
    setIsSaving(true);

    try {
      await saveRulesUrl(eventId, url);
      setMessage("Rules & Regulations URL saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save the URL. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold text-white">
        Rules & Regulations
      </h2>

      <p className="mt-1 text-sm text-gray-400">
        Add a link to the event rules document, such as a Google Doc.
        Leave the field empty and save to remove the public link.
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <label
          htmlFor="rules-url"
          className="block text-sm font-medium text-gray-300"
        >
          Document URL
        </label>

        <input
          id="rules-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://docs.google.com/document/d/..."
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
        />

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Rules URL"}
        </button>

        {message && (
          <p
            role="status"
            className={`text-sm ${
              message.includes("successfully")
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </form>

      {url.trim() && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-red-400 hover:text-red-300"
        >
          Preview current link ↗
        </a>
      )}
    </section>
  );
}
