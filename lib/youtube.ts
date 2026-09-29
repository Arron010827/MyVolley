// Pure utility function — no server action, no async needed
// Extracts the YouTube video ID from various URL formats:
//   https://www.youtube.com/watch?v=VIDEO_ID
//   https://youtu.be/VIDEO_ID
//   https://www.youtube.com/live/VIDEO_ID

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/, // standard watch URL
    /youtu\.be\/([^?]+)/, // shortened URL
    /youtube\.com\/live\/([^?]+)/, // live URL format
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
