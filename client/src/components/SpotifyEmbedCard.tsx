/**
 * SpotifyEmbedCard
 *
 * Bettet den offiziellen Spotify Embed-Player ein – immer sichtbar, kein Toggle.
 * Unterstützt sowohl Artist-Embeds als auch Track-Embeds.
 * Funktioniert OHNE Login und OHNE Spotify Premium.
 *
 * Artist-URL: https://open.spotify.com/embed/artist/{artist_id}?utm_source=generator&theme=0
 * Track-URL:  https://open.spotify.com/embed/track/{track_id}?utm_source=generator&theme=0
 *
 * Fallback: Wenn keine Spotify-ID verfügbar, wird ein "Search on Spotify"-Button angezeigt.
 */

import { useState } from "react";
import { Headphones, Loader2, ExternalLink } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SpotifyEmbedCardProps {
  /** Spotify Artist ID – wird für Artist-Embed verwendet */
  artistId?: string | null;
  artistName: string;
  /** Spotify Track ID – wenn gesetzt, wird Track-Embed statt Artist-Embed gezeigt */
  trackId?: string | null;
  /** Akzentfarbe passend zum Mode */
  accentColor?: "cyan" | "fuchsia" | "emerald" | "rose";
  /** Wird ignoriert – Embed ist immer offen */
  defaultOpen?: boolean;
  /** Kompakter Modus: kleinerer iframe (152px statt 352px) */
  compact?: boolean;
}

export function SpotifyEmbedCard({
  artistId,
  artistName,
  trackId,
  accentColor = "emerald",
  compact = false,
}: SpotifyEmbedCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Track-Embed hat Priorität über Artist-Embed
  const hasTrack = !!trackId;
  const hasArtist = !!artistId;

  const accentClasses = {
    cyan:    "text-cyan-400 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5",
    fuchsia: "text-fuchsia-400 border-fuchsia-500/20 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5",
    emerald: "text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5",
    rose:    "text-rose-400 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/5",
  };

  const iconClasses = {
    cyan:    "bg-cyan-500/10 text-cyan-400",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    rose:    "bg-rose-500/10 text-rose-400",
  };

  // ── Fallback: kein Spotify-Embed verfügbar → Suchlink-Button ────────────────
  if (!hasTrack && !hasArtist) {
    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(artistName)}`;
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-300 text-left",
          accentClasses[accentColor]
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-lg", iconClasses[accentColor])}>
            <Headphones size={12} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-medium">
            Search on Spotify
          </span>
        </div>
        <ExternalLink size={12} className="opacity-60" />
      </a>
    );
  }

  const embedUrl = hasTrack
    ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
    : `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator&theme=0`;

  const iframeHeight = compact ? 152 : hasTrack ? 152 : 352;

  return (
    <div className="w-full">
      {/* Embed iframe – immer sichtbar */}
      <div className="relative">
        {/* Skeleton während iframe lädt */}
        {!isLoaded && (
          <div
            className="absolute inset-0 rounded-2xl bg-zinc-800 animate-pulse flex items-center justify-center"
            style={{ height: `${iframeHeight}px` }}
          >
            <div className="flex flex-col items-center gap-2 text-white/20">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[9px] uppercase tracking-widest">Loading Spotify Player…</span>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          width="100%"
          height={iframeHeight}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          title={`Spotify Player – ${artistName}`}
          className={cn(
            "rounded-2xl border-0 transition-opacity duration-500 w-full",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{ minHeight: `${iframeHeight}px` }}
        />
      </div>
    </div>
  );
}
