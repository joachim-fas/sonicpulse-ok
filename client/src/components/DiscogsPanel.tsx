import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BookOpen, Disc, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";

interface DiscogsPanelProps {
  artistName: string;
  spotifyId?: string | null;
}

export default function DiscogsPanel({ artistName, spotifyId }: DiscogsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const { data, isLoading, error } = trpc.artist.discogs.useQuery(
    { artistName, spotifyId: spotifyId ?? undefined },
    { enabled: expanded }
  );

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header – immer sichtbar */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Disc size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Discogs</p>
            <p className="text-xs text-muted-foreground">Biografie & Diskografie</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {/* Inhalt */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Discogs-Daten konnten nicht geladen werden.
            </p>
          )}

          {data && !data.found && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Kein Discogs-Eintrag gefunden.
            </p>
          )}

          {data?.found && data.data && (
            <>
              {/* Biografie */}
              {data.data.profile && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Biografie</span>
                  </div>
                  <p className={`text-sm text-muted-foreground leading-relaxed ${!bioExpanded ? "line-clamp-4" : ""}`}>
                    {data.data.profile}
                  </p>
                  {data.data.profile.length > 200 && (
                    <button
                      onClick={() => setBioExpanded((v) => !v)}
                      className="text-xs text-primary mt-1 flex items-center gap-1"
                    >
                      {bioExpanded ? (
                        <><ChevronUp size={12} /> Weniger anzeigen</>
                      ) : (
                        <><ChevronDown size={12} /> Mehr anzeigen</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Releases */}
              {data.data.releases.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Disc size={14} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Diskografie
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.data.releases.slice(0, 6).map((release) => (
                      <div
                        key={release.id}
                        className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50"
                      >
                        {release.thumb ? (
                          <img
                            src={release.thumb}
                            alt={release.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Disc size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{release.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {release.year ?? "–"} · {release.type}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discogs-Link */}
              {data.data.discogs_id && (
                <a
                  href={`https://www.discogs.com/artist/${data.data.discogs_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary"
                >
                  <ExternalLink size={12} />
                  Auf Discogs ansehen
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
