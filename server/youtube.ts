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
 * Normalisiert einen String für Vergleiche: lowercase, nur alphanumerisch.
 */
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Prüft ob ein YouTube-Ergebnis wirklich zur gesuchten Band gehört.
 * Verhindert falsche Treffer wenn der Bandname ein gebräuchliches Wort ist
 * (z.B. Jessie Reyez "COFFIN" für Band "C.O.F.F.I.N").
 *
 * Regeln (in Prioritätsreihenfolge):
 * 1. Channel-Name enthält den Bandnamen → sehr zuverlässig
 * 2. Bandname enthält Channel-Name (z.B. Channel "COFFIN" für Band "C.O.F.F.I.N")
 * 3. Titel beginnt mit dem Bandnamen (Standard-Format: "Artist - Song")
 *
 * NICHT ausreichend: Bandname irgendwo im Titel (zu viele Fehlalarme)
 */
function isValidArtistResult(
  artistName: string,
  videoTitle?: string,
  channelTitle?: string
): boolean {
  if (!videoTitle && !channelTitle) return false;
  const normArtist = normalizeForCompare(artistName);
  const normTitle = normalizeForCompare(videoTitle ?? "");
  const normChannel = normalizeForCompare(channelTitle ?? "");

  // Regel 1: Channel-Name enthält den Bandnamen ("COFFIN Official" enthält "coffin")
  if (normChannel.includes(normArtist)) {
    return true;
  }

  // Regel 2: Bandname enthält Channel-Name ("C.O.F.F.I.N" normalisiert = "coffin", Channel = "coffin")
  // Mindestlänge 4 Zeichen um Kurzformen zu vermeiden
  if (normArtist.length >= 4 && normChannel.length >= 4 && normArtist.includes(normChannel)) {
    return true;
  }

  // Regel 3: Titel beginnt mit dem Bandnamen ("Radiohead - Creep" beginnt mit "radiohead")
  if (normTitle.startsWith(normArtist)) {
    return true;
  }

  return false;
}

/**
 * Sucht die YouTube-Video-ID für einen Künstler (Artist Preview / Top Track).
 * Validiert Ergebnisse gegen den Bandnamen um falsche Treffer zu verhindern.
 * Gibt die Video-ID zurück oder null wenn nichts Passendes gefunden.
 */
export async function searchYouTubeVideoId(
  artistName: string,
  trackTitle?: string
): Promise<string | null> {
  // Mehrere Queries in Prioritätsreihenfolge – spezifischste zuerst
  const queries = trackTitle
    ? [
        `"${artistName}" "${trackTitle}" official`,
        `${artistName} ${trackTitle} official`,
      ]
    : [
        `"${artistName}" band official music video`,
        `${artistName} official music video`,
        `${artistName} band music`,
      ];

  for (const query of queries) {
    try {
      const result = await callDataApi("Youtube/search", {
        query: { q: query, hl: "en", gl: "US" },
      }) as YouTubeSearchResponse;

      const contents = result?.contents ?? [];

      // Alle Video-Treffer prüfen – ersten validen zurückgeben
      for (const item of contents) {
        if (item.type === "video" && item.video?.videoId) {
          const { videoId, title, channelTitle } = item.video;
          if (isValidArtistResult(artistName, title, channelTitle)) {
            console.info(`[YouTube] Valider Treffer für "${artistName}": "${title}" (${channelTitle})`);
            return videoId!;
          } else {
            console.info(`[YouTube] Übersprungen (falscher Treffer): "${title}" (${channelTitle}) für "${artistName}"`);
          }
        }
      }
    } catch (err) {
      console.warn(`[YouTube] Suche fehlgeschlagen für "${artistName}" (query: ${query}):`, err);
    }
  }

  console.info(`[YouTube] Kein valider Treffer für "${artistName}" – kein YouTube-Video gesetzt`);
  return null;
}
