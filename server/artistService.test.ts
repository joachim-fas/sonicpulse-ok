import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests für den Artist Service – zentrale Garantie:
 * KEIN Link der Form open.spotify.com/search/... wird jemals zurückgegeben.
 * Nur echte Artist-IDs (open.spotify.com/artist/{ID}) oder null.
 */

// Spotify und MusicBrainz Module mocken
vi.mock("./spotify", () => ({
  searchSpotifyArtist: vi.fn(),
}));

vi.mock("./musicbrainz", () => ({
  searchMusicBrainzArtist: vi.fn(),
}));

import { searchSpotifyArtist } from "./spotify";
import { searchMusicBrainzArtist } from "./musicbrainz";
import { resolveArtist, resolveMultipleArtists } from "./artistService";

const mockSpotify = vi.mocked(searchSpotifyArtist);
const mockMB      = vi.mocked(searchMusicBrainzArtist);

const SPOTIFY_RESULT = {
  display_name: "Coldplay",
  spotify_name: "Coldplay",
  spotify_id:   "4gzpq5DPGxSnKTe4SA8HAU",
  direct_link:  "https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU",
  image_url:    "https://i.scdn.co/image/test.jpg",
  genres:       ["pop", "rock"],
  followers:    25000000,
  popularity:   88,
};

const MB_RESULT = {
  mb_id:        "cc197bad-dc9c-440d-a5b5-d52ba2e14234",
  name:         "Coldplay",
  spotify_id:   "4gzpq5DPGxSnKTe4SA8HAU",
  spotify_url:  "https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU",
  genres:       ["pop", "rock"],
  country:      "GB",
  disambiguation: null,
};

describe("resolveArtist – Kerngarantie: Nur echte Artist-IDs", () => {
  beforeEach(() => {
    mockSpotify.mockReset();
    mockMB.mockReset();
  });

  it("gibt echte Spotify-ID zurück wenn Spotify API verfügbar ist", async () => {
    mockSpotify.mockResolvedValueOnce(SPOTIFY_RESULT);

    const result = await resolveArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBe("4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.direct_link).toBe("https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.direct_link).not.toContain("/search/");
    expect(result!.source).toBe("spotify");
  });

  it("fällt auf MusicBrainz zurück wenn Spotify 403 gibt", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("Spotify Search-Fehler: 403"));
    mockMB.mockResolvedValueOnce(MB_RESULT);

    const result = await resolveArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBe("4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.direct_link).toBe("https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.direct_link).not.toContain("/search/");
    expect(result!.source).toBe("musicbrainz");
    expect(mockMB).toHaveBeenCalledWith("Coldplay");
  });

  it("gibt null zurück wenn Spotify keinen Treffer hat und MusicBrainz auch nicht", async () => {
    mockSpotify.mockResolvedValueOnce(null);
    mockMB.mockResolvedValueOnce(null);

    const result = await resolveArtist("xyznonexistent999");

    // KEIN Suche-Link – null ist die korrekte Antwort
    expect(result).toBeNull();
  });

  it("gibt null zurück wenn Künstler in MusicBrainz gefunden aber ohne Spotify-ID", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockResolvedValueOnce({
      ...MB_RESULT,
      spotify_id:  null,
      spotify_url: null,
    });

    const result = await resolveArtist("UnbekannterKünstler");

    // Auch hier: null statt /search/-Link
    expect(result).toBeNull();
  });

  it("konstruiert direct_link immer als /artist/{ID} – niemals als /search/", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockResolvedValueOnce(MB_RESULT);

    const result = await resolveArtist("Coldplay");

    expect(result!.direct_link).toMatch(/^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]{22}$/);
    expect(result!.direct_link).not.toContain("/search/");
    expect(result!.direct_link).not.toContain(encodeURIComponent("Coldplay"));
  });

  it("fällt auf MusicBrainz zurück auch bei anderen Spotify-Fehlern (5xx, Netzwerk)", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("Spotify Search-Fehler: 500"));
    mockMB.mockResolvedValueOnce(MB_RESULT);

    const result = await resolveArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("musicbrainz");
  });

  it("gibt null zurück wenn beide APIs fehlschlagen", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockRejectedValueOnce(new Error("MusicBrainz nicht erreichbar"));

    const result = await resolveArtist("Coldplay");

    expect(result).toBeNull();
  });
});

describe("resolveMultipleArtists – Batch-Verarbeitung", () => {
  beforeEach(() => {
    mockSpotify.mockReset();
    mockMB.mockReset();
  });

  it("verarbeitet mehrere Künstler und gibt für jeden null oder Profil zurück", async () => {
    mockSpotify
      .mockResolvedValueOnce(SPOTIFY_RESULT)
      .mockResolvedValueOnce(null);
    mockMB.mockResolvedValueOnce(null);

    const results = await resolveMultipleArtists(["Coldplay", "UnbekannterKünstler"]);

    expect(results).toHaveLength(2);
    expect(results[0]).not.toBeNull();
    expect(results[0]!.direct_link).not.toContain("/search/");
    expect(results[1]).toBeNull(); // Kein Link für nicht gefundenen Künstler
  });

  it("kein Ergebnis enthält einen /search/-Link", async () => {
    mockSpotify
      .mockResolvedValueOnce(SPOTIFY_RESULT)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("403"));
    mockMB.mockResolvedValueOnce(null);

    const results = await resolveMultipleArtists(["Coldplay", "Unbekannt1", "Unbekannt2"]);

    for (const result of results) {
      if (result) {
        expect(result.direct_link).not.toContain("/search/");
        expect(result.direct_link).toMatch(/open\.spotify\.com\/artist\//);
      }
    }
  });
});
