import { useState } from "react";
import { ChevronDown, ChevronUp, Headphones } from "lucide-react";

interface SpotifyEmbedProps {
  artistId: string;
  artistName: string;
}

export default function SpotifyEmbed({ artistId, artistName }: SpotifyEmbedProps) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Offizieller Spotify Embed-Endpunkt – kein API-Token erforderlich
  // theme=0 = Dark Mode, passend zum App-Design
  const embedUrl = `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator&theme=0`;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header – immer sichtbar */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        aria-expanded={expanded}
        aria-label={expanded ? "Vorschau schließen" : "Vorschau öffnen"}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <Headphones size={13} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Vorschau anhören
            </p>
            <p className="text-xs text-muted-foreground">
              {expanded ? "Spotify Player schließen" : "Top-Tracks von " + artistName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Spotify
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Embed – nur wenn aufgeklappt */}
      {expanded && (
        <div className="px-3 pb-3">
          {/* Skeleton während iframe lädt */}
          {!loaded && (
            <div className="w-full h-[352px] rounded-xl bg-muted animate-pulse flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span className="text-xs">Lade Spotify Player…</span>
              </div>
            </div>
          )}
          <iframe
            src={embedUrl}
            width="100%"
            height="352"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`rounded-xl border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute"}`}
            style={{ display: loaded ? "block" : "none" }}
            title={`Spotify Player – ${artistName}`}
          />
          {loaded && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              30-Sekunden-Vorschau · Powered by Spotify
            </p>
          )}
        </div>
      )}
    </div>
  );
}
