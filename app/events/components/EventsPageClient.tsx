"use client";

import { useState } from "react";
import CalendarView from "./CalendarView";
import WeeklyView from "./WeeklyView";

export interface Event {
  id: string;
  title: string;
  type: string;
  gender: string;
  event_date: string;
  end_date: string | null;
  location: string;
  state: string;
  is_association_event: boolean;
}

export default function EventsPageClient({ events }: { events: Event[] }) {
  // Shared state — both views sync to same month/week
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Week state — start of current week (Monday)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    const day = d.getDay();
    // Adjust to Monday (0=Sun → go back 6, 1=Mon → 0, etc.)
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Navigate calendar month
  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  // Navigate week
  function prevWeek() {
    setWeekStart((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 7);
      return prev;
    });
  }

  function nextWeek() {
    setWeekStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }

  return (
    <div className="space-y-10">
      <CalendarView
        events={events}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onMonthChange={setCurrentMonth}
        onYearChange={setCurrentYear}
      />
      <WeeklyView
        events={events}
        weekStart={weekStart}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
      />
    </div>
  );
}
