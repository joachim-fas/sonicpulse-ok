import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests für den Artist Service – dreistufige Fallback-Kette
 * Spotify → MusicBrainz (mit Retry) → Wikidata
 *
 * KRITISCHE GARANTIE: Kein direct_link darf /search/ enthalten.
 * Nur echte Artist-IDs (open.spotify.com/artist/{ID}) oder null.
 */

vi.mock("./spotify", () => ({
  searchSpotifyArtist: vi.fn(),
}));

vi.mock("./musicbrainz", () => ({
  searchMusicBrainzArtist: vi.fn(),
}));

vi.mock("./wikidata", () => ({
  searchWikidataArtist: vi.fn(),
}));

import { searchSpotifyArtist } from "./spotify";
import { searchMusicBrainzArtist } from "./musicbrainz";
import { searchWikidataArtist } from "./wikidata";
import { resolveArtist, resolveMultipleArtists } from "./artistService";

const mockSpotify = vi.mocked(searchSpotifyArtist);
const mockMB = vi.mocked(searchMusicBrainzArtist);
const mockWD = vi.mocked(searchWikidataArtist);

const SPOTIFY_RESULT = {
  display_name: "Coldplay",
  spotify_name: "Coldplay",
  spotify_id: "4gzpq5DPGxSnKTe4SA8HAU",
  direct_link: "https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU",
  image_url: "https://i.scdn.co/image/test.jpg",
  genres: ["pop", "rock"],
  followers: 25000000,
  popularity: 88,
};

const MB_RESULT = {
  mb_id: "cc197bad-dc9c-440d-a5b5-d52ba2e14234",
  name: "Coldplay",
  spotify_id: "4gzpq5DPGxSnKTe4SA8HAU",
  spotify_url: "https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU",
  genres: ["pop", "rock"],
  country: "GB",
  disambiguation: null,
};

const WD_RESULT = {
  qid: "Q44190",
  name: "Radiohead",
  spotify_id: "4Z8W4fKeB5YxbusRsdQVPb",
  direct_link: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
};

describe("resolveArtist – Stufe 1: Spotify", () => {
  beforeEach(() => {
    mockSpotify.mockReset();
    mockMB.mockReset();
    mockWD.mockReset();
  });

  it("gibt echte Spotify-ID zurück wenn Spotify API verfügbar ist", async () => {
    mockSpotify.mockResolvedValueOnce(SPOTIFY_RESULT);

    const result = await resolveArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBe("4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.direct_link).toBe("https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.direct_link).not.toContain("/search/");
    expect(result!.source).toBe("spotify");
    expect(mockMB).not.toHaveBeenCalled();
    expect(mockWD).not.toHaveBeenCalled();
  });
});

describe("resolveArtist – Stufe 2: MusicBrainz Fallback", () => {
  beforeEach(() => {
    mockSpotify.mockReset();
    mockMB.mockReset();
    mockWD.mockReset();
  });

  it("fällt auf MusicBrainz zurück wenn Spotify 403 gibt", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("Spotify Search-Fehler: 403"));
    mockMB.mockResolvedValue(MB_RESULT);

    const result = await resolveArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("musicbrainz");
    expect(result!.direct_link).not.toContain("/search/");
    expect(mockWD).not.toHaveBeenCalled();
  });

  it("gibt null zurück wenn MusicBrainz Künstler ohne Spotify-ID findet", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockResolvedValue({ ...MB_RESULT, spotify_id: null, spotify_url: null });
    mockWD.mockResolvedValueOnce(null);

    const result = await resolveArtist("ObscureArtist");
    expect(result).toBeNull();
  });
});

describe("resolveArtist – Stufe 3: Wikidata Fallback", () => {
  beforeEach(() => {
    mockSpotify.mockReset();
    mockMB.mockReset();
    mockWD.mockReset();
  });

  it("fällt auf Wikidata zurück wenn MusicBrainz fetch failed", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockRejectedValue(new Error("fetch failed")); // alle Retries schlagen fehl
    mockWD.mockResolvedValueOnce(WD_RESULT);

    const result = await resolveArtist("Radiohead");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("wikidata");
    expect(result!.spotify_id).toBe("4Z8W4fKeB5YxbusRsdQVPb");
    expect(result!.direct_link).toBe("https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb");
    expect(result!.direct_link).not.toContain("/search/");
  }, 15000);

  it("gibt null zurück wenn alle drei Quellen fehlschlagen", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockRejectedValue(new Error("fetch failed"));
    mockWD.mockRejectedValueOnce(new Error("503"));

    const result = await resolveArtist("UnknownBandXYZ");
    expect(result).toBeNull();
  }, 15000);

  it("KRITISCH: direct_link ist immer /artist/{ID} – niemals /search/", async () => {
    mockSpotify.mockRejectedValueOnce(new Error("403"));
    mockMB.mockRejectedValue(new Error("fetch failed"));
    mockWD.mockResolvedValueOnce(WD_RESULT);

    const result = await resolveArtist("Radiohead");

    expect(result!.direct_link).toMatch(/^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+$/);
    expect(result!.direct_link).not.toContain("/search/");
    expect(result!.direct_link).not.toContain(encodeURIComponent("Radiohead"));
  }, 15000);
});

describe("resolveMultipleArtists – Batch-Verarbeitung", () => {
  beforeEach(() => {
    mockSpotify.mockReset();
    mockMB.mockReset();
    mockWD.mockReset();
  });

  it("verarbeitet mehrere Künstler und gibt für jeden null oder Profil zurück", async () => {
    mockSpotify
      .mockResolvedValueOnce(SPOTIFY_RESULT)
      .mockResolvedValueOnce(null);
    mockMB.mockResolvedValue(null);
    mockWD.mockResolvedValue(null);

    const results = await resolveMultipleArtists(["Coldplay", "UnbekannterKünstler"]);

    expect(results).toHaveLength(2);
    expect(results[0]).not.toBeNull();
    expect(results[0]!.direct_link).not.toContain("/search/");
    expect(results[1]).toBeNull();
  });

  it("KRITISCH: kein Ergebnis enthält einen /search/-Link", async () => {
    mockSpotify.mockRejectedValue(new Error("403"));
    mockMB.mockRejectedValue(new Error("fetch failed"));
    mockWD
      .mockResolvedValueOnce(WD_RESULT)
      .mockResolvedValueOnce({ ...WD_RESULT, name: "Coldplay", spotify_id: "4gzpq5DPGxSnKTe4SA8HAU", direct_link: "https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU" });

    const results = await resolveMultipleArtists(["Radiohead", "Coldplay"]);

    for (const r of results) {
      if (r) {
        expect(r.direct_link).not.toContain("/search/");
        expect(r.direct_link).toMatch(/^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+$/);
      }
    }
  }, 15000);
});
