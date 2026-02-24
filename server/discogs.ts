/**
 * Discogs API Integration
 * Liefert Künstlerbiografien, Diskografien und zusätzliche Metadaten
 */

const DISCOGS_API_BASE = "https://api.discogs.com";

interface DiscogsArtistRaw {
  id: number;
  name: string;
  profile: string;
  images?: Array<{ type: string; uri: string; uri150: string }>;
  urls?: string[];
  namevariations?: string[];
  members?: Array<{ id: number; name: string; active: boolean }>;
}

interface DiscogsRelease {
  id: number;
  title: string;
  year?: number;
  type: string;
  format?: string;
  thumb?: string;
  role?: string;
}

export interface DiscogsArtistData {
  discogs_id: string;
  name: string;
  profile: string;
  image_url: string | null;
  urls: string[];
  name_variations: string[];
  members: Array<{ id: number; name: string; active: boolean }>;
  releases: DiscogsRelease[];
}

function getDiscogsHeaders() {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) throw new Error("DISCOGS_TOKEN nicht gesetzt");
  return {
    Authorization: `Discogs token=${token}`,
    "User-Agent": "SpotifyArtistApp/1.0 +https://manus.space",
  };
}

/**
 * Sucht einen Künstler auf Discogs anhand des Namens.
 * Gibt null zurück wenn kein Treffer gefunden wird.
 */
export async function searchDiscogsArtist(
  artistName: string
): Promise<DiscogsArtistData | null> {
  const params = new URLSearchParams({
    q: artistName,
    type: "artist",
    per_page: "1",
  });

  const searchResponse = await fetch(
    `${DISCOGS_API_BASE}/database/search?${params}`,
    { headers: getDiscogsHeaders() }
  );

  if (!searchResponse.ok) {
    console.warn(`Discogs Search-Fehler: ${searchResponse.status}`);
    return null;
  }

  const searchData = (await searchResponse.json()) as {
    results: Array<{ id: number; type: string; title: string }>;
  };

  const artistResult = searchData.results?.find((r) => r.type === "artist");
  if (!artistResult) return null;

  // Detailseite des Künstlers abrufen
  const detailResponse = await fetch(
    `${DISCOGS_API_BASE}/artists/${artistResult.id}`,
    { headers: getDiscogsHeaders() }
  );

  if (!detailResponse.ok) {
    console.warn(`Discogs Detail-Fehler: ${detailResponse.status}`);
    return null;
  }

  const artist = (await detailResponse.json()) as DiscogsArtistRaw;

  // Releases abrufen (max. 10)
  const releasesResponse = await fetch(
    `${DISCOGS_API_BASE}/artists/${artist.id}/releases?per_page=10&sort=year&sort_order=desc`,
    { headers: getDiscogsHeaders() }
  );

  let releases: DiscogsRelease[] = [];
  if (releasesResponse.ok) {
    const releasesData = (await releasesResponse.json()) as {
      releases: DiscogsRelease[];
    };
    releases = releasesData.releases ?? [];
  }

  const primaryImage =
    artist.images?.find((img) => img.type === "primary")?.uri ??
    artist.images?.[0]?.uri ??
    null;

  return {
    discogs_id: String(artist.id),
    name: artist.name,
    profile: artist.profile ?? "",
    image_url: primaryImage,
    urls: artist.urls ?? [],
    name_variations: artist.namevariations ?? [],
    members: artist.members ?? [],
    releases,
  };
}
