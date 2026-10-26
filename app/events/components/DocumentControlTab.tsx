
"use client";

import { useState, useTransition } from "react";
import {
  addEventDocument,
  updateEventDocument,
  deleteEventDocument,
  reorderEventDocument,
} from "../[eventId]/manage/actions";

type EventDocument = {
  id: string;
  event_id: string;
  document_name: string;
  document_url: string;
  display_order: number;
  created_at: string;
};

type Props = {
  eventId: string;
  documents: EventDocument[];
};

export default function DocumentControlTab({
  eventId,
  documents,
}: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isValidUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:"
      );
    } catch {
      return false;
    }
  };

  function resetForm() {
    setName("");
    setUrl("");
    setEditingId(null);
    setError("");
  }

  function handleSubmit() {
    setError("");

    if (!name.trim()) {
      setError("Please enter a document name.");
      return;
    }

    if (!isValidUrl(url.trim())) {
      setError("Enter a valid URL starting with http:// or https://.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateEventDocument(
            eventId,
            editingId,
            name,
            url
          );
        } else {
          await addEventDocument(eventId, name, url);
        }

        resetForm();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to save the document."
        );
      }
    });
  }

  function handleEdit(document: EventDocument) {
    setEditingId(document.id);
    setName(document.document_name);
    setUrl(document.document_url);
    setError("");
  }

  function handleDelete(document: EventDocument) {
    const confirmed = window.confirm(
      `Delete "${document.document_name}"?`
    );

    if (!confirmed) return;

    setError("");

    startTransition(async () => {
      try {
        await deleteEventDocument(eventId, document.id);

        if (editingId === document.id) {
          resetForm();
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to delete the document."
        );
      }
    });
  }

  function handleReorder(
    document: EventDocument,
    direction: "up" | "down"
  ) {
    setError("");

    startTransition(async () => {
      try {
        await reorderEventDocument(
          eventId,
          document.id,
          direction
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to reorder the document."
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">
          Document Control
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Add links to event rules, schedules, registration forms,
          and other important documents. Their order determines
          how they appear on the public event page.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-medium">
          {editingId ? "Edit document" : "Add a document"}
        </h3>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="document-name"
              className="mb-1 block text-sm font-medium"
            >
              Display name
            </label>
            <input
              id="document-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rules & Regulations"
              maxLength={150}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="document-url"
              className="mb-1 block text-sm font-medium"
            >
              Document URL
            </label>
            <input
              id="document-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {url.trim() && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="mb-2 text-sm font-medium">
                Link preview
              </p>

              {isValidUrl(url.trim()) ? (
                <a
                  href={url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm text-blue-600 underline"
                >
                  {url.trim()} ↗
                </a>
              ) : (
                <p className="text-sm text-gray-500">
                  Enter a valid HTTP or HTTPS URL to preview it.
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {isPending
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Add document"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2"
              >
                Cancel edit
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">
          Saved documents ({documents.length})
        </h3>

        {documents.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No documents have been added yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {documents.map((document, index) => (
              <article
                key={document.id}
                className="flex min-w-0 flex-col rounded-xl border border-gray-200 p-3"
              >
                <p className="mb-2 text-xs text-gray-500">
                  Position {index + 1}
                </p>

                <h4 className="break-words font-medium">
                  {document.document_name}
                </h4>

                <a
                  href={document.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 break-all text-sm text-blue-600 underline"
                >
                  Open document ↗
                </a>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => handleReorder(document, "up")}
                    disabled={isPending || index === 0}
                    aria-label={`Move ${document.document_name} up`}
                    className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReorder(document, "down")}
                    disabled={
                      isPending || index === documents.length - 1
                    }
                    aria-label={`Move ${document.document_name} down`}
                    className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(document)}
                    disabled={isPending}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(document)}
                    disabled={isPending}
                    className="rounded border border-red-200 px-2 py-1 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
