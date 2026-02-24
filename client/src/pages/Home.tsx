import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Search, X, Music2, Clock, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ArtistCard from "@/components/ArtistCard";
import ArtistCardSkeleton from "@/components/ArtistCardSkeleton";
import AIRecommendations from "@/components/AIRecommendations";
import DiscogsPanel from "@/components/DiscogsPanel";
import SpotifyEmbed from "@/components/SpotifyEmbed";

function SpotifyWordmark() {
  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      <span className="text-sm font-bold text-foreground tracking-tight">Artist Search</span>
    </div>
  );
}

type SearchResult = {
  found: boolean;
  artist: {
    spotifyId: string;
    displayName: string;
    spotifyName: string;
    directLink: string;
    imageUrl: string | null;
    genres: string[];
    followers: number | null;
    popularity: number | null;
    discogsId: string | null;
    discogsBio: string | null;
  } | null;
  fromCache: boolean;
} | null;

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchMutation = trpc.artist.search.useMutation({
    onSuccess: (data) => {
      setSearchResult(data);
      setHasSearched(true);
    },
  });

  const { data: recentArtists, isLoading: recentLoading } = trpc.artist.recent.useQuery(
    { limit: 6 },
    { refetchOnWindowFocus: false }
  );

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchResult(null);
    setHasSearched(false);
    searchMutation.mutate({ query: trimmed });
  }, [query, searchMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setSearchResult(null);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleRecentClick = (name: string) => {
    setQuery(name);
    setSearchResult(null);
    setHasSearched(false);
    searchMutation.mutate({ query: name });
  };

  const artist = searchResult?.artist;
  const isLoading = searchMutation.isPending;

  return (
    <div className="app-container bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <SpotifyWordmark />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </header>

      {/* Hauptinhalt */}
      <main className="px-4 pt-6 pb-24 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Künstler entdecken
          </h1>
          <p className="text-sm text-muted-foreground">
            Suche, validiere und entdecke Musik mit KI
          </p>
        </div>

        {/* Suchfeld */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Künstlername eingeben..."
              className="pl-10 pr-10 h-12 rounded-xl bg-secondary border-border text-foreground placeholder:text-muted-foreground text-base focus-visible:ring-primary"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Suche leeren"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isLoading}
            className="h-12 px-5 rounded-xl font-semibold flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Suchen"
            )}
          </Button>
        </div>

        {/* Ladezustand */}
        {isLoading && <ArtistCardSkeleton />}

        {/* Suchergebnis */}
        {!isLoading && hasSearched && (
          <div className="space-y-4">
            {searchResult?.found && artist ? (
              <>
                <ArtistCard
                  spotifyName={artist.spotifyName}
                  displayName={artist.displayName}
                  spotifyId={artist.spotifyId}
                  directLink={artist.directLink}
                  imageUrl={artist.imageUrl}
                  genres={artist.genres}
                  followers={artist.followers}
                  popularity={artist.popularity}
                  fromCache={searchResult.fromCache}
                />
                <SpotifyEmbed
                  artistId={artist.spotifyId}
                  artistName={artist.spotifyName}
                />
                <AIRecommendations
                  artistName={artist.spotifyName}
                  genres={artist.genres}
                />
                <DiscogsPanel
                  artistName={artist.spotifyName}
                  spotifyId={artist.spotifyId}
                />
              </>
            ) : (
              <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Kein Treffer gefunden</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Für <span className="text-foreground font-medium">"{query}"</span> wurde kein Spotify-Künstler gefunden.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Überprüfe die Schreibweise oder versuche einen anderen Namen.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Zuletzt gesucht */}
        {!isLoading && !hasSearched && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Zuletzt gesucht
              </span>
            </div>

            {recentLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ArtistCardSkeleton key={i} compact />
                ))}
              </div>
            ) : recentArtists && recentArtists.length > 0 ? (
              <div className="space-y-2">
                {recentArtists.map((a) => (
                  <button
                    key={a.spotifyId}
                    onClick={() => handleRecentClick(a.spotifyName)}
                    className="w-full text-left"
                  >
                    <ArtistCard
                      spotifyName={a.spotifyName}
                      directLink={a.directLink}
                      imageUrl={a.imageUrl}
                      genres={a.genres}
                      followers={a.followers}
                      popularity={a.popularity}
                      compact
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Music2 size={28} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Noch keine Suchen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Suche nach einem Künstler, um zu starten.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
