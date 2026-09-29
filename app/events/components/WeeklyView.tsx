"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Event } from "./EventsPageClient";

const DAYS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TYPE_COLORS: Record<string, string> = {
  tournament: "bg-orange-900/50 border-orange-700 text-orange-300",
  league: "bg-blue-900/50 border-blue-700 text-blue-300",
};

const TYPE_LABELS: Record<string, string> = {
  tournament: "🏆 Tournament",
  league: "🏅 League",
};

const GENDER_LABELS: Record<string, string> = {
  men: "👨 Men",
  women: "👩 Women",
  mix: "🤝 Mixed",
};

interface Props {
  events: Event[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

// ─── Helper: format date as "4 August" ──────────────────────────────────────────
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "long" });
}

// ─── Helper: format date range for button "4 Aug – 10 Aug" ─────────────────────────
function formatWeekRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
  const endStr = end.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
  return `${startStr} – ${endStr}`;
}

// ─── Helper: check if event is active on a given date ────────────────────────
function isEventOnDate(event: Event, date: Date): boolean {
  const start = new Date(event.event_date);
  const end = event.end_date
    ? new Date(event.end_date)
    : new Date(event.event_date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d >= start && d <= end;
}

export default function WeeklyView({
  events,
  weekStart,
  onPrevWeek,
  onNextWeek,
}: Props) {
  const [genderFilter, setGenderFilter] = useState<
    "all" | "men" | "women" | "mix"
  >("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "tournament" | "league">(
    "all",
  );

  // Week end = Sunday (6 days after Monday)
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Previous and next week ranges for buttons
  const prevWeekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 1);
    return d;
  }, [weekStart]);

  const prevWeekStart = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    return d;
  }, [weekStart]);

  const nextWeekStart = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const nextWeekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 13);
    return d;
  }, [weekStart]);

  // Build array of 7 days for this week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Filter events based on gender + type filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesGender =
        genderFilter === "all" || event.gender === genderFilter;
      const matchesType = typeFilter === "all" || event.type === typeFilter;
      return matchesGender && matchesType;
    });
  }, [events, genderFilter, typeFilter]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-gray-800">
        {/* Left: gender filter buttons */}
        <div className="flex items-center gap-2">
          {(["all", "men", "women", "mix"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                genderFilter === g
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {g === "all" ? "🏐 All" : GENDER_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Right: week navigation + type filter */}
        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={onPrevWeek}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              ◀
            </button>
            <span className="text-gray-300 font-medium w-36 text-center">
              {formatWeekRange(weekStart, weekEnd)}
            </span>
            <button
              onClick={onNextWeek}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              ▶
            </button>
          </div>

          {/* Type filter dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Types</option>
            <option value="tournament">🏆 Tournament</option>
            <option value="league">🏅 League</option>
          </select>
        </div>
      </div>

      {/* ── Weekly days ─────────────────────────────────────────────────── */}
      <div className="divide-y divide-gray-800">
        {weekDays.map((date, index) => {
          const dayEvents = filteredEvents.filter((e) =>
            isEventOnDate(e, date),
          );
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={index} className="px-6 py-4">
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`text-md font-semibold ${isToday ? "text-red-400" : "text-gray-300"}`}
                >
                  {formatShortDate(date)}
                </div>
                <div
                  className={`text-xs ${isToday ? "text-red-400" : "text-gray-500"}`}
                >
                  {DAYS_FULL[index]}
                </div>
                {isToday && (
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>

              {/* Events for this day */}
              {dayEvents.length === 0 ? (
                <p className="text-gray-600 text-xs italic pl-1">No events</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border transition-colors ${
                        TYPE_COLORS[event.type] ??
                        "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                    >
                      {/* Left: title + location */}
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          📍 {event.location}, {event.state}
                        </p>
                      </div>

                      {/* Right: type + gender badges */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs opacity-80">
                          {TYPE_LABELS[event.type]}
                        </span>
                        <span className="text-xs opacity-60">
                          {GENDER_LABELS[event.gender] ?? event.gender}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom week navigation ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
        <button
          onClick={onPrevWeek}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
        >
          ◀ {formatWeekRange(prevWeekStart, prevWeekEnd)}
        </button>
        <button
          onClick={onNextWeek}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
        >
          {formatWeekRange(nextWeekStart, nextWeekEnd)} ▶
        </button>
      </div>
    </div>
  );
}
