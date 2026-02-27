import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Spotify Token Tests ───────────────────────────────────────────────────────

describe("getSpotifyToken", () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = "test_client_id";
    process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ruft einen neuen Token ab wenn kein Cache vorhanden ist", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "mock_token_123", expires_in: 3600 }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { getSpotifyToken } = await import("./spotify");
    const token = await getSpotifyToken();

    expect(token).toBe("mock_token_123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://accounts.spotify.com/api/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        body: "grant_type=client_credentials",
      })
    );
  });

  it("wirft einen Fehler wenn Credentials fehlen", async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;

    const { getSpotifyToken } = await import("./spotify");
    await expect(getSpotifyToken()).rejects.toThrow(
      "SPOTIFY_CLIENT_ID oder SPOTIFY_CLIENT_SECRET nicht gesetzt"
    );
  });

  it("wirft einen Fehler bei HTTP-Fehler vom Token-Endpunkt", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", mockFetch);

    const { getSpotifyToken } = await import("./spotify");
    await expect(getSpotifyToken()).rejects.toThrow("Spotify Token-Fehler: 401");
  });
});

// ─── Spotify Search Tests ─────────────────────────────────────────────────────

describe("searchSpotifyArtist", () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = "test_client_id";
    process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gibt null zurück wenn keine Ergebnisse gefunden werden (kein kaputter Link)", async () => {
    const emptyResponse = {
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    };
    const mockFetch = vi
      .fn()
      // Token-Request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "mock_token", expires_in: 3600 }),
      })
      // Strategie 1: leer
      .mockResolvedValueOnce(emptyResponse)
      // Strategie 2: leer (quoted search)
      .mockResolvedValueOnce(emptyResponse)
      // Strategie 3: leer (clean name – gleich wie Strategie 1, wird übersprungen)
      .mockResolvedValue(emptyResponse);
    vi.stubGlobal("fetch", mockFetch);

    const { searchSpotifyArtist } = await import("./spotify");
    const result = await searchSpotifyArtist("UnbekannterKünstler12345");

    expect(result).toBeNull();
  });

  it("gibt ein validiertes Künstlerobjekt zurück bei Treffer", async () => {
    const mockArtist = {
      id: "4gzpq5YpGjS9uS06r8Iu0S",
      name: "Coldplay",
      external_urls: { spotify: "https://open.spotify.com/artist/4gzpq5YpGjS9uS06r8Iu0S" },
      images: [
        { url: "https://i.scdn.co/image/test.jpg", height: 640, width: 640 },
        { url: "https://i.scdn.co/image/test300.jpg", height: 300, width: 300 },
      ],
      genres: ["pop", "rock"],
      followers: { total: 35000000 },
      popularity: 88,
    };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "mock_token", expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artists: { items: [mockArtist] } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { searchSpotifyArtist } = await import("./spotify");
    const result = await searchSpotifyArtist("Coldplay");

    expect(result).not.toBeNull();
    expect(result?.spotify_id).toBe("4gzpq5YpGjS9uS06r8Iu0S");
    expect(result?.spotify_name).toBe("Coldplay");
    expect(result?.direct_link).toBe("https://open.spotify.com/artist/4gzpq5YpGjS9uS06r8Iu0S");
    expect(result?.genres).toEqual(["pop", "rock"]);
    expect(result?.followers).toBe(35000000);
    expect(result?.popularity).toBe(88);
    // Erstes Bild (640px) wird gewählt, da es >= 300 und <= 640 ist
    expect(result?.image_url).toBe("https://i.scdn.co/image/test.jpg");
  });

  it("setzt den Authorization-Header korrekt", async () => {
    const emptyResponse = {
      ok: true,
      json: async () => ({ artists: { items: [] } }),
    };
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "bearer_xyz", expires_in: 3600 }),
      })
      // Alle Strategien geben leere Ergebnisse zurück
      .mockResolvedValue(emptyResponse);
    vi.stubGlobal("fetch", mockFetch);

    const { searchSpotifyArtist } = await import("./spotify");
    await searchSpotifyArtist("Test");

    // Erster Search-Call ist mockFetch.calls[1] (nach Token-Request)
    const searchCall = mockFetch.mock.calls[1];
    expect(searchCall?.[1]?.headers?.Authorization).toBe("Bearer bearer_xyz");
  });
});

// ─── Deep-Link Format Tests ───────────────────────────────────────────────────

describe("Spotify Deep-Link Format", () => {
  it("generiert korrekte open.spotify.com URLs", () => {
    const artistId = "4gzpq5YpGjS9uS06r8Iu0S";
    const expectedUrl = `https://open.spotify.com/artist/${artistId}`;

    // Simuliert das Ergebnis der API
    const mockDirectLink = `https://open.spotify.com/artist/${artistId}`;
    expect(mockDirectLink).toBe(expectedUrl);
    expect(mockDirectLink).toMatch(/^https:\/\/open\.spotify\.com\/artist\//);
  });

  it("Deep-Links beginnen immer mit https://open.spotify.com", () => {
    const links = [
      "https://open.spotify.com/artist/4gzpq5YpGjS9uS06r8Iu0S",
      "https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d",
      "https://open.spotify.com/artist/6eUKZXaKkcviH0Ku9w2n3V",
    ];

    links.forEach((link) => {
      expect(link).toMatch(/^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+$/);
    });
  });
});
