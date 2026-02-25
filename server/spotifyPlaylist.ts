/**
 * Spotify Playlist Service
 * - OAuth Authorization Code Flow (PKCE) für User-Login
 * - Track-Suche via Spotify Web API
 * - Playlist erstellen und Tracks hinzufügen
 *
 * Benötigte Scopes: playlist-modify-public, user-read-private, user-read-email
 */

import crypto from "crypto";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? "";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? "";

// ─── In-Memory Token Store (pro Session) ─────────────────────────────────────
// In Produktion: Redis oder DB verwenden
const tokenStore = new Map<string, {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  displayName: string;
}>();

// ─── PKCE Helper ─────────────────────────────────────────────────────────────
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ─── OAuth State Store ────────────────────────────────────────────────────────
const stateStore = new Map<string, { verifier: string; sessionId: string; createdAt: number }>();

export function createAuthUrl(sessionId: string, redirectUri: string): { url: string; state: string } {
  const state = crypto.randomBytes(16).toString("hex");
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  stateStore.set(state, { verifier, sessionId, createdAt: Date.now() });

  // Alte States aufräumen (älter als 10 Minuten)
  Array.from(stateStore.entries()).forEach(([key, val]) => {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) stateStore.delete(key);
  });

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: "playlist-modify-public playlist-modify-private user-read-private user-read-email",
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  return {
    url: `https://accounts.spotify.com/authorize?${params}`,
    state,
  };
}

// ─── Token-Austausch ──────────────────────────────────────────────────────────
export async function exchangeCodeForToken(
  code: string,
  state: string,
  redirectUri: string
): Promise<{ sessionId: string; userId: string; displayName: string } | null> {
  const stateData = stateStore.get(state);
  if (!stateData) {
    console.error("[SpotifyPlaylist] Ungültiger oder abgelaufener State");
    return null;
  }
  stateStore.delete(state);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: stateData.verifier,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[SpotifyPlaylist] Token-Austausch fehlgeschlagen:", err);
    return null;
  }

  const tokenData = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Nutzer-Profil abrufen
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  let userId = "unknown";
  let displayName = "Spotify User";
  if (profileRes.ok) {
    const profile = await profileRes.json() as { id: string; display_name?: string };
    userId = profile.id;
    displayName = profile.display_name ?? userId;
  }

  tokenStore.set(stateData.sessionId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
    userId,
    displayName,
  });

  return { sessionId: stateData.sessionId, userId, displayName };
}

// ─── Token abrufen (mit Auto-Refresh) ────────────────────────────────────────
export async function getAccessToken(sessionId: string): Promise<string | null> {
  const stored = tokenStore.get(sessionId);
  if (!stored) return null;

  // Token noch gültig?
  if (Date.now() < stored.expiresAt - 60_000) {
    return stored.accessToken;
  }

  // Token refreshen
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    tokenStore.delete(sessionId);
    return null;
  }

  const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
  stored.accessToken = data.access_token;
  stored.expiresAt = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) stored.refreshToken = data.refresh_token;
  tokenStore.set(sessionId, stored);

  return stored.accessToken;
}

// ─── Session-Info abrufen ─────────────────────────────────────────────────────
export function getSessionInfo(sessionId: string): { userId: string; displayName: string } | null {
  const stored = tokenStore.get(sessionId);
  if (!stored) return null;
  return { userId: stored.userId, displayName: stored.displayName };
}

// ─── Session löschen (Logout) ─────────────────────────────────────────────────
export function deleteSession(sessionId: string): void {
  tokenStore.delete(sessionId);
}

// ─── Spotify Track-ID suchen ──────────────────────────────────────────────────
export async function searchSpotifyTrack(
  artist: string,
  title: string,
  accessToken: string
): Promise<string | null> {
  const query = `artist:${encodeURIComponent(artist)} track:${encodeURIComponent(title)}`;
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.warn(`[SpotifyPlaylist] Track-Suche fehlgeschlagen für "${artist} – ${title}": ${res.status}`);
    return null;
  }

  const data = await res.json() as { tracks: { items: Array<{ id: string; name: string }> } };
  const track = data.tracks?.items?.[0];
  return track?.id ?? null;
}

// ─── Playlist erstellen ───────────────────────────────────────────────────────
export async function createSpotifyPlaylist(
  userId: string,
  name: string,
  description: string,
  accessToken: string
): Promise<{ id: string; url: string } | null> {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      public: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[SpotifyPlaylist] Playlist-Erstellung fehlgeschlagen:", err);
    return null;
  }

  const data = await res.json() as { id: string; external_urls: { spotify: string } };
  return { id: data.id, url: data.external_urls.spotify };
}

// ─── Tracks zu Playlist hinzufügen ────────────────────────────────────────────
export async function addTracksToPlaylist(
  playlistId: string,
  trackIds: string[],
  accessToken: string
): Promise<boolean> {
  const uris = trackIds.map((id) => `spotify:track:${id}`);

  // Spotify erlaubt max. 100 Tracks pro Request
  const chunks: string[][] = [];
  for (let i = 0; i < uris.length; i += 100) {
    chunks.push(uris.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: chunk }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[SpotifyPlaylist] Tracks hinzufügen fehlgeschlagen:", err);
      return false;
    }
  }

  return true;
}
