/**
 * SpotifyPlayerContext
 *
 * Stellt den Spotify Web Playback SDK Player global in der App bereit.
 * Verhindert mehrfache SDK-Initialisierungen und ermöglicht
 * den Zugriff auf Player-State von jeder Komponente aus.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useSpotifyPlayer, type UseSpotifyPlayerReturn } from "@/hooks/useSpotifyPlayer";

const SpotifyPlayerContext = createContext<UseSpotifyPlayerReturn | null>(null);

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const player = useSpotifyPlayer();
  return (
    <SpotifyPlayerContext.Provider value={player}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

export function useSpotifyPlayerContext(): UseSpotifyPlayerReturn {
  const ctx = useContext(SpotifyPlayerContext);
  if (!ctx) throw new Error("useSpotifyPlayerContext must be used within SpotifyPlayerProvider");
  return ctx;
}
