/**
 * Spotify Web API Integration
 * Implementiert den Client Credentials Flow mit Token-Caching
 */

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

interface SpotifyToken {
  access_token: string;
  expires_at: number; // Unix timestamp in ms
}

interface SpotifyArtistImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtistRaw {
  id: string;
  name: string;
  external_urls: { spotify: string };
  images: SpotifyArtistImage[];
  genres: string[];
  followers: { total: number };
  popularity: number;
}

export interface SpotifyArtistResult {
  display_name: string;
  spotify_name: string;
  spotify_id: string;
  direct_link: string;
  image_url: string | null;
  genres: string[];
  followers: number;
  popularity: number;
}

// In-Memory Token Cache (lebt solange der Server läuft)
let tokenCache: SpotifyToken | null = null;

/**
 * Holt einen gültigen Spotify Access Token (mit Caching).
 * Token wird serverseitig gecacht und erst bei Ablauf erneuert.
 */
export async function getSpotifyToken(): Promise<string> {
  const now = Date.now();

  // Cache-Hit: Token noch mindestens 60 Sekunden gültig
  if (tokenCache && tokenCache.expires_at > now + 60_000) {
    return tokenCache.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID oder SPOTIFY_CLIENT_SECRET nicht gesetzt");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify Token-Fehler: ${response.status} – ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  tokenCache = {
    access_token: data.access_token,
    expires_at: now + data.expires_in * 1000,
  };

  return tokenCache.access_token;
}

/**
 * Normalisiert einen Künstlernamen für den Vergleich:
 * lowercase, "the "-Präfix entfernen, Sonderzeichen entfernen.
 */
function normalizeArtistName(name: string): string {
  return name.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Berechnet einen einfachen Ähnlichkeitsscore zwischen zwei normalisierten Namen.
 * Gibt 1.0 für exakten Match, 0.0 für keine Übereinstimmung.
 */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeArtistName(a);
  const nb = normalizeArtistName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // Levenshtein-ähnlicher Ansatz: gemeinsame Zeichen / max Länge
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 1.0;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

/**
 * Sucht einen Künstler auf Spotify und gibt ein validiertes Objekt zurück.
 * Holt bis zu 5 Kandidaten und wählt den besten Name-Match.
 * Gibt null zurück wenn kein ausreichend guter Treffer gefunden wird.
 */
export async function searchSpotifyArtist(
  artistName: string
): Promise<SpotifyArtistResult | null> {
  const token = await getSpotifyToken();

  // Strategie 1: Exakte Suche mit limit 5 – besten Match wählen
  const trySearch = async (query: string, minScore = 0.7): Promise<SpotifyArtistResult | null> => {
    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: "5",
    });

    const response = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify Search-Fehler: ${response.status}`);
    }

    const data = (await response.json()) as {
      artists: { items: SpotifyArtistRaw[] };
    };

    const items = data.artists?.items;
    if (!items || items.length === 0) return null;

    // Besten Match nach Name-Ähnlichkeit wählen
    let bestArtist: SpotifyArtistRaw | null = null;
    let bestScore = 0;
    for (const candidate of items) {
      const score = nameSimilarity(artistName, candidate.name);
      if (score > bestScore) {
        bestScore = score;
        bestArtist = candidate;
      }
    }

    if (!bestArtist || bestScore < minScore) return null;

    const imageUrl =
      bestArtist.images.find((img) => img.height >= 300 && img.height <= 640)?.url ??
      bestArtist.images[0]?.url ??
      null;

    return {
      display_name: artistName,
      spotify_name: bestArtist.name,
      spotify_id: bestArtist.id,
      direct_link: bestArtist.external_urls.spotify,
      image_url: imageUrl,
      genres: bestArtist.genres,
      followers: bestArtist.followers.total,
      popularity: bestArtist.popularity,
    };
  };

  // Strategie 1: Exakter Name
  const result1 = await trySearch(artistName, 0.7);
  if (result1) return result1;

  // Strategie 2: Name in Anführungszeichen (exakte Phrase)
  const result2 = await trySearch(`"${artistName}"`, 0.6);
  if (result2) return result2;

  // Strategie 3: Name ohne Sonderzeichen
  const cleanName = artistName.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (cleanName !== artistName) {
    const result3 = await trySearch(cleanName, 0.6);
    if (result3) return result3;
  }

  return null;
}

/**
 * Sucht mehrere Künstler parallel (für KI-Empfehlungen).
 */
export async function searchMultipleArtists(
  names: string[]
): Promise<(SpotifyArtistResult | null)[]> {
  return Promise.all(names.map((name) => searchSpotifyArtist(name)));
}

export interface SpotifyTopTrack {
  id: string;
  name: string;
  preview_url: string | null;
  duration_ms: number;
  album_name: string;
  album_image_url: string | null;
  track_number: number;
  external_url: string;
}

/**
 * Holt die Top-Tracks eines Künstlers und gibt den ersten mit Preview-URL zurück.
 * Gibt null zurück wenn kein Track mit Preview verfügbar ist.
 */
export async function getArtistTopTrack(
  artistId: string
): Promise<SpotifyTopTrack | null> {
  const token = await getSpotifyToken();

  const response = await fetch(
    `${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks?market=DE`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    throw new Error(`Spotify Top-Tracks Fehler: ${response.status}`);
  }

  const data = (await response.json()) as {
    tracks: Array<{
      id: string;
      name: string;
      preview_url: string | null;
      duration_ms: number;
      album: { name: string; images: SpotifyArtistImage[] };
      track_number: number;
      external_urls: { spotify: string };
    }>;
  };

  const tracks = data.tracks ?? [];

  // Ersten Track mit Preview-URL bevorzugen
  const trackWithPreview = tracks.find((t) => t.preview_url) ?? tracks[0] ?? null;

  if (!trackWithPreview) return null;

  const albumImage =
    trackWithPreview.album.images.find((img) => img.height >= 300 && img.height <= 640)?.url ??
    trackWithPreview.album.images[0]?.url ??
    null;

  return {
    id: trackWithPreview.id,
    name: trackWithPreview.name,
    preview_url: trackWithPreview.preview_url,
    duration_ms: trackWithPreview.duration_ms,
    album_name: trackWithPreview.album.name,
    album_image_url: albumImage,
    track_number: trackWithPreview.track_number,
    external_url: trackWithPreview.external_urls.spotify,
  };
}
