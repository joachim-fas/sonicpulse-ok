/**
 * Spotify OAuth Authorization Code Flow mit PKCE
 *
 * Benötigt für das Web Playback SDK:
 * - Scopes: streaming, user-read-email, user-read-private, user-modify-playback-state, user-read-playback-state
 * - Nur mit Spotify Premium Account nutzbar
 *
 * Flow:
 * 1. getAuthUrl()      → Redirect-URL für Spotify-Login generieren
 * 2. exchangeCode()    → Authorization Code gegen Access + Refresh Token tauschen
 * 3. refreshToken()    → Access Token erneuern wenn abgelaufen (1h Gültigkeit)
 */

import crypto from "crypto";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

// Scopes die das Web Playback SDK benötigt
const REQUIRED_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number; // Unix timestamp in ms
  scope: string;
}

/**
 * PKCE Code Verifier und Challenge generieren
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

/**
 * Spotify OAuth Authorization URL generieren.
 * Der Nutzer wird zu dieser URL weitergeleitet um die App zu autorisieren.
 */
export function getSpotifyAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: REQUIRED_SCOPES,
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Authorization Code gegen Access Token + Refresh Token tauschen.
 * Wird nach dem OAuth-Callback aufgerufen.
 */
export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify Token Exchange Fehler: ${res.status} – ${error}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

/**
 * Access Token mit Refresh Token erneuern.
 * Sollte aufgerufen werden wenn expires_at < Date.now().
 */
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify Token Refresh Fehler: ${res.status} – ${error}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken, // Spotify gibt manchmal keinen neuen Refresh Token
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

/**
 * Spotify Player API: Track auf einem Device abspielen.
 * Benötigt device_id vom Web Playback SDK.
 */
export async function playTrackOnDevice(
  accessToken: string,
  deviceId: string,
  spotifyUri: string // z.B. "spotify:artist:4Z8W4fKeB5YxbusRsdQVPb" oder "spotify:track:..."
): Promise<void> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context_uri: spotifyUri,
      }),
    }
  );

  if (!res.ok && res.status !== 204) {
    const error = await res.text();
    throw new Error(`Spotify Play Fehler: ${res.status} – ${error}`);
  }
}
