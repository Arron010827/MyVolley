import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { extractYouTubeId } from "@/lib/youtube";
import StreamAssignCard from "@/components/StreamAssignCard";
import {
  toggleLiveStatus,
  deleteStream,
  linkStreamToMatch,
} from "./create/actions";

export default async function AdminStreamsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // Fetch all streams with match + event data
  const { data: streams } = await supabase
    .from("streams")
    .select(
      `
      id, youtube_url, is_live, match_id, event_id, created_by,
      events ( title ),
      event_matches (
        match_number, round, group_name, match_time, match_date,
        home_club:home_club_id ( id, club_name, logo_url ),
        away_club:away_club_id ( id, club_name, logo_url )
      )
    `,
    )
    .order("created_at", { ascending: false });

  // Fetch all events for dropdowns
  const { data: allEvents } = await supabase
    .from("events")
    .select("id, title")
    .eq("status", "approved")
    .order("event_date", { ascending: false });

  // Fetch all matches for dropdowns
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

  // Fetch creator names for unlinked streams
  const unlinkedStreams = (streams ?? []).filter((s) => !s.match_id);
  const creatorIds = [...new Set(unlinkedStreams.map((s) => s.created_by))];
  const { data: creators } =
    creatorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds)
      : { data: [] };

  const creatorMap = Object.fromEntries(
    (creators ?? []).map((c) => [c.id, c.full_name]),
  );

  // Split streams
  const linkedStreams = (streams ?? []).filter((s) => s.match_id);
  const unlinkedList = (streams ?? []).filter((s) => !s.match_id);

  // ─── Helper: extract match object from stream ─────────────────────────────
  function extractMatchFromStream(stream: (typeof streams)[0]) {
    const raw = stream.event_matches;
    const m = Array.isArray(raw) ? raw[0] : raw;
    if (!m) return null;

    const home = Array.isArray(m.home_club)
      ? (m.home_club[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (m.home_club as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    const away = Array.isArray(m.away_club)
      ? (m.away_club[0] as
          | { id: string; club_name: string; logo_url: string | null }
          | undefined)
      : (m.away_club as {
          id: string;
          club_name: string;
          logo_url: string | null;
        } | null);

    return {
      id: stream.match_id ?? "",
      match_number: m.match_number,
      round: m.round as string | null,
      group_name: m.group_name as string | null,
      match_date: m.match_date as string | null,
      match_time: m.match_time as string | null,
      court: null,
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
    };
  }

  function getEventTitle(stream: (typeof streams)[0]): string | null {
    if (!stream.events) return null;
    return Array.isArray(stream.events)
      ? ((stream.events[0] as { title: string })?.title ?? null)
      : (stream.events as { title: string }).title;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-red-400 hover:text-red-300 text-sm mb-4 inline-block"
            >
              ← Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold">Stream Management</h1>
            <p className="text-gray-400 mt-1">
              Add and manage live streams and highlights
            </p>
          </div>
          <Link
            href="/dashboard/streams/create"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors"
          >
            + Add Stream
          </Link>
        </div>

        {/* ── Unlinked streams ──────────────────────────────────────────────── */}
        {unlinkedList.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              Unlinked Streams
              <span className="text-sm text-gray-500 font-normal">
                ({unlinkedList.length})
              </span>
            </h2>
            <div className="space-y-3">
              {unlinkedList.map((stream) => (
                <StreamAssignCard
                  key={stream.id}
                  stream={{
                    id: stream.id,
                    youtube_url: stream.youtube_url,
                    is_live: stream.is_live,
                    match_id: stream.match_id,
                    event_id: stream.event_id,
                  }}
                  match={null}
                  eventTitle={getEventTitle(stream)}
                  createdBy={creatorMap[stream.created_by] ?? null}
                  eventId={stream.event_id}
                  allEvents={allEvents ?? []}
                  allMatches={allMatches}
                  onAssign={async (youtubeUrl, matchId, evId) =>
                    linkStreamToMatch(stream.id, youtubeUrl, matchId, evId)
                  }
                  onToggleLive={async (streamId, currentStatus) =>
                    toggleLiveStatus(streamId, currentStatus)
                  }
                  onEdit={async (streamId, youtubeUrl, matchId, evId) =>
                    linkStreamToMatch(streamId, youtubeUrl, matchId, evId)
                  }
                  onDelete={async (streamId) => deleteStream(streamId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Linked streams ────────────────────────────────────────────────── */}
        {linkedStreams.length === 0 && unlinkedList.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No streams yet</p>
            <p className="text-sm mt-1">
              Add your first stream using the button above
            </p>
          </div>
        ) : (
          linkedStreams.length > 0 && (
            <div className="space-y-3">
              {linkedStreams.map((stream) => (
                <StreamAssignCard
                  key={stream.id}
                  stream={{
                    id: stream.id,
                    youtube_url: stream.youtube_url,
                    is_live: stream.is_live,
                    match_id: stream.match_id,
                    event_id: stream.event_id,
                  }}
                  match={extractMatchFromStream(stream)}
                  eventTitle={getEventTitle(stream)}
                  createdBy={null}
                  eventId={stream.event_id}
                  allEvents={allEvents ?? []}
                  allMatches={allMatches}
                  onAssign={async (youtubeUrl, matchId, evId) =>
                    linkStreamToMatch(stream.id, youtubeUrl, matchId, evId)
                  }
                  onToggleLive={async (streamId, currentStatus) =>
                    toggleLiveStatus(streamId, currentStatus)
                  }
                  onEdit={async (streamId, youtubeUrl, matchId, evId) =>
                    linkStreamToMatch(streamId, youtubeUrl, matchId, evId)
                  }
                  onDelete={async (streamId) => deleteStream(streamId)}
                />
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}
