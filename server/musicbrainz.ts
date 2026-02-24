/**
 * MusicBrainz API Integration
 * Öffentliche API – kein Token erforderlich.
 * Wird als Fallback verwendet wenn die Spotify API nicht verfügbar ist (403/Development Mode).
 * Liefert Spotify-ID, Künstlername, Genres und Metadaten.
 */

const MB_API = "https://musicbrainz.org/ws/2";
const MB_USER_AGENT = "SpotifyArtistApp/1.0 (contact@example.com)";

export interface MusicBrainzArtistResult {
  mb_id: string;
  name: string;
  spotify_id: string | null;
  spotify_url: string | null;
  genres: string[];
  country: string | null;
  disambiguation: string | null;
}

/**
 * Sucht einen Künstler über MusicBrainz und extrahiert die Spotify-ID aus den URL-Relations.
 * Rate-Limit: 1 Request/Sekunde – für unsere Nutzung ausreichend.
 */
export async function searchMusicBrainzArtist(
  artistName: string
): Promise<MusicBrainzArtistResult | null> {
  const params = new URLSearchParams({
    query: artistName,
    fmt: "json",
    limit: "1",
  });

  const searchRes = await fetch(`${MB_API}/artist?${params}`, {
    headers: {
      "User-Agent": MB_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!searchRes.ok) {
    throw new Error(`MusicBrainz Search-Fehler: ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    artists: Array<{
      id: string;
      name: string;
      country?: string;
      disambiguation?: string;
      tags?: Array<{ name: string; count: number }>;
    }>;
  };

  const artist = searchData.artists?.[0];
  if (!artist) return null;

  // Detailabfrage mit URL-Relations für Spotify-ID
  const detailRes = await fetch(`${MB_API}/artist/${artist.id}?fmt=json&inc=url-rels+tags`, {
    headers: {
      "User-Agent": MB_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!detailRes.ok) {
    // Fallback ohne Spotify-ID
    return {
      mb_id: artist.id,
      name: artist.name,
      spotify_id: null,
      spotify_url: null,
      genres: [],
      country: artist.country ?? null,
      disambiguation: artist.disambiguation ?? null,
    };
  }

  const detail = (await detailRes.json()) as {
    id: string;
    name: string;
    country?: string;
    disambiguation?: string;
    relations?: Array<{
      type: string;
      url?: { resource: string };
    }>;
    tags?: Array<{ name: string; count: number }>;
  };

  // Spotify-URL aus Relations extrahieren
  let spotifyId: string | null = null;
  let spotifyUrl: string | null = null;

  for (const rel of detail.relations ?? []) {
    const resource = rel.url?.resource ?? "";
    if (resource.includes("open.spotify.com/artist/")) {
      spotifyUrl = resource;
      // ID ist der letzte Pfad-Teil, ggf. Query-Parameter entfernen
      spotifyId = resource.split("/artist/")[1]?.split("?")[0] ?? null;
      break;
    }
  }

  // Genres aus Tags (nach Häufigkeit sortiert)
  const genres = (detail.tags ?? [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((t) => t.name);

  return {
    mb_id: detail.id,
    name: detail.name,
    spotify_id: spotifyId,
    spotify_url: spotifyUrl,
    genres,
    country: detail.country ?? null,
    disambiguation: detail.disambiguation ?? null,
  };
}
