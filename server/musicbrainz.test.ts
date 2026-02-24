import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch für MusicBrainz Tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const MB_SEARCH_RESPONSE = {
  artists: [
    {
      id: "cc197bad-dc9c-440d-a5b5-d52ba2e14234",
      name: "Coldplay",
      country: "GB",
      disambiguation: "",
    },
  ],
};

const MB_DETAIL_RESPONSE = {
  id: "cc197bad-dc9c-440d-a5b5-d52ba2e14234",
  name: "Coldplay",
  country: "GB",
  disambiguation: "",
  relations: [
    {
      type: "streaming music",
      url: { resource: "https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU" },
    },
    {
      type: "social network",
      url: { resource: "https://www.instagram.com/coldplay" },
    },
  ],
  tags: [
    { name: "pop", count: 10 },
    { name: "rock", count: 8 },
    { name: "alternative", count: 6 },
  ],
};

describe("MusicBrainz Fallback", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("extrahiert Spotify-ID korrekt aus MusicBrainz Relations", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MB_SEARCH_RESPONSE,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MB_DETAIL_RESPONSE,
      });

    const { searchMusicBrainzArtist } = await import("./musicbrainz");
    const result = await searchMusicBrainzArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Coldplay");
    expect(result!.spotify_id).toBe("4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.spotify_url).toBe("https://open.spotify.com/artist/4gzpq5DPGxSnKTe4SA8HAU");
    expect(result!.genres).toContain("pop");
    expect(result!.country).toBe("GB");
  });

  it("gibt null zurück wenn kein Künstler gefunden", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ artists: [] }),
    });

    const { searchMusicBrainzArtist } = await import("./musicbrainz");
    const result = await searchMusicBrainzArtist("xyznonexistentartist12345");

    expect(result).toBeNull();
  });

  it("gibt spotify_id als null zurück wenn keine Spotify-Relation vorhanden", async () => {
    const detailWithoutSpotify = {
      ...MB_DETAIL_RESPONSE,
      relations: [
        { type: "social network", url: { resource: "https://www.instagram.com/coldplay" } },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => MB_SEARCH_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => detailWithoutSpotify });

    const { searchMusicBrainzArtist } = await import("./musicbrainz");
    const result = await searchMusicBrainzArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBeNull();
    expect(result!.spotify_url).toBeNull();
  });

  it("wirft Fehler bei HTTP-Fehler der Search-API", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const { searchMusicBrainzArtist } = await import("./musicbrainz");
    await expect(searchMusicBrainzArtist("Coldplay")).rejects.toThrow("503");
  });

  it("gibt Genres nach Häufigkeit sortiert zurück (max 5)", async () => {
    const detailWithManyTags = {
      ...MB_DETAIL_RESPONSE,
      tags: [
        { name: "pop", count: 10 },
        { name: "rock", count: 8 },
        { name: "alternative", count: 6 },
        { name: "indie", count: 4 },
        { name: "british", count: 3 },
        { name: "electronic", count: 2 },
        { name: "ambient", count: 1 },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => MB_SEARCH_RESPONSE })
      .mockResolvedValueOnce({ ok: true, json: async () => detailWithManyTags });

    const { searchMusicBrainzArtist } = await import("./musicbrainz");
    const result = await searchMusicBrainzArtist("Coldplay");

    expect(result!.genres).toHaveLength(5);
    expect(result!.genres[0]).toBe("pop"); // Höchste Häufigkeit zuerst
    expect(result!.genres[4]).toBe("british");
  });
});
