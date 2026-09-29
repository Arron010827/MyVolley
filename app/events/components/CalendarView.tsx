"use client";

import Link from "next/link";
import { Event } from "./EventsPageClient";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_COLORS: Record<string, string> = {
  tournament: "bg-orange-600 hover:bg-orange-500",
  league: "bg-blue-600 hover:bg-blue-500",
};

interface Props {
  events: Event[];
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

// ─── Get all days shown in calendar grid ─────────────────────────────────────
function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDay = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDay.setDate(startDay.getDate() + diff);

  const endDay = new Date(lastDay);
  const lastDayOfWeek = lastDay.getDay();
  const endDiff = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  endDay.setDate(endDay.getDate() + endDiff);

  const days: Date[] = [];
  const current = new Date(startDay);
  while (current <= endDay) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ─── Split calendar days into weeks ──────────────────────────────────────────
function getWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// ─── Clamp date within a range ───────────────────────────────────────────────
function clamp(date: Date, min: Date, max: Date): Date {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

// ─── Calculate event bars for a single week row ───────────────────────────────
// Returns bar segments to render as overlays
interface EventBar {
  event: Event;
  colStart: number; // 0-6 (Mon-Sun)
  colSpan: number; // how many columns wide
  row: number; // vertical stacking row (0, 1, 2...)
}

function getBarsForWeek(week: Date[], events: Event[]): EventBar[] {
  const weekStart = new Date(week[0]);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(week[6]);
  weekEnd.setHours(23, 59, 59, 999);

  // Find events that overlap with this week
  const weekEvents = events.filter((event) => {
    const start = new Date(event.event_date);
    start.setHours(0, 0, 0, 0);
    const end = event.end_date
      ? new Date(event.end_date)
      : new Date(event.event_date);
    end.setHours(23, 59, 59, 999);
    return start <= weekEnd && end >= weekStart;
  });

  // Sort by start date so earlier events get lower rows
  weekEvents.sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );

  const bars: EventBar[] = [];
  const rowOccupied: number[][] = Array.from({ length: 7 }, () => []);

  weekEvents.forEach((event) => {
    const start = new Date(event.event_date);
    start.setHours(0, 0, 0, 0);
    const end = event.end_date
      ? new Date(event.end_date)
      : new Date(event.event_date);
    end.setHours(0, 0, 0, 0);

    // Clamp to this week
    const clampedStart = clamp(start, weekStart, weekEnd);
    const clampedEnd = clamp(end, weekStart, weekEnd);

    // Calculate column positions (0=Mon, 6=Sun)
    const colStart = Math.round(
      (clampedStart.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const colEnd = Math.min(
      Math.round(
        (clampedEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
      ),
      6, // ← never exceed Sunday
    );
    const colSpan = colEnd - colStart + 1;

    // Find the first available row that doesn't conflict
    let row = 0;
    while (true) {
      const conflict = bars.some(
        (b) =>
          b.row === row &&
          !(
            b.colStart + b.colSpan <= colStart ||
            colStart + colSpan <= b.colStart
          ),
      );
      if (!conflict) break;
      row++;
    }

    bars.push({ event, colStart, colSpan, row });
  });

  return bars;
}

export default function CalendarView({
  events,
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onYearChange,
}: Props) {
  const days = getCalendarDays(currentYear, currentMonth);
  const weeks = getWeeks(days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYearNow = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYearNow - 5 + i);

  // Calculate max bars in any week to size row height
  const BAR_HEIGHT = 22; // px per bar
  const DATE_HEIGHT = 28; // px for date number row
  const BAR_GAP = 2; // px between bars
  const MIN_HEIGHT = 100; // px minimum row height regardless of events

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevMonth}
            className="text-gray-400 hover:text-white p-1"
          >
            ◀
          </button>
          <h2 className="text-lg font-semibold w-44 text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={onNextMonth}
            className="text-gray-400 hover:text-white p-1"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currentMonth}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500"
          >
            {MONTHS.map((month, i) => (
              <option key={month} value={i}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Day headers ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-gray-800">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Calendar weeks ──────────────────────────────────────────────── */}
      {weeks.map((week, weekIndex) => {
        const bars = getBarsForWeek(week, events);
        const maxRow =
          bars.length > 0 ? Math.max(...bars.map((b) => b.row)) : -1;
        const rowHeight = Math.max(
          MIN_HEIGHT,
          DATE_HEIGHT + (maxRow + 1) * (BAR_HEIGHT + BAR_GAP) + 8,
        );

        return (
          <div
            key={weekIndex}
            className="relative border-b border-gray-800"
            style={{ height: `${rowHeight}px` }}
          >
            {/* Date number cells — behind bars */}
            <div className="grid grid-cols-7 h-full">
              {week.map((date, dayIndex) => {
                const isCurrentMonth = date.getMonth() === currentMonth;
                const isToday = date.getTime() === today.getTime();

                return (
                  <div
                    key={dayIndex}
                    className={`border-r border-gray-800 last:border-r-0 p-1 ${
                      isCurrentMonth ? "" : "opacity-40"
                    }`}
                  >
                    {/* Date number */}
                    <div
                      className={`
                      text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? "bg-red-600 text-white" : "text-gray-400"}
                    `}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event bars — absolutely positioned OVER the grid ─────────── */}
            {bars.map((bar, barIndex) => {
              const colWidth = 100 / 7; // percentage width per column
              const leftPct = bar.colStart * colWidth;
              const widthPct = bar.colSpan * colWidth;
              const topPx = DATE_HEIGHT + bar.row * (BAR_HEIGHT + BAR_GAP);

              // Is the bar starting from this week (not clamped from previous)?
              const eventStart = new Date(bar.event.event_date);
              eventStart.setHours(0, 0, 0, 0);
              const isRealStart = eventStart >= new Date(week[0]);

              // Is the bar ending this week (not continuing to next)?
              const eventEnd = bar.event.end_date
                ? new Date(bar.event.end_date)
                : new Date(bar.event.event_date);
              eventEnd.setHours(0, 0, 0, 0);
              const isRealEnd = eventEnd <= new Date(week[6]);

              return (
                <Link
                  key={barIndex}
                  href={`/events/${bar.event.id}`}
                  title={bar.event.title}
                  className={`
                    absolute flex items-center px-2 text-xs text-white font-medium
                    truncate transition-opacity hover:opacity-80
                    ${EVENT_COLORS[bar.event.type] ?? "bg-gray-600"}
                    ${isRealStart || bar.colStart === 0 ? "rounded-l-full" : ""}
                    ${isRealEnd || bar.colStart + bar.colSpan === 7 ? "rounded-r-full" : ""}
                  `}
                  style={{
                    left: `calc(${leftPct}% + ${isRealStart ? 2 : 0}px)`,
                    width: `calc(${widthPct}% - ${(isRealStart ? 2 : 0) + (isRealEnd ? 2 : 0)}px)`,
                    top: `${topPx}px`,
                    height: `${BAR_HEIGHT}px`,
                  }}
                >
                  {/* Show title only on real start OR first visible day of week */}
                  <span className="truncate block">
                    {(isRealStart || bar.colStart === 0) && bar.event.title}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-800">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-full bg-orange-600 inline-block" />
          Tournament
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          League
        </span>
      </div>
    </div>
  );
}
