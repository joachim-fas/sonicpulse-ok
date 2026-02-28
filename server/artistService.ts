/**
 * Artist Service – Zentrale Logik für das Beschaffen echter Spotify Artist-IDs.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  REGEL: open.spotify.com/search/... ist ABSOLUT VERBOTEN.               ║
 * ║  Erlaubt ist ausschließlich: open.spotify.com/artist/{ECHTE_ID}         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Vierstufige Fallback-Kette:
 *  1. Spotify API (Client Credentials) – wenn verfügbar und nicht 403
 *  2. MusicBrainz URL-Relations – öffentlich, kein Token (1 Versuch, kein Retry bei ECONNRESET)
 *  3. Wikidata Property P1902 – öffentlich, kein Token, bis zu 5 Kandidaten geprüft
 *  4. Last.fm + Discogs für Bild/Metadaten (ohne Spotify-ID)
 *
 * Für Künstler ohne echte Spotify-ID: Profil mit leerem spotify_id zurückgeben.
 * Das Frontend zeigt dann einen "Auf Spotify suchen"-Link.
 */

import { searchSpotifyArtist } from "./spotify";
import { searchMusicBrainzArtist } from "./musicbrainz";
import { searchWikidataArtist } from "./wikidata";
import { getArtistImageFromDiscogs } from "./artistImage";
import { getArtistInfo as getLastfmArtistInfo } from "./lastfm";

export interface ArtistProfile {
  display_name: string;
  spotify_name: string;
  spotify_id: string;
  direct_link: string;       // https://open.spotify.com/artist/{spotify_id} – NIEMALS /search/
  image_url: string | null;
  genres: string[];
  followers: number | null;
  popularity: number | null;
  source: "spotify" | "musicbrainz" | "wikidata";
  lastfm_listeners?: number | null;
  lastfm_tags?: string[];
  lastfm_url?: string | null;
}

/**
 * Prüft ob ein Fehler ein Netzwerk-Verbindungsfehler ist (ECONNRESET, ETIMEDOUT, etc.)
 * Bei diesen Fehlern ist ein Retry sinnlos – die IP ist blockiert.
 */
function isNetworkBlockError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("fetch failed") ||
    msg.includes("network socket disconnected")
  );
}

/**
 * Hilfsfunktion: Retry mit exponential backoff.
 * Bricht sofort ab bei Netzwerk-Block-Fehlern (kein Retry sinnvoll).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 400
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Bei Netzwerk-Block sofort aufgeben – kein Retry hilft
      if (isNetworkBlockError(err)) {
        throw err;
      }
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Holt Bild + Last.fm-Metadaten für einen Künstler.
 * Versucht Last.fm zuerst, dann Discogs als Fallback.
 */
async function fetchArtistMedia(artistName: string): Promise<{
  image_url: string | null;
  lastfm_listeners: number | null;
  lastfm_tags: string[];
  lastfm_url: string | null;
}> {
  let image_url: string | null = null;
  let lastfm_listeners: number | null = null;
  let lastfm_tags: string[] = [];
  let lastfm_url: string | null = null;

  try {
    const lfm = await getLastfmArtistInfo(artistName);
    if (lfm?.image) {
      image_url = lfm.image;
      lastfm_listeners = lfm.listeners;
      lastfm_tags = lfm.tags;
      lastfm_url = lfm.url;
    } else if (lfm) {
      // Last.fm kennt den Künstler, aber kein Bild
      lastfm_listeners = lfm.listeners;
      lastfm_tags = lfm.tags;
      lastfm_url = lfm.url;
    }
  } catch { /* ignore */ }

  if (!image_url) {
    image_url = await getArtistImageFromDiscogs(artistName).catch(() => null);
  }

  return { image_url, lastfm_listeners, lastfm_tags, lastfm_url };
}

/**
 * Beschafft ein vollständiges Artist-Profil mit echter Spotify-ID.
 * Vierstufige Fallback-Kette: Spotify → MusicBrainz → Wikidata → Last.fm/Discogs.
 * Gibt null zurück wenn gar keine Daten gefunden werden.
 * Konstruiert NIEMALS einen Suche-Link (/search/...).
 */
export async function resolveArtist(artistName: string): Promise<ArtistProfile | null> {
  // ── Stufe 1: Spotify Web API ──────────────────────────────────────────────
  try {
    const spotifyResult = await searchSpotifyArtist(artistName);
    if (spotifyResult) {
      console.info(`[ArtistService] "${artistName}" → Spotify API ✓`);
      return {
        display_name: artistName,
        spotify_name: spotifyResult.spotify_name,
        spotify_id:   spotifyResult.spotify_id,
        direct_link:  spotifyResult.direct_link,
        image_url:    spotifyResult.image_url,
        genres:       spotifyResult.genres,
        followers:    spotifyResult.followers,
        popularity:   spotifyResult.popularity,
        source:       "spotify",
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ArtistService] Spotify nicht verfügbar (${msg}) – versuche MusicBrainz`);
  }

  // ── Stufe 2: MusicBrainz URL-Relations (1 Versuch, kein Retry bei ECONNRESET) ──
  try {
    // Nur 1 Versuch – MusicBrainz blockiert unsere IP (ECONNRESET), Retry hilft nicht
    const mbResult = await searchMusicBrainzArtist(artistName);
    if (mbResult?.spotify_id) {
      console.info(`[ArtistService] "${artistName}" → MusicBrainz ✓ (Spotify: ${mbResult.spotify_id})`);
      const direct_link = `https://open.spotify.com/artist/${mbResult.spotify_id}`;
      const media = await fetchArtistMedia(artistName);
      return {
        display_name: artistName,
        spotify_name: mbResult.name,
        spotify_id:   mbResult.spotify_id,
        direct_link,
        image_url:    media.image_url,
        genres:       mbResult.genres.length > 0 ? mbResult.genres : media.lastfm_tags,
        followers:    null,
        popularity:   null,
        source:       "musicbrainz",
        lastfm_listeners: media.lastfm_listeners,
        lastfm_tags:  media.lastfm_tags,
        lastfm_url:   media.lastfm_url,
      };
    }
    if (mbResult && !mbResult.spotify_id) {
      console.info(`[ArtistService] "${artistName}" in MusicBrainz ohne Spotify-ID – versuche Wikidata`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ArtistService] MusicBrainz nicht verfügbar für "${artistName}" (${msg}) – versuche Wikidata`);
  }

  // ── Stufe 3: Wikidata Property P1902 (bis zu 5 Kandidaten) ───────────────
  try {
    const wdResult = await withRetry(() => searchWikidataArtist(artistName), 2, 400);
    if (wdResult?.spotify_id) {
      console.info(`[ArtistService] "${artistName}" → Wikidata ✓ (Spotify: ${wdResult.spotify_id})`);
      const media = await fetchArtistMedia(artistName);
      return {
        display_name: artistName,
        spotify_name: wdResult.name,
        spotify_id:   wdResult.spotify_id,
        direct_link:  wdResult.direct_link,
        image_url:    media.image_url,
        genres:       media.lastfm_tags,
        followers:    null,
        popularity:   null,
        source:       "wikidata",
        lastfm_listeners: media.lastfm_listeners,
        lastfm_tags:  media.lastfm_tags,
        lastfm_url:   media.lastfm_url,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ArtistService] Wikidata nicht verfügbar für "${artistName}" (${msg})`);
  }

  // ── Stufe 4: Last.fm + Discogs (kein Spotify-Link, aber Profil mit Metadaten) ──
  // Für Künstler die in keiner Datenbank mit Spotify verknüpft sind.
  // Das Frontend zeigt einen "Auf Spotify suchen"-Button.
  console.info(`[ArtistService] "${artistName}" – keine Spotify-ID gefunden, versuche Last.fm/Discogs`);
  try {
    const lfm = await getLastfmArtistInfo(artistName);
    if (lfm) {
      console.info(`[ArtistService] "${artistName}" → Last.fm ✓ (kein Spotify-Link)`);
      const image_url = lfm.image ?? await getArtistImageFromDiscogs(artistName).catch(() => null);
      return {
        display_name: artistName,
        spotify_name: artistName,
        spotify_id:   "",
        direct_link:  "",
        image_url,
        genres:       lfm.tags,
        followers:    null,
        popularity:   null,
        source:       "musicbrainz" as const,
        lastfm_listeners: lfm.listeners,
        lastfm_tags:  lfm.tags,
        lastfm_url:   lfm.url,
      };
    }
  } catch { /* ignore */ }

  // Discogs als absolut letzter Fallback
  try {
    const image_url = await getArtistImageFromDiscogs(artistName).catch(() => null);
    if (image_url) {
      console.info(`[ArtistService] "${artistName}" → Discogs ✓ (nur Bild)`);
      return {
        display_name: artistName,
        spotify_name: artistName,
        spotify_id:   "",
        direct_link:  "",
        image_url,
        genres:       [],
        followers:    null,
        popularity:   null,
        source:       "musicbrainz" as const,
      };
    }
  } catch { /* ignore */ }

  console.warn(`[ArtistService] "${artistName}" – keine Daten in keiner Quelle gefunden`);
  return null;
}

/**
 * Löst mehrere Künstler sequenziell auf.
 * Sequenziell wegen Rate-Limits bei Wikidata und Last.fm.
 */
export async function resolveMultipleArtists(
  names: string[]
): Promise<(ArtistProfile | null)[]> {
  const results: (ArtistProfile | null)[] = [];
  for (const name of names) {
    const result = await resolveArtist(name);
    results.push(result);
    // Kurze Pause zwischen Requests für Rate-Limits
    if (results.length < names.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return results;
}
