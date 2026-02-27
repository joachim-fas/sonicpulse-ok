/**
 * Artist Service – Zentrale Logik für das Beschaffen echter Spotify Artist-IDs.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REGEL: open.spotify.com/search/... ist ABSOLUT VERBOTEN.       ║
 * ║  Erlaubt ist ausschließlich: open.spotify.com/artist/{ECHTE_ID} ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dreistufige Fallback-Kette:
 *  1. Spotify API (Client Credentials) – wenn verfügbar und nicht 403
 *  2. MusicBrainz URL-Relations – öffentlich, kein Token, mit Retry
 *  3. Wikidata Property P1902 – öffentlich, kein Token, sehr zuverlässig
 *  4. Wenn keine ID gefunden → null, KEIN Link konstruieren
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
 * Hilfsfunktion: Retry mit exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Beschafft ein vollständiges Artist-Profil mit echter Spotify-ID.
 * Dreistufige Fallback-Kette: Spotify → MusicBrainz → Wikidata.
 * Gibt null zurück wenn keine Quelle eine ID liefert.
 * Konstruiert NIEMALS einen Suche-Link (/search/...).
 */
export async function resolveArtist(artistName: string): Promise<ArtistProfile | null> {

  // ── Stufe 1: Spotify Web API ──────────────────────────────────────────────
  try {
    const spotifyResult = await searchSpotifyArtist(artistName);
    if (spotifyResult) {
      return {
        display_name: artistName,
        spotify_name: spotifyResult.spotify_name,
        spotify_id:   spotifyResult.spotify_id,
        direct_link:  spotifyResult.direct_link, // Kommt direkt aus external_urls.spotify
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

  // ── Stufe 2: MusicBrainz URL-Relations (mit Retry) ───────────────────────
  try {
    const mbResult = await withRetry(() => searchMusicBrainzArtist(artistName), 3, 400);

    if (mbResult?.spotify_id) {
      const direct_link = `https://open.spotify.com/artist/${mbResult.spotify_id}`;
      // Bild: Last.fm zuerst (bessere Künstlerfotos), dann Discogs als Fallback
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
        }
      } catch { /* ignore */ }
      if (!image_url) {
        image_url = await getArtistImageFromDiscogs(artistName).catch(() => null);
      }
      return {
        display_name: artistName,
        spotify_name: mbResult.name,
        spotify_id:   mbResult.spotify_id,
        direct_link,
        image_url,
        genres:       mbResult.genres.length > 0 ? mbResult.genres : lastfm_tags,
        followers:    null,
        popularity:   null,
        source:       "musicbrainz",
        lastfm_listeners,
        lastfm_tags,
        lastfm_url,
      };
    }

    if (mbResult && !mbResult.spotify_id) {
      console.info(`[ArtistService] "${artistName}" in MusicBrainz ohne Spotify-ID – versuche Wikidata`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ArtistService] MusicBrainz nicht verfügbar für "${artistName}" (${msg}) – versuche Wikidata`);
  }

  // ── Stufe 3: Wikidata Property P1902 (Spotify Artist ID) ─────────────────
  try {
    const wdResult = await withRetry(() => searchWikidataArtist(artistName), 3, 400);

    if (wdResult?.spotify_id) {
      // Bild: Last.fm zuerst, dann Discogs als Fallback
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
        }
      } catch { /* ignore */ }
      if (!image_url) {
        image_url = await getArtistImageFromDiscogs(artistName).catch(() => null);
      }
      return {
        display_name: artistName,
        spotify_name: wdResult.name,
        spotify_id:   wdResult.spotify_id,
        direct_link:  wdResult.direct_link, // https://open.spotify.com/artist/{id}
        image_url,
        genres:       lastfm_tags,
        followers:    null,
        popularity:   null,
        source:       "wikidata",
        lastfm_listeners,
        lastfm_tags,
        lastfm_url,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ArtistService] Wikidata nicht verfügbar für "${artistName}" (${msg})`);
  }

  // ── Alle Quellen erschöpft – Last.fm dann Discogs als letzter Bild-Fallback ──
  console.info(`[ArtistService] Keine Spotify-ID für "${artistName}" gefunden – versuche Last.fm + Discogs`);
  try {
    const lfm = await getLastfmArtistInfo(artistName);
    if (lfm) {
      // Last.fm kennt den Künstler – auch ohne Spotify-ID ein Profil zurückgeben
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
  return null;
}

/**
 * Löst mehrere Künstler sequenziell auf.
 * Sequenziell wegen Rate-Limits bei MusicBrainz (1 req/s) und Wikidata.
 * Kein Eintrag wird einen /search/-Link enthalten.
 */
export async function resolveMultipleArtists(
  names: string[]
): Promise<(ArtistProfile | null)[]> {
  const results: (ArtistProfile | null)[] = [];

  for (const name of names) {
    const result = await resolveArtist(name);
    results.push(result);
    // Pause zwischen Requests für Rate-Limits
    if (results.length < names.length) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  return results;
}
