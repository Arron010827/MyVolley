
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

  entryFee: string;
  teamSize: string;
  teamCapacity: string;
  competitionFormat: string;
  netHeight: string;
  winningPoints: string;
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
  const [entryFee, setEntryFee] = useState(
    initialValues.entryFee ?? "",
  );
  const [teamSize, setTeamSize] = useState(
    initialValues.teamSize ?? "",
  );
  const [teamCapacity, setTeamCapacity] = useState(
    initialValues.teamCapacity ?? "",
  );
  const [competitionFormat, setCompetitionFormat] = useState(
    initialValues.competitionFormat ?? "",
  );
  const [netHeight, setNetHeight] = useState(
    initialValues.netHeight ?? "",
  );
  const [customNetHeight, setCustomNetHeight] = useState("");
  const [winningPoints, setWinningPoints] = useState(
    initialValues.winningPoints ?? "",
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

    if (entryFee && Number(entryFee) < 0) {
      setValidationError("Entry fee cannot be negative.");
      return;
    }

    if (
      (teamSize && (!Number.isInteger(Number(teamSize)) || Number(teamSize) <= 0)) ||
      (teamCapacity && (!Number.isInteger(Number(teamCapacity)) || Number(teamCapacity) <= 0))
    ) {
      setValidationError("Team size and capacity must be positive whole numbers.");
      return;
    }

    if (
      entryFee && !Number.isFinite(Number(entryFee))
    ) {
      setValidationError("Please enter a valid entry fee.");
      return;
    }

    if (
      netHeight === "other" &&
      (!Number.isInteger(Number(customNetHeight)) || Number(customNetHeight) <= 0)
    ) {
      setValidationError("Please enter a valid custom net height.");
      return;
    }

    const finalNetHeight =
      netHeight === "other" ? customNetHeight : netHeight;

    if (winningPoints && !["25", "31"].includes(winningPoints)) {
      setValidationError("Please select valid winning points.");
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
      entryFee,
      teamSize,
      teamCapacity,
      competitionFormat,
      netHeight: finalNetHeight,
      winningPoints,
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

        {/* Competition Details */}
        <div className="border-t border-[var(--form-border)] pt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold">
              Competition Details
            </h3>
            <p className="text-sm text-[var(--form-placeholder)] mt-1">
              Provide registration and competition information.
            </p>
          </div>

          {/* Entry Fee */}
          <div>
            <label className={labelClass}>
              Entry Fee (RM)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 150.00 (leave blank if free)"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </div>

          {/* Team Size and Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Maximum Players per Team
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 12"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelClass}>
                Maximum Team Capacity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 16"
                value={teamCapacity}
                onChange={(e) => setTeamCapacity(e.target.value)}
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          {/* Competition Format */}
          <div>
            <label className={labelClass}>
              Competition Format
            </label>
            <select
              value={competitionFormat}
              onChange={(e) => setCompetitionFormat(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="">Select competition format</option>
              <option value="single_elimination_first_round">
                Single Elimination from First Round
              </option>
              <option value="group_stage_single_elimination_second_round">
                Group Stage followed by Single Elimination
              </option>
            </select>
          </div>

          {/* Net Height and Winning Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Net Height (cm)
              </label>
              <select
                value={netHeight}
                onChange={(e) => setNetHeight(e.target.value)}
                className={inputClass}
                disabled={loading}
              >
                <option value="">Select net height</option>
                <option value="243">243 cm</option>
                <option value="233">233 cm</option>
                <option value="224">224 cm</option>
                <option value="other">Other</option>
              </select>

              {netHeight === "other" && (
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter net height in cm"
                  value={customNetHeight}
                  onChange={(e) => setCustomNetHeight(e.target.value)}
                  className={`${inputClass} mt-2`}
                  disabled={loading}
                />
              )}
            </div>

            <div>
              <label className={labelClass}>
                Winning Points
              </label>
              <select
                value={winningPoints}
                onChange={(e) => setWinningPoints(e.target.value)}
                className={inputClass}
                disabled={loading}
              >
                <option value="">Select winning points</option>
                <option value="25">25 Points</option>
                <option value="31">31 Points</option>
              </select>
            </div>
          </div>
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
