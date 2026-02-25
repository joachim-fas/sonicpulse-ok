/**
 * Tests für spotifyPlaylist.ts
 * Prüft: PKCE-Generierung, State-Management, Token-Austausch-Logik,
 * Track-Suche, Playlist-Erstellung und Fehlerbehandlung.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  createAuthUrl,
  getAccessToken,
  getSessionInfo,
  deleteSession,
} from "./spotifyPlaylist";

// ─── PKCE ────────────────────────────────────────────────────────────────────

describe("PKCE Helpers", () => {
  it("generateCodeVerifier erzeugt einen nicht-leeren String", () => {
    const verifier = generateCodeVerifier();
    expect(typeof verifier).toBe("string");
    expect(verifier.length).toBeGreaterThan(0);
  });

  it("generateCodeVerifier erzeugt jedes Mal einen anderen Wert", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });

  it("generateCodeChallenge erzeugt einen deterministischen Base64url-Hash", () => {
    const verifier = "test-verifier-12345";
    const challenge1 = generateCodeChallenge(verifier);
    const challenge2 = generateCodeChallenge(verifier);
    expect(challenge1).toBe(challenge2);
    expect(challenge1.length).toBeGreaterThan(0);
    // Base64url darf kein + oder / enthalten
    expect(challenge1).not.toMatch(/[+/=]/);
  });

  it("verschiedene Verifier erzeugen verschiedene Challenges", () => {
    const c1 = generateCodeChallenge("verifier-a");
    const c2 = generateCodeChallenge("verifier-b");
    expect(c1).not.toBe(c2);
  });
});

// ─── Auth URL ────────────────────────────────────────────────────────────────

describe("createAuthUrl", () => {
  it("gibt eine gültige Spotify-Auth-URL zurück", () => {
    const { url, state } = createAuthUrl("session-123", "https://example.com/callback");
    expect(url).toContain("https://accounts.spotify.com/authorize");
    expect(url).toContain("response_type=code");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("playlist-modify-public");
    expect(state).toBeTruthy();
    expect(state.length).toBeGreaterThan(0);
  });

  it("erzeugt für jede Session einen anderen State", () => {
    const { state: s1 } = createAuthUrl("session-1", "https://example.com/callback");
    const { state: s2 } = createAuthUrl("session-2", "https://example.com/callback");
    expect(s1).not.toBe(s2);
  });

  it("enthält die redirect_uri in der URL", () => {
    const redirectUri = "https://my-app.example.com/api/spotify/callback";
    const { url } = createAuthUrl("session-xyz", redirectUri);
    expect(url).toContain(encodeURIComponent(redirectUri));
  });

  it("enthält alle benötigten Scopes", () => {
    const { url } = createAuthUrl("session-abc", "https://example.com/callback");
    expect(url).toContain("playlist-modify-public");
    expect(url).toContain("user-read-private");
    expect(url).toContain("user-read-email");
  });
});

// ─── Session Management ───────────────────────────────────────────────────────

describe("Session Management", () => {
  it("getSessionInfo gibt null zurück wenn keine Session existiert", () => {
    const result = getSessionInfo("non-existent-session");
    expect(result).toBeNull();
  });

  it("deleteSession entfernt eine nicht-existente Session ohne Fehler", () => {
    expect(() => deleteSession("non-existent-session")).not.toThrow();
  });

  it("getAccessToken gibt null zurück wenn keine Session existiert", async () => {
    const token = await getAccessToken("non-existent-session");
    expect(token).toBeNull();
  });
});

// ─── Playlist-Erstellung (Mock) ───────────────────────────────────────────────

describe("Spotify API Calls (gemockt)", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("searchSpotifyTrack gibt null zurück bei API-Fehler", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const { searchSpotifyTrack } = await import("./spotifyPlaylist");
    const result = await searchSpotifyTrack("Radiohead", "Creep", "fake-token");
    expect(result).toBeNull();
  });

  it("searchSpotifyTrack gibt Track-ID zurück bei Erfolg", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tracks: { items: [{ id: "abc123", name: "Creep" }] },
      }),
    });

    const { searchSpotifyTrack } = await import("./spotifyPlaylist");
    const result = await searchSpotifyTrack("Radiohead", "Creep", "fake-token");
    expect(result).toBe("abc123");
  });

  it("searchSpotifyTrack gibt null zurück wenn keine Tracks gefunden", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tracks: { items: [] },
      }),
    });

    const { searchSpotifyTrack } = await import("./spotifyPlaylist");
    const result = await searchSpotifyTrack("Unknown Artist", "Unknown Song", "fake-token");
    expect(result).toBeNull();
  });

  it("createSpotifyPlaylist gibt null zurück bei API-Fehler", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const { createSpotifyPlaylist } = await import("./spotifyPlaylist");
    const result = await createSpotifyPlaylist("user123", "My Playlist", "Description", "fake-token");
    expect(result).toBeNull();
  });

  it("createSpotifyPlaylist gibt Playlist-URL zurück bei Erfolg", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "playlist123",
        external_urls: { spotify: "https://open.spotify.com/playlist/playlist123" },
      }),
    });

    const { createSpotifyPlaylist } = await import("./spotifyPlaylist");
    const result = await createSpotifyPlaylist("user123", "My Playlist", "Description", "fake-token");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("playlist123");
    expect(result?.url).toBe("https://open.spotify.com/playlist/playlist123");
  });

  it("addTracksToPlaylist gibt false zurück bei API-Fehler", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const { addTracksToPlaylist } = await import("./spotifyPlaylist");
    const result = await addTracksToPlaylist("playlist123", ["track1", "track2"], "fake-token");
    expect(result).toBe(false);
  });

  it("addTracksToPlaylist gibt true zurück bei Erfolg", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ snapshot_id: "abc" }),
    });

    const { addTracksToPlaylist } = await import("./spotifyPlaylist");
    const result = await addTracksToPlaylist("playlist123", ["track1", "track2"], "fake-token");
    expect(result).toBe(true);
  });
});

// ─── Kein /search/ in Playlist-URLs ──────────────────────────────────────────

describe("Playlist-URL-Garantie", () => {
  it("Playlist-URLs enthalten niemals /search/", async () => {
    const savedFetch = global.fetch;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "playlist123",
        external_urls: { spotify: "https://open.spotify.com/playlist/playlist123" },
      }),
    });
    global.fetch = mockFetch;

    const { createSpotifyPlaylist } = await import("./spotifyPlaylist");
    const result = await createSpotifyPlaylist("user123", "Test", "Desc", "token");

    expect(result?.url).not.toContain("/search/");
    expect(result?.url).toContain("open.spotify.com/playlist/");

    global.fetch = savedFetch;
  });
});
