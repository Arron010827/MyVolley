
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { extractYouTubeId } from "@/lib/youtube";

type SupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

interface ValidateStreamAssignmentOptions {
  youtubeUrl: string;
  matchId: string | null;
  excludeStreamId?: string;
}

export async function validateStreamAssignment(
  supabase: SupabaseClient,
  {
    youtubeUrl,
    matchId,
    excludeStreamId,
  }: ValidateStreamAssignmentOptions,
) {
  const videoId = extractYouTubeId(youtubeUrl);

  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // Check whether this match already has a different stream.
  if (matchId) {
    let query = supabase
      .from("streams")
      .select("id")
      .eq("match_id", matchId);

    if (excludeStreamId) {
      query = query.neq("id", excludeStreamId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      throw new Error(
        `Unable to validate match assignment: ${error.message}`,
      );
    }

    if (data?.length) {
      throw new Error(
        "This match already has a stream assigned.",
      );
    }
  }

  // Check whether this YouTube video is already used.
  let query = supabase
    .from("streams")
    .select("id")
    .eq("youtube_video_id", videoId);

  if (excludeStreamId) {
    query = query.neq("id", excludeStreamId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(
      `Unable to validate YouTube video: ${error.message}`,
    );
  }

  if (data?.length) {
    throw new Error(
      "This YouTube video is already assigned to another stream.",
    );
  }

  return videoId;
}
