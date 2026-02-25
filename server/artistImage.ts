/**
 * Artist Image Service
 *
 * Beschafft Künstlerbilder über Discogs (primär) als Fallback wenn
 * Spotify keine Bilder liefert (z.B. im Development Mode / 403).
 *
 * Discogs liefert hochwertige Bilder für praktisch alle bekannten Künstler.
 */

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN ?? "";

interface DiscogsSearchResult {
  results?: Array<{
    title?: string;
    cover_image?: string;
    thumb?: string;
    id?: number;
  }>;
}

/**
 * Sucht ein Künstlerbild über die Discogs API.
 * Gibt die URL des besten verfügbaren Bildes zurück, oder null.
 */
export async function getArtistImageFromDiscogs(artistName: string): Promise<string | null> {
  if (!DISCOGS_TOKEN) {
    console.warn("[ArtistImage] DISCOGS_TOKEN nicht gesetzt");
    return null;
  }

  try {
    const query = encodeURIComponent(artistName);
    const url = `https://api.discogs.com/database/search?q=${query}&type=artist&token=${DISCOGS_TOKEN}&per_page=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SonicPulse/1.0 (contact@sonicpulse.app)",
      },
    });

    if (!res.ok) {
      console.warn(`[ArtistImage] Discogs ${res.status} für "${artistName}"`);
      return null;
    }

    const data = await res.json() as DiscogsSearchResult;
    const first = data.results?.[0];

    if (!first) return null;

    // cover_image bevorzugen (höhere Auflösung), thumb als Fallback
    const imageUrl = first.cover_image ?? first.thumb ?? null;

    // Discogs gibt manchmal Platzhalter-URLs zurück – diese filtern
    if (imageUrl && imageUrl.includes("spacer.gif")) return null;

    return imageUrl ?? null;
  } catch (err) {
    console.warn(`[ArtistImage] Discogs Fehler für "${artistName}":`, err);
    return null;
  }
}
