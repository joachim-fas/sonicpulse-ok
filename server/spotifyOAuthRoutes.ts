/**
 * Spotify OAuth REST-Routen für den Express-Server.
 * Diese Routen werden direkt in Express registriert (nicht über tRPC),
 * weil der OAuth-Callback ein HTTP-Redirect erfordert.
 *
 * Routen:
 * GET /api/spotify/auth      → Startet den OAuth-Flow (redirect zu Spotify)
 * GET /api/spotify/callback  → Verarbeitet den Callback und gibt Token zurück
 * POST /api/spotify/refresh  → Erneuert den Access Token
 */

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import {
  generatePKCE,
  getSpotifyAuthUrl,
  exchangeSpotifyCode,
  refreshSpotifyToken,
} from "./spotifyAuth";

// In-Memory Store für PKCE Verifier (kurzlebig, nur während des Auth-Flows)
const pkceStore = new Map<string, { verifier: string; redirectUri: string; createdAt: number }>();

// Cleanup alter Einträge (älter als 10 Minuten)
setInterval(() => {
  const now = Date.now();
  pkceStore.forEach((value, key) => {
    if (now - value.createdAt > 10 * 60 * 1000) {
      pkceStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export function registerSpotifyOAuthRoutes(app: Express): void {

  /**
   * GET /api/spotify/auth
   * Startet den OAuth-Flow.
   * Query-Parameter: redirect_uri (die URI die nach dem Login aufgerufen wird)
   */
  app.get("/api/spotify/auth", (req: Request, res: Response) => {
    const origin = (req.query.origin as string) || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${origin}/api/spotify/callback`;

    const { verifier, challenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    // PKCE Verifier für diesen State speichern
    pkceStore.set(state, { verifier, redirectUri, createdAt: Date.now() });

    const authUrl = getSpotifyAuthUrl(redirectUri, state, challenge);
    res.redirect(authUrl);
  });

  /**
   * GET /api/spotify/callback
   * Verarbeitet den OAuth-Callback von Spotify.
   * Tauscht den Code gegen Tokens und leitet den Nutzer zurück zur App.
   */
  app.get("/api/spotify/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      console.error("[SpotifyOAuth] Fehler vom Spotify-Server:", error);
      return res.redirect(`/?spotify_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect("/?spotify_error=missing_params");
    }

    const pkceData = pkceStore.get(state);
    if (!pkceData) {
      return res.redirect("/?spotify_error=invalid_state");
    }

    pkceStore.delete(state);

    try {
      const tokens = await exchangeSpotifyCode(code, pkceData.redirectUri, pkceData.verifier);

      // Token als URL-Parameter zurückgeben (Frontend speichert sie im sessionStorage)
      const params = new URLSearchParams({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_expires_at: tokens.expires_at.toString(),
      });

      res.redirect(`/?${params.toString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SpotifyOAuth] Token Exchange Fehler:", msg);
      res.redirect(`/?spotify_error=${encodeURIComponent(msg)}`);
    }
  });

  /**
   * POST /api/spotify/refresh
   * Erneuert den Access Token mit dem Refresh Token.
   * Body: { refresh_token: string }
   */
  app.post("/api/spotify/refresh", async (req: Request, res: Response) => {
    const { refresh_token } = req.body as { refresh_token?: string };

    if (!refresh_token) {
      return res.status(400).json({ error: "refresh_token fehlt" });
    }

    try {
      const tokens = await refreshSpotifyToken(refresh_token);
      res.json(tokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SpotifyOAuth] Token Refresh Fehler:", msg);
      res.status(401).json({ error: msg });
    }
  });
}
