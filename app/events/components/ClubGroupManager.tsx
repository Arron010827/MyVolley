"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addClubToEventWithGroup,
  removeClubFromEvent,
  updateClubGroup,
} from "@/app/events/[eventId]/manage/actions";

interface ClubEvent {
  club_id: string;
  group_name: string | null;
  club_name: string;
  logo_url: string | null;
}

interface Props {
  eventId: string;
  eventType: string;
  clubEvents: ClubEvent[];
  allClubs: { id: string; club_name: string }[];
}

const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function ClubGroupManager({
  eventId,
  eventType,
  clubEvents,
  allClubs,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clubSearch, setClubSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);

  // Clubs already in event (for exclusion from dropdown)
  const addedClubIds = new Set(clubEvents.map((c) => c.club_id));

  // Available clubs that is not yet added
  const availableClubs = allClubs.filter((c) => !addedClubIds.has(c.id));
  // Search available clubs by name
  const filteredClubs = availableClubs
    .filter((club) =>
      club.club_name
        .toLowerCase()
        .includes(clubSearch.trim().toLowerCase())
    )
    .slice(0, 8);

  // Group clubs by group_name
  const grouped = clubEvents.reduce<Record<string, ClubEvent[]>>((acc, ce) => {
    const key = ce.group_name ?? "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ce);
    return acc;
  }, {});

  // Sort groups alphabetically, Unassigned first
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === "Unassigned") return -1;
    if (b === "Unassigned") return 1;
    return a.localeCompare(b);
  });

  async function handleAdd(formData: FormData) {
    setMessage(null);
    if (!formData.get("club_id")) {
      setMessage({
        text: "Please select a club from the search results.",
        type: "error",
      });
      return;
    }
    const result = await addClubToEventWithGroup(eventId, formData);
    if (result?.alreadyAdded) {
      setMessage({ text: "This club is already in the event.", type: "error" });
    } else {
      setMessage({ text: "Club added successfully!", type: "success" });
      // Clear the search so another club can be added immediately.
      setClubSearch("");
      setSelectedClubId("");
      setIsClubDropdownOpen(false);

      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    }
  }

  async function handleRemove(clubId: string) {
    startTransition(async () => {
      await removeClubFromEvent(eventId, clubId);
      router.refresh();
    });
  }

  async function handleGroupChange(clubId: string, groupName: string) {
    startTransition(async () => {
      await updateClubGroup(eventId, clubId, groupName || null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Add club form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold text-lg mb-4">Add Club</h2>

        <form action={handleAdd} className="flex flex-col sm:flex-row gap-4">
        {/* Searchable club selector */}
        <div className="relative flex-1">
          <input
            type="text"
            value={clubSearch}
            placeholder="Search for a club..."
            autoComplete="off"
            onChange={(e) => {
              setClubSearch(e.target.value);
              setSelectedClubId("");
              setIsClubDropdownOpen(true);
            }}
            onFocus={() => setIsClubDropdownOpen(true)}
            onBlur={() => {
              // Delay closing so a result can be clicked first.
              setTimeout(() => setIsClubDropdownOpen(false), 150);
            }}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
          />

          {/* Submit the selected club's ID, not its displayed name */}
          <input
            type="hidden"
            name="club_id"
            value={selectedClubId}
          />

          {isClubDropdownOpen && clubSearch.trim() && (
            <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
              {filteredClubs.length > 0 ? (
                filteredClubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedClubId(club.id);
                      setClubSearch(club.club_name);
                      setIsClubDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-700 transition-colors ${
                      selectedClubId === club.id
                        ? "bg-gray-700 text-white"
                        : "text-gray-200"
                    }`}
                  >
                    {club.club_name}
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-400">
                  No matching clubs found.
                </p>
              )}
            </div>
          )}
        </div>

          {/* Group selector — only for tournaments */}
          {eventType === "tournament" && (
            <select
              name="group_name"
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
            >
              <option value="">— No group —</option>
              {GROUP_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  Group {letter}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex-shrink-0"
          >
            Add
          </button>
        </form>

        {/* Feedback */}
        {message && (
          <div
            className={`mt-3 text-sm px-4 py-3 rounded-lg ${
              message.type === "error"
                ? "bg-red-900/40 border border-red-700 text-red-300"
                : "bg-green-900/40 border border-green-700 text-green-300"
            }`}
          >
            {message.type === "error" ? "⚠️" : "✓"} {message.text}
          </div>
        )}
      </div>

      {/* Club list grouped */}
      {clubEvents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
          <p>No clubs added yet</p>
          <p className="text-sm mt-1">Use the form above to add clubs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <div
              key={group}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Group header */}
              <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
                <span
                  className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                    group === "Unassigned"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {group === "Unassigned"
                    ? eventType === "league"
                      ? "League Stage"
                      : "Unassigned"
                    : `Group ${group}`}
                </span>
                <span className="text-gray-500 text-xs">
                  {grouped[group].length} club
                  {grouped[group].length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Clubs in group */}
              <div className="divide-y divide-gray-800">
                {grouped[group].map((ce) => (
                  <div
                    key={ce.club_id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {ce.club_name.charAt(0)}
                    </div>

                    {/* Club name */}
                    <span className="flex-1 text-sm font-medium text-white">
                      {ce.club_name}
                    </span>

                    {/* Group changer — tournament only */}
                    {eventType === "tournament" && (
                      <select
                        value={ce.group_name ?? ""}
                        onChange={(e) =>
                          handleGroupChange(ce.club_id, e.target.value)
                        }
                        disabled={isPending}
                        className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500 disabled:opacity-50"
                      >
                        <option value="">No group</option>
                        {GROUP_LETTERS.map((letter) => (
                          <option key={letter} value={letter}>
                            Group {letter}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(ce.club_id)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
