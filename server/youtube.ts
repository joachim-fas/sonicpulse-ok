/**
 * YouTube Service
 *
 * Sucht die beste YouTube-Video-ID für einen Künstler oder Song.
 * Wird als Fallback verwendet wenn keine Spotify-ID verfügbar ist.
 *
 * Nutzt die Manus Data API (Youtube/search) – kein eigener API-Key nötig.
 */

import { callDataApi } from "./_core/dataApi";

interface YouTubeVideoResult {
  type: string;
  video?: {
    videoId?: string;
    title?: string;
    channelTitle?: string;
    lengthText?: string;
    viewCountText?: string;
  };
}

interface YouTubeSearchResponse {
  contents?: YouTubeVideoResult[];
}

/**
 * Sucht die YouTube-Video-ID für einen Künstler (Artist Preview / Top Track).
 * Gibt die Video-ID zurück oder null wenn nichts gefunden.
 */
export async function searchYouTubeVideoId(
  artistName: string,
  trackTitle?: string
): Promise<string | null> {
  try {
    // Suchquery: mit Track-Titel spezifischer, ohne nur Künstler + "official"
    const query = trackTitle
      ? `${artistName} ${trackTitle} official`
      : `${artistName} official music video`;

    const result = await callDataApi("Youtube/search", {
      query: { q: query, hl: "en", gl: "US" },
    }) as YouTubeSearchResponse;

    const contents = result?.contents ?? [];

    // Ersten Video-Treffer zurückgeben
    for (const item of contents) {
      if (item.type === "video" && item.video?.videoId) {
        return item.video.videoId;
      }
    }

    return null;
  } catch (err) {
    console.warn(`[YouTube] Suche fehlgeschlagen für "${artistName}":`, err);
    return null;
  }
}
