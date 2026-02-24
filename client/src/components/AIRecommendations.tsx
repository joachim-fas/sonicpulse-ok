import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, RefreshCw, Music2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArtistCardSkeleton from "./ArtistCardSkeleton";

interface AIRecommendationsProps {
  artistName: string;
  genres?: string[];
}

function SpotifyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

export default function AIRecommendations({ artistName, genres = [] }: AIRecommendationsProps) {
  const [triggered, setTriggered] = useState(false);

  const mutation = trpc.artist.recommendations.useMutation();

  const handleGenerate = () => {
    setTriggered(true);
    mutation.mutate({ artistName, genres });
  };

  const recommendations = mutation.data?.recommendations ?? [];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">KI-Empfehlungen</p>
            <p className="text-xs text-muted-foreground">Ähnliche Künstler via AI</p>
          </div>
        </div>

        {triggered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={mutation.isPending}
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Neue Empfehlungen laden"
          >
            <RefreshCw size={14} className={mutation.isPending ? "animate-spin" : ""} />
          </Button>
        )}
      </div>

      {/* Inhalt */}
      <div className="px-4 pb-4">
        {!triggered ? (
          <Button
            onClick={handleGenerate}
            className="w-full rounded-xl font-semibold"
            size="sm"
          >
            <Sparkles size={14} className="mr-2" />
            Ähnliche Künstler entdecken
          </Button>
        ) : mutation.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ArtistCardSkeleton key={i} compact />
            ))}
          </div>
        ) : mutation.isError ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Empfehlungen konnten nicht geladen werden.
          </p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Empfehlungen gefunden.
          </p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 artist-card"
              >
                {/* Bild */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {rec.image_url ? (
                    <img src={rec.image_url} alt={rec.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {rec.spotify_name ?? rec.display_name}
                  </p>
                  {rec.genres && rec.genres.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {rec.genres.slice(0, 2).join(" · ")}
                    </p>
                  )}
                </div>

                {/* Link oder Fallback */}
                {rec.found && rec.direct_link ? (
                  <a
                    href={rec.direct_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
                    aria-label={`${rec.spotify_name} auf Spotify öffnen`}
                  >
                    <SpotifyIcon size={10} />
                  </a>
                ) : (
                  <span className="flex-shrink-0 text-xs text-muted-foreground px-2 py-1 rounded-full border border-border">
                    –
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
