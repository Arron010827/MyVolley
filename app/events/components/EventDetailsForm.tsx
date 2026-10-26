
"use client";

import { useState } from "react";

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

export interface EventDetails {
  title: string;
  gender: string;
  type: string;
  eventDate: string;
  endDate: string;
  location: string;
  state: string;
  description: string;
}

interface EventDetailsFormProps {
  initialValues: EventDetails;
  submitLabel: string;
  loadingLabel: string;
  loading?: boolean;
  error?: string;
  onSubmit: (values: EventDetails) => void | Promise<void>;
}

export default function EventDetailsForm({
  initialValues,
  submitLabel,
  loadingLabel,
  loading = false,
  error = "",
  onSubmit,
}: EventDetailsFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [gender, setGender] = useState(initialValues.gender);
  const [type, setType] = useState(initialValues.type);
  const [eventDate, setEventDate] = useState(initialValues.eventDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [location, setLocation] = useState(initialValues.location);
  const [state, setState] = useState(initialValues.state);
  const [description, setDescription] = useState(
    initialValues.description,
  );
  const [validationError, setValidationError] = useState("");

  async function handleSubmit() {
    setValidationError("");

    if (!title.trim()) {
      setValidationError("Event title is required.");
      return;
    }

    if (!gender) {
      setValidationError("Please select a gender type.");
      return;
    }

    if (!eventDate) {
      setValidationError("Event date is required.");
      return;
    }

    if (!location.trim()) {
      setValidationError("Location is required.");
      return;
    }

    if (!state) {
      setValidationError("Please select a state.");
      return;
    }

    if (!type) {
      setValidationError("Please select an event type.");
      return;
    }

    if (endDate && endDate < eventDate) {
      setValidationError(
        "End date cannot be before the start date.",
      );
      return;
    }

    await onSubmit({
      title: title.trim(),
      gender,
      type,
      eventDate,
      endDate,
      location: location.trim(),
      state,
      description,
    });
  }

 const inputClass =
  "w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-[var(--form-input-bg)] border-[var(--form-border)] text-[var(--form-text)] placeholder:text-[var(--form-placeholder)]";
 const labelClass =
  "block text-sm font-medium mb-1 text-[var(--form-label)]";

  return (
    <div className="rounded-2xl shadow-sm border p-8 bg-[var(--form-bg)] border-[var(--form-border)] text-[var(--form-text)]">
      <div className="flex flex-col gap-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {validationError}
          </div>
        )}

        <div>
          <label className={labelClass}>
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. KL Open Volleyball Championship 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div>
          <label className={labelClass}>
            Gender Category <span className="text-red-500">*</span>
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select gender type</option>
            <option value="mix">Mixed</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Event Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select event type</option>
            <option value="tournament">🏆 Tournament</option>
            <option value="league">🏅 League</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </div>

          <div>
            <label className={labelClass}>
              End Date
              <span className="text-gray-400 font-normal ml-1">
                (optional)
              </span>
            </label>
            <input
              type="date"
              value={endDate}
              min={eventDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Axiata Arena, Bukit Jalil"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div>
          <label className={labelClass}>
            State <span className="text-red-500">*</span>
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select a state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Description
            <span className="text-gray-400 font-normal ml-1">
              (optional)
            </span>
          </label>
          <textarea
            placeholder="Tell participants about the event — format, registration details, prizes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${inputClass} resize-none`}
            disabled={loading}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2"
        >
          {loading ? loadingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
