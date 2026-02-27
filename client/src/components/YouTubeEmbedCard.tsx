/**
 * YouTubeEmbedCard
 *
 * Bettet einen YouTube-Player direkt ein – kein Toggle-Button, Video immer sichtbar.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface YouTubeEmbedCardProps {
  videoId: string;
  label?: string;
  accentColor?: "cyan" | "fuchsia" | "emerald" | "rose";
  defaultOpen?: boolean; // kept for API compatibility, ignored
  compact?: boolean;
}

export function YouTubeEmbedCard({
  videoId,
  accentColor = "rose",
  compact = false,
}: YouTubeEmbedCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  const iframeHeight = compact ? 180 : 280;

  return (
    <div className="w-full">
      <div className="relative">
        {/* Skeleton während iframe lädt */}
        {!isLoaded && (
          <div
            className={cn(
              "absolute inset-0 rounded-2xl animate-pulse flex items-center justify-center",
              accentColor === "rose" ? "bg-rose-950/30" : "bg-zinc-800"
            )}
            style={{ height: `${iframeHeight}px` }}
          >
            <div className="flex flex-col items-center gap-2 text-white/20">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[9px] uppercase tracking-widest">Loading…</span>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          width="100%"
          height={iframeHeight}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          title={`YouTube Player – ${videoId}`}
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
