/**
 * Wikidata API Integration
 * Öffentliche API – kein Token erforderlich.
 * Liefert Spotify Artist-ID über Wikidata Property P1902.
 * Wird als zweiter Fallback verwendet wenn MusicBrainz nicht erreichbar ist.
 *
 * REGEL: Gibt ausschließlich echte Spotify-IDs zurück.
 * Konstruiert NIEMALS einen /search/-Link.
 *
 * VERBESSERUNG v2: Prüft bis zu 5 Kandidaten (nicht nur den ersten),
 * da der erste Treffer oft ein Album/Film/etc. ist ohne Spotify-ID.
 * VERBESSERUNG v3: Normalisierter Fallback-Name für Sonderzeichen-Namen
 * (z.B. C.O.F.F.I.N → COFFIN, P!nk → Pnk).
 */

const WD_API = "https://www.wikidata.org/w/api.php";
const WD_USER_AGENT = "SonicPulse/1.0 (contact@sonicpulse.app)";

export interface WikidataArtistResult {
  qid: string;
  name: string;
  spotify_id: string;
  direct_link: string;
}

/**
 * Normalisiert einen Künstlernamen für die Suche:
 * Entfernt Sonderzeichen (Punkte, Ausrufezeichen etc.) die Wikidata verwirren könnten.
 * Beispiel: "C.O.F.F.I.N" → "COFFIN", "P!nk" → "Pnk"
 */
function normalizeForSearch(name: string): string {
  return name
    .replace(/\./g, "")   // C.O.F.F.I.N → COFFIN
    .replace(/!/g, "")    // P!nk → Pnk
    .replace(/\s+/g, " ") // mehrfache Leerzeichen
    .trim();
}

/**
 * Holt die Spotify-ID (P1902) für eine Wikidata-Entity via wbgetentities.
 * Schneller als EntityData-Endpoint, da nur Claims geladen werden.
 */
async function getSpotifyIdForQid(qid: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims",
    format: "json",
  });

  const res = await fetch(`${WD_API}?${params}`, {
    headers: { "User-Agent": WD_USER_AGENT, Accept: "application/json" },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    entities: Record<
      string,
      {
        claims: Record<
          string,
          Array<{ mainsnak: { datavalue?: { value: string } } }>
        >;
      }
    >;
  };

  const claims = data.entities[qid]?.claims ?? {};
  const spotifyClaims = claims["P1902"] ?? [];
  return spotifyClaims[0]?.mainsnak?.datavalue?.value ?? null;
}

/** Musik-Keywords für Kandidaten-Priorisierung */
const MUSIC_KEYWORDS = [
  "band", "musician", "singer", "rapper", "artist", "group",
  "duo", "trio", "quartet", "punk", "rock", "pop", "jazz",
  "metal", "hip-hop", "electronic", "indie", "alternative",
  "hardcore", "grunge", "folk", "country", "blues", "soul",
  "reggae", "ska", "noise", "post-punk", "shoegaze",
];

/**
 * Sucht Kandidaten auf Wikidata und prüft sie auf P1902 (Spotify Artist ID).
 * Interne Hilfsfunktion für searchWikidataArtist.
 */
async function searchAndResolve(
  searchName: string,
  originalName: string
): Promise<WikidataArtistResult | null> {
  const searchParams = new URLSearchParams({
    action: "wbsearchentities",
    search: searchName,
    language: "en",
    type: "item",
    limit: "5",
    format: "json",
  });

  const searchRes = await fetch(`${WD_API}?${searchParams}`, {
    headers: { "User-Agent": WD_USER_AGENT, Accept: "application/json" },
  });

  if (!searchRes.ok) {
    throw new Error(`Wikidata Search-Fehler: ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    search: Array<{ id: string; label: string; description?: string }>;
  };

  const candidates = searchData.search ?? [];
  if (candidates.length === 0) return null;

  // Sortiere: Musik-Kandidaten zuerst
  const sorted = [...candidates].sort((a, b) => {
    const aIsMusic = MUSIC_KEYWORDS.some(k =>
      (a.description ?? "").toLowerCase().includes(k)
    );
    const bIsMusic = MUSIC_KEYWORDS.some(k =>
      (b.description ?? "").toLowerCase().includes(k)
    );
    if (aIsMusic && !bIsMusic) return -1;
    if (!aIsMusic && bIsMusic) return 1;
    return 0;
  });

  // Alle Kandidaten auf P1902 (Spotify Artist ID) prüfen
  for (const candidate of sorted) {
    try {
      const spotifyId = await getSpotifyIdForQid(candidate.id);
      if (spotifyId) {
        console.info(
          `[Wikidata] "${originalName}" → ${candidate.label} (${candidate.id}) → Spotify: ${spotifyId}`
        );
        return {
          qid: candidate.id,
          name: candidate.label ?? originalName,
          spotify_id: spotifyId,
          direct_link: `https://open.spotify.com/artist/${spotifyId}`,
        };
      }
    } catch {
      // Einzelnen Kandidaten-Fehler ignorieren, weiter zum nächsten
    }
  }

  return null;
}

/**
 * Sucht einen Künstler über Wikidata und extrahiert die Spotify-ID (P1902).
 * Prüft bis zu 5 Kandidaten um den richtigen Künstler zu finden.
 * Bevorzugt Kandidaten deren Beschreibung auf Musiker/Band hindeutet.
 * Versucht bei Sonderzeichen-Namen auch einen normalisierten Fallback.
 */
export async function searchWikidataArtist(
  artistName: string
): Promise<WikidataArtistResult | null> {
  // Schritt 1: Suche mit originalem Namen
  const result = await searchAndResolve(artistName, artistName);
  if (result) return result;

  // Schritt 2: Fallback mit normalisiertem Namen (Sonderzeichen entfernt)
  const normalized = normalizeForSearch(artistName);
  if (normalized !== artistName && normalized.length >= 2) {
    console.info(`[Wikidata] "${artistName}" nicht gefunden – versuche normalisiert: "${normalized}"`);
    const fallbackResult = await searchAndResolve(normalized, artistName);
    if (fallbackResult) return fallbackResult;
  }

  return null;
}
