import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ExternalLink, Music2, Volume2, VolumeX } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AudioPlayerProps {
  artistId: string;
  artistName: string;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function SpotifyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export default function AudioPlayer({ artistId, artistName }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const { data, isLoading } = trpc.artist.topTrack.useQuery(
    { artistId },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 }
  );

  const track = data?.track;
  const hasPreview = !!track?.preview_url;

  // Audio-Element initialisieren wenn Preview-URL vorhanden
  useEffect(() => {
    if (!track?.preview_url) return;

    const audio = new Audio(track.preview_url);
    audio.preload = "metadata";
    audioRef.current = audio;
    setAudioError(false);

    const onLoaded = () => setDuration(audio.duration * 1000);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onError = () => {
      setAudioError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, [track?.preview_url]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setAudioError(true));
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted((v) => !v);
  }, [muted]);

  // Klick auf Fortschrittsbalken
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * (duration / 1000);
      setCurrentTime(ratio * duration);
    },
    [duration]
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Ladezustand
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-2 w-1/2 rounded" />
            <div className="skeleton h-1.5 w-full rounded-full mt-2" />
          </div>
        </div>
      </div>
    );
  }

  // Kein Track gefunden
  if (!data?.found || !track) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Label */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Vorschau · 30 Sek.
        </span>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-3">
          {/* Album-Cover */}
          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted">
            {track.album_image_url ? (
              <img
                src={track.album_image_url}
                alt={track.album_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={20} className="text-muted-foreground" />
              </div>
            )}

            {/* Animierter Equalizer-Overlay wenn abgespielt */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-primary rounded-full"
                    style={{
                      height: `${8 + Math.random() * 12}px`,
                      animation: `equalizer-bar ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Track-Info + Controls */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {track.name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {track.album_name}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Mute-Button */}
                <button
                  onClick={toggleMute}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={muted ? "Ton einschalten" : "Stummschalten"}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>

                {/* Spotify-Link */}
                <a
                  href={track.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Auf Spotify öffnen"
                >
                  <SpotifyIcon size={13} />
                </a>
              </div>
            </div>

            {/* Fortschrittsbalken + Play-Button */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              {hasPreview && !audioError ? (
                <button
                  onClick={togglePlay}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity spotify-glow"
                  aria-label={isPlaying ? "Pause" : "Abspielen"}
                >
                  {isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" className="translate-x-0.5" />
                  )}
                </button>
              ) : (
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                  title="Keine Vorschau verfügbar"
                >
                  <Music2 size={14} className="text-muted-foreground" />
                </div>
              )}

              {/* Fortschrittsbalken */}
              <div className="flex-1 space-y-1">
                <div
                  ref={progressRef}
                  onClick={hasPreview && !audioError ? handleProgressClick : undefined}
                  className={`h-1.5 bg-muted rounded-full overflow-hidden ${hasPreview && !audioError ? "cursor-pointer" : ""}`}
                  role={hasPreview ? "slider" : undefined}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                >
                  <div
                    className="h-full bg-primary rounded-full transition-none"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>
                    {hasPreview && !audioError
                      ? formatTime(duration || track.duration_ms)
                      : "Keine Vorschau"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes equalizer-bar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
