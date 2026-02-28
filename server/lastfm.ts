/**
 * Last.fm API Service
 * Docs: https://www.last.fm/api
 */

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";

function getApiKey(): string {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("LASTFM_API_KEY not set");
  return key;
}

async function lastfmFetch(params: Record<string, string>): Promise<unknown> {
  const url = new URL(LASTFM_BASE);
  url.searchParams.set("api_key", getApiKey());
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SonicPulse/1.0" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Last.fm HTTP ${res.status}`);
  return res.json();
}

export interface LastfmArtistInfo {
  name: string;
  image: string | null;       // largest available image URL
  listeners: number;
  playcount: number;
  bio: string | null;
  tags: string[];
  url: string;
}

export interface LastfmSimilarArtist {
  name: string;
  match: number;              // 0–1 similarity score
  image: string | null;
  url: string;
}

export interface LastfmTopTrack {
  name: string;
  playcount: number;
  url: string;
}

/** Pick the largest image from Last.fm image array */
function pickImage(images: Array<{ "#text": string; size: string }> | undefined): string | null {
  if (!images) return null;
  const preferred = ["extralarge", "large", "medium", "small"];
  for (const size of preferred) {
    const img = images.find((i) => i.size === size);
    if (img?.["#text"] && img["#text"].trim() !== "") return img["#text"];
  }
  return null;
}

/**
 * Get artist info including image, bio, tags, listener count.
 * Returns null if artist not found.
 */
export async function getArtistInfo(artistName: string): Promise<LastfmArtistInfo | null> {
  try {
    const data = await lastfmFetch({ method: "artist.getInfo", artist: artistName, autocorrect: "1" }) as {
      artist?: {
        name: string;
        url: string;
        stats?: { listeners: string; playcount: string };
        bio?: { summary: string };
        tags?: { tag: Array<{ name: string }> };
        image?: Array<{ "#text": string; size: string }>;
      };
      error?: number;
    };

    if (data.error || !data.artist) return null;

    const a = data.artist;
    const image = pickImage(a.image);
    // Skip placeholder "2a96cbd8b46e442fc41c2b86b821562f" (Last.fm default empty image)
    const validImage = image && !image.includes("2a96cbd8b46e442fc41c2b86b821562f") ? image : null;

    return {
      name: a.name,
      image: validImage,
      listeners: parseInt(a.stats?.listeners ?? "0", 10),
      playcount: parseInt(a.stats?.playcount ?? "0", 10),
      bio: a.bio?.summary
        ? a.bio.summary.replace(/<a[^>]*>.*?<\/a>/g, "").replace(/<[^>]+>/g, "").trim().slice(0, 300) || null
        : null,
      tags: (a.tags?.tag ?? []).slice(0, 5).map((t) => t.name),
      url: a.url,
    };
  } catch {
    return null;
  }
}

/**
 * Get similar artists with similarity scores.
 * Returns up to `limit` similar artists.
 */
export async function getSimilarArtists(artistName: string, limit = 5): Promise<LastfmSimilarArtist[]> {
  try {
    const data = await lastfmFetch({
      method: "artist.getSimilar",
      artist: artistName,
      autocorrect: "1",
      limit: String(limit),
    }) as {
      similarartists?: {
        artist?: Array<{
          name: string;
          match: string;
          url: string;
          image?: Array<{ "#text": string; size: string }>;
        }>;
      };
      error?: number;
    };

    if (data.error || !data.similarartists?.artist) return [];

    return data.similarartists.artist.map((a) => ({
      name: a.name,
      match: parseFloat(a.match),
      image: pickImage(a.image),
      url: a.url,
    }));
  } catch {
    return [];
  }
}

/**
 * Get top tracks for an artist.
 * Returns up to `limit` top tracks.
 */
export async function getTopTracks(artistName: string, limit = 3): Promise<LastfmTopTrack[]> {
  try {
    const data = await lastfmFetch({
      method: "artist.getTopTracks",
      artist: artistName,
      autocorrect: "1",
      limit: String(limit),
    }) as {
      toptracks?: {
        track?: Array<{
          name: string;
          playcount: string;
          url: string;
        }>;
      };
      error?: number;
    };

    if (data.error || !data.toptracks?.track) return [];

    return data.toptracks.track.map((t) => ({
      name: t.name,
      playcount: parseInt(t.playcount, 10),
      url: t.url,
    }));
  } catch {
    return [];
  }
}

export interface LastfmArtistSearchResult {
  name: string;
  listeners: number;
  mbid: string | null;
  url: string;
}

/**
 * Search artists by name (autocomplete).
 * Returns up to `limit` matching artists sorted by relevance.
 */
export async function searchArtists(query: string, limit = 5): Promise<LastfmArtistSearchResult[]> {
  try {
    const data = await lastfmFetch({
      method: "artist.search",
      artist: query,
      limit: String(limit),
    }) as {
      results?: {
        artistmatches?: {
          artist?: Array<{
            name: string;
            listeners: string;
            mbid: string;
            url: string;
          }>;
        };
      };
      error?: number;
    };

    const artists = data.results?.artistmatches?.artist ?? [];
    return artists.map((a) => ({
      name: a.name,
      listeners: parseInt(a.listeners ?? "0", 10),
      mbid: a.mbid || null,
      url: a.url,
    }));
  } catch {
    return [];
  }
}

/**
 * Validate that the API key works by fetching info for a well-known artist.
 */
export async function validateApiKey(): Promise<boolean> {
  try {
    const info = await getArtistInfo("Radiohead");
    return info !== null && info.name.length > 0;
  } catch {
    return false;
  }
}
