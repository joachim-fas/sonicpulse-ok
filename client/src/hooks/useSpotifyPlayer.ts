/**
 * useSpotifyPlayer Hook
 *
 * Verwaltet den Spotify Web Playback SDK Lifecycle:
 * 1. OAuth-Token aus URL-Parametern oder sessionStorage lesen
 * 2. SDK laden und Player initialisieren
 * 3. Playback-State verwalten (play/pause/seek/volume)
 * 4. Token automatisch erneuern wenn abgelaufen
 */

import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  removeListener: (event: string, cb?: (data: unknown) => void) => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  activateElement: () => Promise<void>;
}

export interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      uri: string;
      duration_ms: number;
      artists: Array<{ name: string; uri: string }>;
      album: {
        name: string;
        uri: string;
        images: Array<{ url: string; width: number; height: number }>;
      };
    };
  };
}

export interface SpotifyTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export type PlayerStatus =
  | "idle"           // Kein Token, nicht verbunden
  | "loading"        // SDK lädt
  | "ready"          // Verbunden, bereit
  | "playing"        // Spielt gerade
  | "paused"         // Pausiert
  | "error"          // Fehler
  | "premium_required"; // Kein Premium Account

export interface UseSpotifyPlayerReturn {
  status: PlayerStatus;
  deviceId: string | null;
  playbackState: SpotifyPlaybackState | null;
  tokens: SpotifyTokenData | null;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: () => void;
  logout: () => void;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  playArtist: (spotifyArtistUri: string) => Promise<void>;
}

const STORAGE_KEY = "spotify_tokens";

function loadTokensFromStorage(): SpotifyTokenData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpotifyTokenData;
  } catch {
    return null;
  }
}

function saveTokensToStorage(tokens: SpotifyTokenData): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokensFromStorage(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function useSpotifyPlayer(): UseSpotifyPlayerReturn {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [tokens, setTokens] = useState<SpotifyTokenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const sdkLoadedRef = useRef(false);

  // Tokens aus URL-Parametern oder sessionStorage laden
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("spotify_access_token");
    const refreshToken = params.get("spotify_refresh_token");
    const expiresAt = params.get("spotify_expires_at");
    const spotifyError = params.get("spotify_error");

    if (spotifyError) {
      setError(`Spotify Login Fehler: ${decodeURIComponent(spotifyError)}`);
      // URL bereinigen
      const url = new URL(window.location.href);
      url.searchParams.delete("spotify_error");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (accessToken && refreshToken && expiresAt) {
      const tokenData: SpotifyTokenData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt),
      };
      saveTokensToStorage(tokenData);
      setTokens(tokenData);

      // URL bereinigen (Token nicht in URL-History lassen)
      const url = new URL(window.location.href);
      url.searchParams.delete("spotify_access_token");
      url.searchParams.delete("spotify_refresh_token");
      url.searchParams.delete("spotify_expires_at");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    // Aus sessionStorage laden
    const stored = loadTokensFromStorage();
    if (stored) {
      setTokens(stored);
    }
  }, []);

  // Token erneuern wenn nötig
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;

    // Token noch gültig (mit 60s Puffer)
    if (tokens.expires_at > Date.now() + 60_000) {
      return tokens.access_token;
    }

    // Token erneuern
    try {
      const res = await fetch("/api/spotify/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });

      if (!res.ok) {
        clearTokensFromStorage();
        setTokens(null);
        setStatus("idle");
        return null;
      }

      const newTokens = (await res.json()) as SpotifyTokenData;
      saveTokensToStorage(newTokens);
      setTokens(newTokens);
      return newTokens.access_token;
    } catch {
      return tokens.access_token; // Fallback: alten Token versuchen
    }
  }, [tokens]);

  // Web Playback SDK laden und initialisieren
  useEffect(() => {
    if (!tokens || sdkLoadedRef.current) return;

    setStatus("loading");

    const initPlayer = () => {
      if (!window.Spotify) return;

      const player = new window.Spotify.Player({
        name: "SonicPulse Player",
        getOAuthToken: async (cb) => {
          const token = await getValidToken();
          if (token) cb(token);
        },
        volume: 0.7,
      });

      // Event Listeners
      player.addListener("ready", (data) => {
        const { device_id } = data as { device_id: string };
        console.log("[SpotifyPlayer] Bereit mit Device ID:", device_id);
        setDeviceId(device_id);
        setStatus("ready");
        setError(null);
      });

      player.addListener("not_ready", () => {
        console.warn("[SpotifyPlayer] Verbindung unterbrochen");
        setStatus("error");
        setDeviceId(null);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const s = state as SpotifyPlaybackState;
        setPlaybackState(s);
        setStatus(s.paused ? "paused" : "playing");
      });

      player.addListener("initialization_error", (data) => {
        const { message } = data as { message: string };
        console.error("[SpotifyPlayer] Init-Fehler:", message);
        setError(`Initialisierungsfehler: ${message}`);
        setStatus("error");
      });

      player.addListener("authentication_error", (data) => {
        const { message } = data as { message: string };
        console.error("[SpotifyPlayer] Auth-Fehler:", message);
        setError("Authentifizierungsfehler – bitte erneut einloggen");
        setStatus("idle");
        clearTokensFromStorage();
        setTokens(null);
      });

      player.addListener("account_error", (data) => {
        const { message } = data as { message: string };
        console.error("[SpotifyPlayer] Account-Fehler:", message);
        setError("Spotify Premium erforderlich für den Playback");
        setStatus("premium_required");
      });

      player.connect().then((success) => {
        if (!success) {
          setError("Verbindung zu Spotify fehlgeschlagen");
          setStatus("error");
        }
      });

      playerRef.current = player;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      // SDK-Script laden
      if (!document.getElementById("spotify-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }

      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    sdkLoadedRef.current = true;

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      sdkLoadedRef.current = false;
    };
  }, [tokens, getValidToken]);

  // Login: OAuth-Flow starten
  const login = useCallback(() => {
    const origin = window.location.origin;
    window.location.href = `/api/spotify/auth?origin=${encodeURIComponent(origin)}`;
  }, []);

  // Logout: Tokens löschen und Player trennen
  const logout = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    sdkLoadedRef.current = false;
    clearTokensFromStorage();
    setTokens(null);
    setStatus("idle");
    setDeviceId(null);
    setPlaybackState(null);
  }, []);

  // Playback Controls
  const togglePlay = useCallback(async () => {
    if (!playerRef.current) return;
    // Mobile: activateElement vor erstem Play aufrufen
    try {
      await playerRef.current.activateElement();
    } catch {
      // Nicht alle Browser unterstützen das
    }
    await playerRef.current.togglePlay();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    if (!playerRef.current) return;
    await playerRef.current.seek(positionMs);
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    if (!playerRef.current) return;
    await playerRef.current.setVolume(volume);
  }, []);

  // Künstler auf dem Device abspielen
  const playArtist = useCallback(async (spotifyArtistUri: string) => {
    if (!deviceId) return;
    const token = await getValidToken();
    if (!token) return;

    try {
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ context_uri: spotifyArtistUri }),
        }
      );

      if (!res.ok && res.status !== 204) {
        const err = await res.text();
        console.error("[SpotifyPlayer] Play-Fehler:", err);
      }
    } catch (err) {
      console.error("[SpotifyPlayer] Play-Fehler:", err);
    }
  }, [deviceId, getValidToken]);

  return {
    status,
    deviceId,
    playbackState,
    tokens,
    error,
    isAuthenticated: !!tokens,
    login,
    logout,
    togglePlay,
    seek,
    setVolume,
    playArtist,
  };
}
