/**
 * Spotify OAuth Callback Route
 * Registriert GET /api/spotify/callback als Express-Route.
 * Tauscht den Authorization Code gegen einen Access Token aus
 * und speichert ihn im In-Memory-Store.
 */

import type { Express, Request, Response } from "express";
import { exchangeCodeForToken } from "./spotifyPlaylist";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerSpotifyOAuthRoutes(app: Express) {
  app.get("/api/spotify/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[SpotifyOAuth] Nutzer hat Zugriff verweigert:", error);
      res.redirect("/?spotify_error=access_denied");
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Redirect URI muss identisch mit dem sein, der beim Auth-Request verwendet wurde.
    // Wir rekonstruieren ihn aus dem aktuellen Request.
    const protocol = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
    const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
    const redirectUri = `${protocol}://${host}/api/spotify/callback`;

    try {
      const result = await exchangeCodeForToken(code, state, redirectUri);

      if (!result) {
        console.error("[SpotifyOAuth] Token-Austausch fehlgeschlagen");
        res.redirect("/?spotify_error=token_exchange_failed");
        return;
      }

      // Session-ID als Cookie setzen (30 Tage)
      res.cookie("spotify_session", result.sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      console.log(`[SpotifyOAuth] Login erfolgreich: ${result.displayName} (${result.userId})`);
      res.redirect("/?spotify_connected=true");
    } catch (err) {
      console.error("[SpotifyOAuth] Callback-Fehler:", err);
      res.redirect("/?spotify_error=callback_failed");
    }
  });
}
