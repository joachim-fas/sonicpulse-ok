/**
 * Spotify Auth Router (tRPC)
 * - getAuthUrl: Gibt die Spotify-Login-URL zurück
 * - getSession: Gibt den aktuellen Login-Status zurück
 * - logout: Löscht die Spotify-Session
 * - createPlaylist: Erstellt eine Playlist mit den Party-Tracks
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createAuthUrl,
  getAccessToken,
  getSessionInfo,
  deleteSession,
  searchSpotifyTrack,
  createSpotifyPlaylist,
  addTracksToPlaylist,
} from "../spotifyPlaylist";

export const spotifyAuthRouter = router({
  /**
   * Gibt die Spotify OAuth-URL zurück.
   * redirectUri wird vom Frontend übergeben (window.location.origin + /api/spotify/callback)
   */
  getAuthUrl: publicProcedure
    .input(z.object({
      sessionId: z.string().min(1),
      redirectUri: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { url, state } = createAuthUrl(input.sessionId, input.redirectUri);
      return { url, state };
    }),

  /**
   * Gibt den aktuellen Spotify-Login-Status zurück.
   */
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const info = getSessionInfo(input.sessionId);
      if (!info) return { loggedIn: false as const };
      return { loggedIn: true as const, userId: info.userId, displayName: info.displayName };
    }),

  /**
   * Löscht die Spotify-Session (Logout).
   */
  logout: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      deleteSession(input.sessionId);
      return { success: true };
    }),

  /**
   * Erstellt eine Spotify-Playlist aus den Party-Tracks.
   * Sucht für jeden Track die Spotify Track-ID via Search API.
   * Erstellt dann eine Playlist und fügt alle gefundenen Tracks hinzu.
   */
  createPlaylist: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      playlistName: z.string().min(1).max(100),
      tracks: z.array(z.object({
        title: z.string(),
        artist: z.string(),
      })).min(1).max(50),
    }))
    .mutation(async ({ input }) => {
      const accessToken = await getAccessToken(input.sessionId);
      if (!accessToken) {
        return { success: false as const, error: "Nicht eingeloggt. Bitte zuerst mit Spotify verbinden." };
      }

      const sessionInfo = getSessionInfo(input.sessionId);
      if (!sessionInfo) {
        return { success: false as const, error: "Session abgelaufen. Bitte erneut einloggen." };
      }

      // 1. Track-IDs suchen
      const trackIds: string[] = [];
      const notFound: string[] = [];

      for (const track of input.tracks) {
        const id = await searchSpotifyTrack(track.artist, track.title, accessToken);
        if (id) {
          trackIds.push(id);
        } else {
          notFound.push(`${track.artist} – ${track.title}`);
        }
      }

      if (trackIds.length === 0) {
        return {
          success: false as const,
          error: "Keine Tracks auf Spotify gefunden. Möglicherweise sind die Titel nicht im Spotify-Katalog.",
        };
      }

      // 2. Playlist erstellen
      const description = `Generiert von SonicPulse • ${new Date().toLocaleDateString("de-DE")} • ${trackIds.length} Tracks`;
      const playlist = await createSpotifyPlaylist(
        sessionInfo.userId,
        input.playlistName,
        description,
        accessToken
      );

      if (!playlist) {
        return { success: false as const, error: "Playlist konnte nicht erstellt werden." };
      }

      // 3. Tracks hinzufügen
      const added = await addTracksToPlaylist(playlist.id, trackIds, accessToken);
      if (!added) {
        return { success: false as const, error: "Tracks konnten nicht zur Playlist hinzugefügt werden." };
      }

      return {
        success: true as const,
        playlistUrl: playlist.url,
        playlistId: playlist.id,
        tracksAdded: trackIds.length,
        tracksNotFound: notFound,
      };
    }),
});
