/**
 * Wikidata API Integration
 * Öffentliche API – kein Token erforderlich.
 * Liefert Spotify Artist-ID über Wikidata Property P1902.
 * Wird als zweiter Fallback verwendet wenn MusicBrainz nicht erreichbar ist.
 *
 * REGEL: Gibt ausschließlich echte Spotify-IDs zurück.
 * Konstruiert NIEMALS einen /search/-Link.
 */

const WD_API = "https://www.wikidata.org/w/api.php";
const WD_ENTITY_API = "https://www.wikidata.org/wiki/Special:EntityData";
const WD_USER_AGENT = "SpotifyArtistApp/1.0 (contact@example.com)";

export interface WikidataArtistResult {
  qid: string;
  name: string;
  spotify_id: string;
  direct_link: string;
}

/**
 * Sucht einen Künstler über Wikidata und extrahiert die Spotify-ID (P1902).
 * Zwei API-Calls: 1) Entity-Suche, 2) P1902-Claim abrufen.
 */
export async function searchWikidataArtist(
  artistName: string
): Promise<WikidataArtistResult | null> {
  // Schritt 1: Wikidata-Entity-ID (QID) suchen
  const searchParams = new URLSearchParams({
    action: "wbsearchentities",
    search: artistName,
    language: "en",
    type: "item",
    limit: "1",
    format: "json",
  });

  const searchRes = await fetch(`${WD_API}?${searchParams}`, {
    headers: { "User-Agent": WD_USER_AGENT, Accept: "application/json" },
  });

  if (!searchRes.ok) {
    throw new Error(`Wikidata Search-Fehler: ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    search: Array<{ id: string; label: string }>;
  };

  const entity = searchData.search?.[0];
  if (!entity) return null;

  const qid = entity.id;

  // Schritt 2: P1902 (Spotify Artist ID) aus Entity-Daten lesen
  const entityRes = await fetch(`${WD_ENTITY_API}/${qid}.json`, {
    headers: { "User-Agent": WD_USER_AGENT, Accept: "application/json" },
  });

  if (!entityRes.ok) {
    throw new Error(`Wikidata Entity-Fehler: ${entityRes.status}`);
  }

  const entityData = (await entityRes.json()) as {
    entities: Record<
      string,
      {
        claims: Record<
          string,
          Array<{
            mainsnak: {
              datavalue?: { value: string };
            };
          }>
        >;
        labels?: Record<string, { value: string }>;
      }
    >;
  };

  const claims = entityData.entities[qid]?.claims ?? {};

  // P1902 = Spotify Artist ID
  const spotifyClaims = claims["P1902"] ?? [];
  const spotifyId = spotifyClaims[0]?.mainsnak?.datavalue?.value;

  if (!spotifyId) return null;

  // Offiziellen Namen aus Labels holen (Fallback: Sucheingabe)
  const name =
    entityData.entities[qid]?.labels?.["en"]?.value ?? entity.label ?? artistName;

  return {
    qid,
    name,
    spotify_id: spotifyId,
    direct_link: `https://open.spotify.com/artist/${spotifyId}`,
  };
}
