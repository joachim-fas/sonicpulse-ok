/**
 * Artist Service – Zentrale Logik für das Beschaffen echter Spotify Artist-IDs.
 *
 * REGEL: Ein Link der Form open.spotify.com/search/... ist VERBOTEN.
 * Erlaubt ist ausschließlich: open.spotify.com/artist/{ECHTE_ID}
 *
 * Workflow:
 *  1. Spotify API (Client Credentials) – wenn verfügbar und nicht 403
 *  2. MusicBrainz URL-Relations – öffentlich, kein Token, immer verfügbar
 *  3. Wenn keine ID gefunden → null zurückgeben, KEIN Link konstruieren
 */

import { searchSpotifyArtist, type SpotifyArtistResult } from "./spotify";
import { searchMusicBrainzArtist } from "./musicbrainz";

export interface ArtistProfile {
  display_name: string;      // Ursprüngliche Suchanfrage
  spotify_name: string;      // Offizieller Name (aus Spotify oder MusicBrainz)
  spotify_id: string;        // Echte 22-stellige Spotify Artist-ID
  direct_link: string;       // https://open.spotify.com/artist/{spotify_id}
  image_url: string | null;
  genres: string[];
  followers: number | null;
  popularity: number | null;
  source: "spotify" | "musicbrainz";
}

/**
 * Beschafft ein vollständiges Artist-Profil mit echter Spotify-ID.
 *
 * Gibt null zurück wenn weder Spotify noch MusicBrainz eine ID liefern.
 * Konstruiert NIEMALS einen Suche-Link (/search/...).
 */
export async function resolveArtist(artistName: string): Promise<ArtistProfile | null> {
  // ── Versuch 1: Spotify Web API ────────────────────────────────────────────
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
    // Kein Treffer bei Spotify → MusicBrainz versuchen
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Nur bei 403 (Development Mode / Quota) auf MusicBrainz ausweichen
    // Andere Fehler (Netzwerk, 5xx) ebenfalls mit Fallback abfangen
    console.warn(`[ArtistService] Spotify nicht verfügbar (${msg}) – nutze MusicBrainz`);
  }

  // ── Versuch 2: MusicBrainz URL-Relations ─────────────────────────────────
  // Kein Token erforderlich. MusicBrainz speichert Spotify-IDs als URL-Relations.
  try {
    const mbResult = await searchMusicBrainzArtist(artistName);

    if (!mbResult) return null; // Kein Treffer in MusicBrainz

    if (!mbResult.spotify_id) {
      // Künstler in MusicBrainz gefunden, aber keine Spotify-Verlinkung
      // → null zurückgeben, KEIN /search/-Link konstruieren
      console.info(`[ArtistService] "${artistName}" in MusicBrainz gefunden, aber ohne Spotify-ID`);
      return null;
    }

    // Echte ID vorhanden → Deep-Link konstruieren
    const direct_link = `https://open.spotify.com/artist/${mbResult.spotify_id}`;

    return {
      display_name: artistName,
      spotify_name: mbResult.name,
      spotify_id:   mbResult.spotify_id,
      direct_link,
      image_url:    null, // MusicBrainz liefert keine Profilbilder
      genres:       mbResult.genres,
      followers:    null,
      popularity:   null,
      source:       "musicbrainz",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ArtistService] MusicBrainz-Fehler für "${artistName}": ${msg}`);
    return null;
  }
}

/**
 * Löst mehrere Künstler parallel auf.
 * Gibt für jeden Künstler entweder ein ArtistProfile oder null zurück.
 * Kein Eintrag wird einen /search/-Link enthalten.
 */
export async function resolveMultipleArtists(
  names: string[]
): Promise<(ArtistProfile | null)[]> {
  // Sequenziell für MusicBrainz (Rate-Limit: 1 req/s)
  // Bei Spotify-Erfolg können wir parallel arbeiten
  const results: (ArtistProfile | null)[] = [];

  for (const name of names) {
    const result = await resolveArtist(name);
    results.push(result);
    // Kurze Pause zwischen Requests um MusicBrainz Rate-Limit zu respektieren
    if (results.length < names.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}
