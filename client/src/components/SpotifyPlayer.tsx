/**
 * SpotifyPlayer Komponente
 *
 * Zeigt den Spotify Web Playback SDK Player mit:
 * - Login-Button wenn nicht authentifiziert
 * - Premium-Hinweis wenn kein Premium Account
 * - Vollständige Playback-Controls (Play/Pause, Seek, Volume)
 * - Track-Info (Cover, Titel, Künstler, Album)
 * - Automatische Token-Erneuerung
 *
 * Benötigt: Spotify Premium Account
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Play, Pause, Volume2, VolumeX, LogIn, LogOut, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useSpotifyPlayer, type SpotifyPlaybackState } from "@/hooks/useSpotifyPlayer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface SpotifyPlayerProps {
  /** Spotify Artist URI zum Abspielen, z.B. "spotify:artist:4Z8W4fKeB5YxbusRsdQVPb" */
  artistUri?: string;
  /** Spotify Artist Direct Link für den "Auf Spotify öffnen"-Button */
  artistLink?: string;
  /** Künstlername für die Anzeige */
  artistName?: string;
  /** Kompakte Darstellung für Einbettung in Karten */
  compact?: boolean;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SpotifyPlayer({
  artistUri,
  artistLink,
  artistName,
  compact = false,
}: SpotifyPlayerProps) {
  const {
    status,
    playbackState,
    error,
    isAuthenticated,
    login,
    logout,
    togglePlay,
    seek,
    setVolume,
    playArtist,
  } = useSpotifyPlayer();

  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [seekPosition, setSeekPosition] = useState<number | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localPosition, setLocalPosition] = useState(0);

  // Lokale Position für flüssige Fortschrittsanzeige
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);

    if (playbackState && !playbackState.paused) {
      setLocalPosition(playbackState.position);
      progressInterval.current = setInterval(() => {
        setLocalPosition((prev) => Math.min(prev + 1000, playbackState.duration));
      }, 1000);
    } else if (playbackState) {
      setLocalPosition(playbackState.position);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [playbackState]);

  // Künstler abspielen wenn Player bereit und URI vorhanden
  useEffect(() => {
    if ((status === "ready" || status === "paused") && artistUri) {
      // Nicht automatisch abspielen – Nutzer muss Play drücken
    }
  }, [status, artistUri]);

  const handlePlayArtist = useCallback(async () => {
    if (status === "playing" || status === "paused") {
      await togglePlay();
    } else if (artistUri && (status === "ready")) {
      await playArtist(artistUri);
    }
  }, [status, artistUri, togglePlay, playArtist]);

  const handleVolumeChange = useCallback(async (val: number[]) => {
    const v = val[0] ?? 70;
    setVolumeState(v);
    setIsMuted(v === 0);
    await setVolume(v / 100);
  }, [setVolume]);

  const handleMuteToggle = useCallback(async () => {
    if (isMuted) {
      setIsMuted(false);
      setVolumeState(70);
      await setVolume(0.7);
    } else {
      setIsMuted(true);
      await setVolume(0);
    }
  }, [isMuted, setVolume]);

  const handleSeekCommit = useCallback(async (val: number[]) => {
    const pos = val[0] ?? 0;
    setSeekPosition(null);
    await seek(pos);
  }, [seek]);

  const currentTrack = playbackState?.track_window?.current_track;
  const duration = playbackState?.duration ?? 0;
  const displayPosition = seekPosition ?? localPosition;

  // ── Nicht eingeloggt ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="spotify-player-container rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-4">
        <div className="flex flex-col items-center gap-3 text-center py-2">
          <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-[#1DB954]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Musik direkt abspielen</p>
            <p className="text-xs text-white/50 mt-0.5">Spotify Premium erforderlich</p>
          </div>
          <Button
            onClick={login}
            size="sm"
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold gap-2 rounded-full px-5"
          >
            <LogIn className="w-4 h-4" />
            Mit Spotify verbinden
          </Button>
        </div>
      </div>
    );
  }

  // ── Premium erforderlich ──────────────────────────────────────────────────
  if (status === "premium_required") {
    return (
      <div className="spotify-player-container rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-300">Spotify Premium erforderlich</p>
            <p className="text-xs text-yellow-300/70 mt-1">
              Das Web Playback SDK funktioniert nur mit einem Spotify Premium Account.
            </p>
            <button onClick={logout} className="text-xs text-white/40 hover:text-white/70 mt-2 underline">
              Ausloggen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Fehler ────────────────────────────────────────────────────────────────
  if (status === "error" && error) {
    return (
      <div className="spotify-player-container rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Verbindungsfehler</p>
            <p className="text-xs text-red-300/70 mt-1">{error}</p>
            <button onClick={logout} className="text-xs text-white/40 hover:text-white/70 mt-2 underline">
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Lädt ──────────────────────────────────────────────────────────────────
  if (status === "loading" || status === "idle") {
    return (
      <div className="spotify-player-container rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#1DB954] animate-spin" />
          <p className="text-sm text-white/60">Spotify Player wird verbunden…</p>
        </div>
      </div>
    );
  }

  // ── Player bereit / spielt / pausiert ─────────────────────────────────────
  return (
    <div className="spotify-player-container rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm overflow-hidden">
      {/* Track-Info */}
      <div className="flex items-center gap-3 p-3">
        {currentTrack ? (
          <>
            <div className="relative shrink-0">
              <img
                src={currentTrack.album.images[0]?.url ?? ""}
                alt={currentTrack.album.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              {status === "playing" && (
                <div className="absolute inset-0 rounded-lg bg-black/30 flex items-center justify-center">
                  <div className="flex gap-0.5 items-end h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-[#1DB954] rounded-full animate-pulse"
                        style={{
                          height: `${40 + i * 20}%`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentTrack.name}</p>
              <p className="text-xs text-white/50 truncate">
                {currentTrack.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5 text-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {artistName ?? "Bereit zum Abspielen"}
              </p>
              <p className="text-xs text-white/40">Drücke Play um zu starten</p>
            </div>
          </>
        )}

        {/* Externe Links */}
        <div className="flex items-center gap-1 shrink-0">
          {artistLink && (
            <a
              href={artistLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              title="Auf Spotify öffnen"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={logout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
            title="Spotify trennen"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fortschrittsbalken */}
      {duration > 0 && (
        <div className="px-3 pb-1">
          <Slider
            value={[displayPosition]}
            min={0}
            max={duration}
            step={1000}
            onValueChange={(val) => setSeekPosition(val[0] ?? 0)}
            onValueCommit={handleSeekCommit}
            className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-[#1DB954]"
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
            <span>{formatMs(displayPosition)}</span>
            <span>{formatMs(duration)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 pb-3">
        {/* Play/Pause */}
        <button
          onClick={handlePlayArtist}
          className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] flex items-center justify-center transition-colors shrink-0"
          title={status === "playing" ? "Pause" : "Play"}
        >
          {status === "playing" ? (
            <Pause className="w-4 h-4 text-black fill-black" />
          ) : (
            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
          )}
        </button>

        {/* Lautstärke */}
        <button
          onClick={handleMuteToggle}
          className="text-white/50 hover:text-white/80 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <div className="flex-1">
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white"
          />
        </div>
      </div>
    </div>
  );
}
