import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ManagePageClient from "@/app/events/components/ManagePageClient";

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { eventId } = await params;

  // Must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  // Check access — must be admin or assigned organiser
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { data: organiser } = await supabase
    .from("event_organisers")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin && !organiser) redirect(`/events/${eventId}`);

  // Fetch clubs already in this event with their group
  const { data: clubEventsRaw } = await supabase
    .from("club_events")
    .select("club_id, group_name, clubs(id, club_name, logo_url)")
    .eq("event_id", eventId)
    .order("group_name", { ascending: true });

  // Safely extract club data
  const clubEvents = (clubEventsRaw ?? []).map((row) => {
    const club = Array.isArray(row.clubs)
      ? (row.clubs[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (row.clubs as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    return {
      club_id: row.club_id,
      group_name: row.group_name as string | null,
      club_name: club?.club_name ?? "—",
      logo_url: club?.logo_url ?? null,
    };
  });

  // Fetch all approved clubs for the add dropdown
  const { data: allClubs } = await supabase
    .from("clubs")
    .select("id, club_name")
    .eq("status", "approved")
    .order("club_name", { ascending: true });

  const { data: eventStreams } = await supabase
    .from("streams")
    .select("id, youtube_url, is_live, match_id, event_id")
    .eq("event_id", eventId);

  // Fetch existing matches
  const { data: matchesRaw } = await supabase
    .from("event_matches")
    .select(
      `
      id, match_number, court, match_time, match_date,
      home_score, away_score, group_name, round,
      home_club:home_club_id(id, club_name, logo_url),
      away_club:away_club_id(id, club_name, logo_url),
      event_match_sets(set_number, home_points, away_points)
    `,
    )
    .eq("event_id", eventId)
    .order("match_number", { ascending: true });

  const { data: allEvents } = await supabase
    .from("events")
    .select("id, title")
    .eq("status", "approved")
    .order("event_date", { ascending: false });

  const { data: allMatchesRaw } = await supabase
    .from("event_matches")
    .select(
      `
    id, match_number, round, group_name, event_id,
    home_club:home_club_id ( club_name ),
    away_club:away_club_id ( club_name )
  `,
    )
    .order("match_number", { ascending: true });

  const allMatches = (allMatchesRaw ?? []).map((row) => {
    const home = Array.isArray(row.home_club)
      ? (row.home_club[0] as { club_name: string } | undefined)
      : (row.home_club as { club_name: string } | null);
    const away = Array.isArray(row.away_club)
      ? (row.away_club[0] as { club_name: string } | undefined)
      : (row.away_club as { club_name: string } | null);

    return {
      id: row.id,
      match_number: row.match_number,
      round: row.round as string | null,
      group_name: row.group_name as string | null,
      event_id: row.event_id,
      home_club: home?.club_name ?? "?",
      away_club: away?.club_name ?? "?",
    };
  });

  // Safely extract match data
  const matches = (matchesRaw ?? []).map((row) => {
    const home = Array.isArray(row.home_club)
      ? (row.home_club[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (row.home_club as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    const away = Array.isArray(row.away_club)
      ? (row.away_club[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (row.away_club as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    return {
      id: row.id,
      match_number: row.match_number,
      court: row.court as string | null,
      match_date: row.match_date as string | null,
      match_time: row.match_time as string | null,
      home_score: row.home_score as number | null,
      away_score: row.away_score as number | null,
      group_name: row.group_name as string | null,
      round: row.round as string | null,
      home_club_id: home?.id ?? "",
      away_club_id: away?.id ?? "",
      home_club: home
        ? {
            id: home.id,
            club_name: home.club_name,
            logo_url: home.logo_url ?? null,
          }
        : null,
      away_club: away
        ? {
            id: away.id,
            club_name: away.club_name,
            logo_url: away.logo_url ?? null,
          }
        : null,
      sets: (Array.isArray(row.event_match_sets)
        ? row.event_match_sets
        : row.event_match_sets
          ? [row.event_match_sets]
          : []
      ).sort(
        (a: { set_number: number }, b: { set_number: number }) =>
          a.set_number - b.set_number,
      ) as { set_number: number; home_points: number; away_points: number }[],
    };
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-red-950 to-gray-950 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Link
            href={`/events/${eventId}`}
            className="text-red-400 hover:text-red-300 text-sm mb-4 inline-block"
          >
            ← Back to event page
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Manage
            </span>
          </div>
          <p className="text-gray-400 mt-1">
            {event.type === "league" ? "League" : "Tournament"} — {event.state}
          </p>
        </div>
      </div>

      {/* Client component handles all interactivity */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ManagePageClient
          event={event}
          clubEvents={clubEvents}
          allClubs={allClubs ?? []}
          matches={matches}
          eventId={eventId}
          streams={eventStreams ?? []}
          allEvents={allEvents ?? []}
          allMatches={allMatches}
        />
      </div>
    </main>
  );
}
