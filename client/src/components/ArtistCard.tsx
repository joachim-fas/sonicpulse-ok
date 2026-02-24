import { ExternalLink, Music2, Users, TrendingUp, Disc3 } from "lucide-react";

interface ArtistCardProps {
  spotifyName: string;
  displayName?: string;
  spotifyId?: string | null;
  directLink?: string | null;
  imageUrl?: string | null;
  genres?: string[];
  followers?: number | null;
  popularity?: number | null;
  fromCache?: boolean;
  compact?: boolean;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function ArtistCard({
  spotifyName,
  displayName,
  directLink,
  imageUrl,
  genres = [],
  followers,
  popularity,
  fromCache,
  compact = false,
}: ArtistCardProps) {
  const hasLink = !!directLink;

  return (
    <div className={`artist-card glass-card rounded-2xl overflow-hidden ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-4">
        {/* Profilbild */}
        <div className={`relative flex-shrink-0 ${compact ? "w-14 h-14" : "w-20 h-20"} rounded-xl overflow-hidden bg-muted`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={spotifyName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="text-muted-foreground" size={compact ? 20 : 28} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`font-bold text-foreground truncate ${compact ? "text-sm" : "text-base"}`}>
                {spotifyName}
              </h3>
              {displayName && displayName !== spotifyName && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Gesucht als: {displayName}
                </p>
              )}
            </div>

            {/* Spotify Deep-Link */}
            {hasLink ? (
              <a
                href={directLink!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity spotify-glow"
                aria-label={`${spotifyName} auf Spotify öffnen`}
              >
                <SpotifyIcon size={12} />
                {!compact && <span>Öffnen</span>}
              </a>
            ) : (
              <span className="flex-shrink-0 text-xs text-muted-foreground px-2 py-1 rounded-full border border-border">
                Kein Link
              </span>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && !compact && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          {!compact && (followers != null || popularity != null) && (
            <div className="flex items-center gap-4 mt-3">
              {followers != null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users size={12} />
                  <span className="text-xs">{formatFollowers(followers)}</span>
                </div>
              )}
              {popularity != null && (
                <div className="flex items-center gap-1.5 flex-1">
                  <TrendingUp size={12} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full popularity-bar-fill"
                      style={{ width: `${popularity}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{popularity}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {fromCache && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Disc3 size={10} className="text-primary" />
          <span>Aus Cache</span>
        </div>
      )}
    </div>
  );
}

// Inline Spotify-Icon SVG
function SpotifyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}
