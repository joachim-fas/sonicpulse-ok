/**
 * SpotifyEmbedCard
 *
 * Bettet den offiziellen Spotify Embed-Player ein.
 * Unterstützt sowohl Artist-Embeds als auch Track-Embeds.
 * Funktioniert OHNE Login und OHNE Spotify Premium.
 *
 * Artist-URL: https://open.spotify.com/embed/artist/{artist_id}?utm_source=generator&theme=0
 * Track-URL:  https://open.spotify.com/embed/track/{track_id}?utm_source=generator&theme=0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, ChevronDown, Loader2 } from "lucide-react";
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
  /** Ob der Player initial aufgeklappt ist */
  defaultOpen?: boolean;
  /** Kompakter Modus: kleinerer iframe (152px statt 352px) */
  compact?: boolean;
}

export function SpotifyEmbedCard({
  artistId,
  artistName,
  trackId,
  accentColor = "emerald",
  defaultOpen = false,
  compact = false,
}: SpotifyEmbedCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isLoaded, setIsLoaded] = useState(false);

  // Track-Embed hat Priorität über Artist-Embed
  const hasTrack = !!trackId;
  const hasArtist = !!artistId;
  if (!hasTrack && !hasArtist) return null;

  const embedUrl = hasTrack
    ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
    : `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator&theme=0`;

  const iframeHeight = compact ? 152 : hasTrack ? 152 : 352;

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

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
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
            {isOpen
              ? "Hide Preview"
              : hasTrack
              ? "Listen to this track"
              : "Artist Preview"}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="opacity-60" />
        </motion.div>
      </button>

      {/* Embed iframe */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 relative">
              {/* Skeleton während iframe lädt */}
              {!isLoaded && (
                <div className="absolute inset-3 rounded-2xl bg-zinc-800 animate-pulse flex items-center justify-center">
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
                  "rounded-2xl border-0 transition-opacity duration-500",
                  isLoaded ? "opacity-100" : "opacity-0"
                )}
                style={{ minHeight: `${iframeHeight}px` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
