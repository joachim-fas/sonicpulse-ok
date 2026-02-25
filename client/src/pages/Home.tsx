import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Sparkles,
  Loader2,
  Disc,
  Mic2,
  Plus,
  X,
  PartyPopper,
  Trash2,
  ExternalLink,
  ListMusic,
  CheckCircle2,
  LogOut,
  User,
  Heart,
  Quote,
  Guitar,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { trpc } from "@/lib/trpc";
import { SpotifyEmbedCard } from "@/components/SpotifyEmbedCard";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recommendation {
  artist: string;
  reason: string;
  genre: string;
  similarTo: string;
  enriched?: { image?: string | null; url?: string | null; previewUrl?: string | null };
}

interface Track {
  title: string;
  artist: string;
  reason: string;
  enriched?: { image?: string | null; url?: string | null; previewUrl?: string | null; uri?: string | null };
}

interface MoodSong {
  title: string;
  artist: string;
  emotionalBridge: string;
  genre: string;
  lyricMoment: string;
  enriched?: { image?: string | null; url?: string | null; spotifyId?: string | null };
}

interface EmotionalProfile {
  coreEmotion: string;
  occasion: string;
  musicNeed: string;
  intensity: "subtle" | "moderate" | "intense";
  emotionalNote: string;
}

interface MBSuggestion { id: string; name: string; country?: string | null; }

// ─── Spotify Session ID ───────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  const key = "sonicpulse_spotify_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ─── Extract Spotify Artist ID from URL ──────────────────────────────────────
function extractSpotifyArtistId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/artist\/([A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

// ─── SpotifyLink: only real artist profiles, never /search/ ──────────────────
const SpotifyLink = ({
  url, children, className,
}: { url?: string | null; children: React.ReactNode; className?: string }) => {
  if (!url || url.includes("/search/")) return <span className={className}>{children}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} aria-label="Open on Spotify">
      {children}
    </a>
  );
};

// ─── Spotify Logo SVG ─────────────────────────────────────────────────────────
const SpotifyLogo = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// ─── Info Modal ───────────────────────────────────────────────────────────────
const InfoModal = ({ type, onClose }: { type: "privacy" | "terms" | "spotify"; onClose: () => void }) => {
  const content = {
    privacy: {
      title: "Privacy Policy",
      text: (
        <div className="space-y-4 text-sm text-white/70 font-light leading-relaxed">
          <p>SonicPulse is currently in an experimental beta testing phase and is strictly non-commercial.</p>
          <p><strong>Data Usage:</strong> We use your data solely for generating personalized music recommendations.</p>
          <p><strong>Data Storage:</strong> We do not permanently store your personal data, and we do not sell or share it with third parties.</p>
        </div>
      ),
    },
    terms: {
      title: "Terms of Service",
      text: (
        <div className="space-y-4 text-sm text-white/70 font-light leading-relaxed">
          <p>Welcome to SonicPulse. By accessing this experimental application, you agree to the following terms.</p>
          <p><strong>Beta Status:</strong> SonicPulse is a work-in-progress provided strictly on an "as-is" basis.</p>
          <p><strong>No Warranty:</strong> Features may change at any time without notice.</p>
        </div>
      ),
    },
    spotify: {
      title: "Spotify API Attribution",
      text: (
        <div className="space-y-4 text-sm text-white/70 font-light leading-relaxed">
          <p>SonicPulse uses the <strong>Spotify Web API</strong> and <strong>MusicBrainz</strong> to retrieve artist metadata and power our recommendation engine.</p>
          <p><strong>Playlist Creation:</strong> When you connect your Spotify account, SonicPulse can create playlists in your account using the official Spotify Web API.</p>
          <p><strong>Disclaimer:</strong> SonicPulse is independent and <strong>not</strong> affiliated with, endorsed, or sponsored by Spotify AB.</p>
          <p>All music metadata and artist images are the property of their respective rightsholders.</p>
        </div>
      ),
    },
  };
  const { title, text } = content[type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-light tracking-tight mb-6">{title}</h2>
        {text}
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-xs uppercase tracking-widest transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Artist Input with MusicBrainz Autocomplete ───────────────────────────────
const ArtistInput = ({
  value, onChange, onSelect, placeholder, accentColor = "cyan", onRemove, showRemove = false,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (name: string) => void;
  placeholder: string;
  accentColor?: "cyan" | "fuchsia" | "rose";
  onRemove?: () => void;
  showRemove?: boolean;
}) => {
  const [suggestions, setSuggestions] = useState<MBSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  const handleChange = async (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await utils.sonicpulse.musicbrainzSearch.fetch({ query: val });
        setSuggestions(res as MBSuggestion[]);
        setOpen(true);
      } catch { /* ignore */ }
    }, 300);
  };

  const handleSelect = (name: string) => { onSelect(name); setSuggestions([]); setOpen(false); };

  const borderColor = {
    cyan:    "border-cyan-500/30 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]",
    fuchsia: "border-fuchsia-500/30 focus:border-fuchsia-500 focus:shadow-[0_0_15px_rgba(217,70,239,0.3)]",
    rose:    "border-rose-500/30 focus:border-rose-400 focus:shadow-[0_0_15px_rgba(244,114,182,0.25)]",
  }[accentColor];

  const textColor = {
    cyan:    "text-cyan-50",
    fuchsia: "text-fuchsia-50",
    rose:    "text-rose-50",
  }[accentColor];

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-black border rounded-xl px-4 py-3 text-sm font-light focus:outline-none transition-all placeholder:text-white/40",
            borderColor, textColor, showRemove ? "pr-16" : "pr-10"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {showRemove && (
            <button onClick={onRemove} className="text-white/10 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
          <Mic2 size={14} className="text-white/10" />
        </div>
      </div>
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute z-20 left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                onMouseDown={() => handleSelect(s.name)}
                className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex justify-between items-center"
              >
                <span className="text-xs font-light">{s.name}</span>
                <span className="text-[8px] uppercase tracking-widest text-white/20">{s.country ?? "Artist"}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Playlist Success Modal ───────────────────────────────────────────────────
const PlaylistSuccessModal = ({
  playlistUrl, tracksAdded, tracksNotFound, onClose,
}: {
  playlistUrl: string; tracksAdded: number; tracksNotFound: string[]; onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      className="relative w-full max-w-md bg-zinc-900 border border-[#1DB954]/30 rounded-3xl p-8 shadow-2xl"
    >
      <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
        <X size={20} />
      </button>
      <div className="flex flex-col items-center text-center gap-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-[#1DB954]/20 flex items-center justify-center"
        >
          <CheckCircle2 size={40} className="text-[#1DB954]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-light tracking-tight mb-2">Playlist created!</h2>
          <p className="text-white/50 text-sm font-light">
            {tracksAdded} {tracksAdded === 1 ? "track" : "tracks"} added to your Spotify playlist.
          </p>
          {tracksNotFound.length > 0 && (
            <p className="text-white/30 text-xs mt-2 font-light">
              {tracksNotFound.length} {tracksNotFound.length === 1 ? "track" : "tracks"} not found on Spotify.
            </p>
          )}
        </div>
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-8 py-3 rounded-full bg-[#1DB954] text-black font-medium text-sm hover:bg-[#1ed760] transition-all active:scale-95"
        >
          <SpotifyLogo size={18} />
          Open playlist on Spotify
        </a>
        <button onClick={onClose} className="text-white/30 text-xs hover:text-white/60 transition-colors">
          Close
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── Spotify Save Section (shared across modes) ───────────────────────────────
const SpotifySaveSection = ({
  tracks,
  playlistName,
  onPlaylistNameChange,
  showNameInput,
  onToggleNameInput,
  onSave,
  onLogin,
  isLoggedIn,
  isLoginPending,
  isSaving,
  saveError,
  accentColor = "green",
  compact = false,
}: {
  tracks: { title: string; artist: string }[];
  playlistName: string;
  onPlaylistNameChange: (v: string) => void;
  showNameInput: boolean;
  onToggleNameInput: () => void;
  onSave: () => void;
  onLogin: () => void;
  isLoggedIn: boolean;
  isLoginPending: boolean;
  isSaving: boolean;
  saveError?: string | null;
  accentColor?: "green" | "rose";
  compact?: boolean;
}) => {
  const saveBtn = accentColor === "rose"
    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-400 hover:to-pink-400"
    : "bg-[#1DB954] text-black hover:bg-[#1ed760]";

  if (!isLoggedIn) {
    return (
      <button
        onClick={onLogin}
        disabled={isLoginPending}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
          "bg-[#1DB954] text-black hover:bg-[#1ed760]"
        )}
      >
        {isLoginPending ? <Loader2 size={14} className="animate-spin" /> : <SpotifyLogo size={14} />}
        Connect Spotify
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {showNameInput && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => onPlaylistNameChange(e.target.value)}
            placeholder="Playlist name..."
            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm font-light focus:outline-none focus:border-[#1DB954]/50 text-white placeholder:text-white/30 w-full md:w-64"
          />
        </motion.div>
      )}
      <div className="flex items-center gap-2">
        {!compact && (
          <button
            onClick={onToggleNameInput}
            className="text-white/30 hover:text-white/60 transition-colors text-xs"
          >
            {showNameInput ? "▲" : "▼"} Name
          </button>
        )}
        <button
          onClick={onSave}
          disabled={isSaving || !tracks.length}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            saveBtn,
            isSaving && "animate-pulse"
          )}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ListMusic size={14} />}
          {isSaving ? "Saving..." : "Save as playlist"}
        </button>
      </div>
      {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
    </div>
  );
};

// ─── Floating Save Button (shared) ───────────────────────────────────────────
const FloatingSaveButton = ({
  tracks,
  playlistName,
  onSave,
  onLogin,
  isLoggedIn,
  isLoginPending,
  isSaving,
  accentColor = "green",
}: {
  tracks: { title: string; artist: string }[];
  playlistName: string;
  onSave: () => void;
  onLogin: () => void;
  isLoggedIn: boolean;
  isLoginPending: boolean;
  isSaving: boolean;
  accentColor?: "green" | "rose";
}) => {
  const saveBtn = accentColor === "rose"
    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-400 hover:to-pink-400 shadow-rose-900/40"
    : "bg-[#1DB954] text-black hover:bg-[#1ed760] shadow-green-900/40";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-8 flex justify-center">
      {isLoggedIn ? (
        <button
          onClick={onSave}
          disabled={isSaving || !tracks.length}
          className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-full font-medium text-sm uppercase tracking-widest transition-all active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed",
            saveBtn,
            isSaving && "animate-pulse"
          )}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ListMusic size={18} />}
          {isSaving ? "Creating playlist..." : `Save playlist (${tracks.length} tracks)`}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Connect Spotify to save this playlist</p>
          <button
            onClick={onLogin}
            disabled={isLoginPending}
            className="flex items-center gap-3 px-8 py-4 rounded-full font-medium text-sm uppercase tracking-widest bg-[#1DB954] text-black hover:bg-[#1ed760] transition-all active:scale-95 shadow-2xl disabled:opacity-50"
          >
            {isLoginPending ? <Loader2 size={18} className="animate-spin" /> : <SpotifyLogo size={18} />}
            Connect Spotify & save playlist
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ─── Intensity Badge ──────────────────────────────────────────────────────────
const IntensityBadge = ({ intensity }: { intensity: "subtle" | "moderate" | "intense" }) => {
  const config = {
    subtle:   { color: "bg-sky-500/15 text-sky-300 border-sky-500/20",     dots: 1 },
    moderate: { color: "bg-amber-500/15 text-amber-300 border-amber-500/20", dots: 2 },
    intense:  { color: "bg-rose-500/15 text-rose-300 border-rose-500/20",   dots: 3 },
  }[intensity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] uppercase tracking-widest font-medium", config.color)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={cn("w-1 h-1 rounded-full", i < config.dots ? "bg-current" : "bg-current opacity-20")} />
      ))}
      {intensity}
    </span>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<"explore" | "party" | "mood">("explore");

  // Explore
  const [exploreBands, setExploreBands] = useState<string[]>(["", "", ""]);
  const [discoveryLevel, setDiscoveryLevel] = useState<"mainstream" | "underground" | "exotics">("underground");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [explorePlaylistName, setExplorePlaylistName] = useState("SonicPulse Explore Mix");
  const [showExplorePlaylistInput, setShowExplorePlaylistInput] = useState(false);

  // Party
  const [partyArtists, setPartyArtists] = useState<string[]>(["", "", ""]);
  const [partyLength, setPartyLength] = useState(10);
  const [partyEnergy, setPartyEnergy] = useState<"chill" | "medium" | "high">("high");
  const [partyPlaylist, setPartyPlaylist] = useState<Track[]>([]);
  const [partyPlaylistName, setPartyPlaylistName] = useState("SonicPulse Party Mix");
  const [showPartyPlaylistInput, setShowPartyPlaylistInput] = useState(false);

  // Mood
  const [moodPrompt, setMoodPrompt] = useState("");
  const [moodReference, setMoodReference] = useState("");
  const [moodSongs, setMoodSongs] = useState<MoodSong[]>([]);
  const [emotionalProfile, setEmotionalProfile] = useState<EmotionalProfile | null>(null);
  const [moodPlaylistName, setMoodPlaylistName] = useState("SonicPulse Mood Mix");
  const [showMoodPlaylistInput, setShowMoodPlaylistInput] = useState(false);

  // UI
  const [infoModal, setInfoModal] = useState<"privacy" | "terms" | "spotify" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [playlistSuccess, setPlaylistSuccess] = useState<{
    url: string; tracksAdded: number; tracksNotFound: string[];
  } | null>(null);

  // ─── Spotify Session ─────────────────────────────────────────────────────
  const [sessionId] = useState(() => getOrCreateSessionId());

  const sessionQuery = trpc.spotifyAuth.getSession.useQuery(
    { sessionId },
    { refetchOnWindowFocus: true, staleTime: 30_000 }
  );

  const getAuthUrlMutation = trpc.spotifyAuth.getAuthUrl.useMutation();
  const logoutMutation = trpc.spotifyAuth.logout.useMutation({
    onSuccess: () => sessionQuery.refetch(),
  });
  const createPlaylistMutation = trpc.spotifyAuth.createPlaylist.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setPlaylistSuccess({
          url: data.playlistUrl,
          tracksAdded: data.tracksAdded,
          tracksNotFound: data.tracksNotFound,
        });
      }
    },
  });

  const isSpotifyLoggedIn = sessionQuery.data?.loggedIn ?? false;
  const spotifyDisplayName = sessionQuery.data?.loggedIn ? sessionQuery.data.displayName : null;

  // ─── OAuth Callback URL params ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify_connected") === "true") {
      sessionQuery.refetch();
      window.history.replaceState({}, "", window.location.pathname);
      setHasStarted(true);
      setMode("party");
    }
    if (params.get("spotify_error")) {
      console.error("[Spotify] OAuth error:", params.get("spotify_error"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSpotifyLogin = async () => {
    const redirectUri = `${window.location.origin}/api/spotify/callback`;
    const result = await getAuthUrlMutation.mutateAsync({ sessionId, redirectUri });
    window.location.href = result.url;
  };

  const handleCreatePlaylist = async (tracks: { title: string; artist: string }[], name: string) => {
    if (!tracks.length) return;
    createPlaylistMutation.mutate({ sessionId, playlistName: name, tracks });
  };

  const saveError = createPlaylistMutation.data && !createPlaylistMutation.data.success
    ? (createPlaylistMutation.data.error ?? "Failed to create playlist.")
    : null;

  // ─── Mutations ────────────────────────────────────────────────────────────
  const exploreMutation = trpc.sonicpulse.explore.useMutation({
    onSuccess: (data) => setRecommendations(data.recommendations as Recommendation[]),
  });
  const partyMutation = trpc.sonicpulse.party.useMutation({
    onSuccess: (data) => setPartyPlaylist(data.tracks as Track[]),
  });
  const moodMutation = trpc.sonicpulse.mood.useMutation({
    onSuccess: (data) => {
      setMoodSongs(data.songs as MoodSong[]);
      setEmotionalProfile(data.emotionalProfile as EmotionalProfile | null);
    },
  });

  const isGenerating = exploreMutation.isPending || partyMutation.isPending || moodMutation.isPending;

  const handleModeSelect = (newMode: "explore" | "party" | "mood") => {
    setMode(newMode);
    setHasStarted(true);
  };

  const generateRecommendations = useCallback(() => {
    const artists = exploreBands.filter((b) => b.trim());
    if (!artists.length) return;
    setRecommendations([]);
    setLoadingMessage("Consulting the AI oracle...");
    exploreMutation.mutate({ artists, discoveryLevel });
  }, [exploreBands, discoveryLevel, exploreMutation]);

  const generatePartyPlaylist = useCallback(() => {
    const artists = partyArtists.filter((a) => a.trim());
    if (!artists.length) return;
    setPartyPlaylist([]);
    setLoadingMessage("Setting the mood...");
    partyMutation.mutate({ artists, energy: partyEnergy, trackCount: partyLength });
  }, [partyArtists, partyEnergy, partyLength, partyMutation]);

  const generateMoodPlaylist = useCallback(() => {
    if (!moodPrompt.trim()) return;
    setMoodSongs([]);
    setEmotionalProfile(null);
    setLoadingMessage("Reading your emotional landscape...");
    moodMutation.mutate({
      prompt: moodPrompt.trim(),
      songCount: 3,
      musicReference: moodReference.trim() || undefined,
    });
  }, [moodPrompt, moodReference, moodMutation]);

  // ─── Background Gradient ──────────────────────────────────────────────────
  const bgGradient = !hasStarted
    ? "radial-gradient(circle at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 70%)"
    : mode === "explore"
    ? "radial-gradient(circle at 50% 0%, rgba(6,182,212,0.15) 0%, transparent 70%)"
    : mode === "party"
    ? "radial-gradient(circle at 50% 0%, rgba(217,70,239,0.15) 0%, transparent 70%)"
    : "radial-gradient(circle at 50% 0%, rgba(244,114,182,0.18) 0%, transparent 70%)";

  const blob1 = !hasStarted ? "bg-yellow-900/40" : mode === "explore" ? "bg-cyan-900/40" : mode === "party" ? "bg-fuchsia-900/40" : "bg-rose-900/40";
  const blob2 = !hasStarted ? "bg-amber-900/40" : mode === "explore" ? "bg-blue-900/40" : mode === "party" ? "bg-orange-900/40" : "bg-pink-900/30";

  // ─── Mood Placeholder Examples ────────────────────────────────────────────
  const moodExamples = [
    "I just quit my job and feel both liberated and terrified.",
    "It's the first anniversary of my mother's passing.",
    "I'm in love, but the person doesn't know it.",
    "Long road trip alone – I need something for the silence between thoughts.",
    "My best friend is moving to another city. Last night together.",
    "I finally achieved something I've been working on for years.",
  ];
  const [moodPlaceholder] = useState(() => moodExamples[Math.floor(Math.random() * moodExamples.length)]);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden relative">

      {/* ── Animated Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ background: bgGradient }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0"
        />
        <motion.div
          animate={{ x: [0,80,0,-80,0], y: [0,40,0,-40,0], scale: [1,1.15,1,1.15,1], opacity: 0.3 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={cn("absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000", blob1)}
        />
        <motion.div
          animate={{ x: [0,-80,0,80,0], y: [0,-40,0,40,0], scale: [1,1.2,1,1.2,1], opacity: 0.2 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={cn("absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] mix-blend-screen transition-colors duration-1000", blob2)}
        />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 py-6 border-b border-white/5 backdrop-blur-md sticky top-0">
        <button
          onClick={() => setHasStarted(false)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Disc className="text-white" size={24} />
          <span className="text-xl font-light tracking-widest uppercase">SonicPulse</span>
        </button>

        <div className="flex items-center gap-3">
          {hasStarted && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5">
              {(["explore", "party", "mood"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeSelect(m)}
                  className={cn(
                    "px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                    mode === m ? "bg-white text-black" : "text-white/40 hover:text-white"
                  )}
                >{m}</button>
              ))}
            </div>
          )}

          {isSpotifyLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] text-[10px] uppercase tracking-widest">
                <User size={10} />
                <span className="max-w-[100px] truncate">{spotifyDisplayName}</span>
              </div>
              <button
                onClick={() => logoutMutation.mutate({ sessionId })}
                title="Disconnect Spotify"
                className="p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 pb-28">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            /* ── Landing ── */
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-[70vh] text-center"
            >
              <h1 className="text-6xl md:text-8xl font-light tracking-tighter mb-8 leading-none">
                Your sound,<br />
                <span className="italic" style={{ fontFamily: "Georgia, serif" }}>reimagined.</span>
              </h1>
              <p className="text-white/40 max-w-md mb-12 text-lg font-light leading-relaxed">
                Choose your journey. Explore new sounds, generate the perfect party mix, or find music for this exact moment.
              </p>
              <div className="flex flex-col md:flex-row gap-6 justify-center w-full max-w-3xl">
                <button
                  onClick={() => handleModeSelect("explore")}
                  className="relative flex-1 group p-6 md:p-8 bg-zinc-900/30 border border-white/5 rounded-[32px] hover:bg-white hover:text-black transition-all duration-500 text-left"
                >
                  <motion.div whileHover={{ rotate: 15, scale: 1.1 }} className="inline-block mb-4">
                    <Sparkles className="opacity-40 group-hover:opacity-100 text-cyan-500 transition-colors" size={32} />
                  </motion.div>
                  <h3 className="text-2xl font-light mb-2">Explore Mode</h3>
                  <p className="text-xs opacity-40 group-hover:opacity-60 uppercase tracking-widest">Discover new artists based on your input</p>
                </button>
                <button
                  onClick={() => handleModeSelect("party")}
                  className="relative flex-1 group p-6 md:p-8 bg-zinc-900/30 border border-white/5 rounded-[32px] hover:bg-white hover:text-black transition-all duration-500 text-left"
                >
                  <motion.div whileHover={{ rotate: -15, scale: 1.1 }} className="inline-block mb-4">
                    <PartyPopper className="opacity-40 group-hover:opacity-100 text-fuchsia-500 transition-colors" size={32} />
                  </motion.div>
                  <h3 className="text-2xl font-light mb-2">Party Mode</h3>
                  <p className="text-xs opacity-40 group-hover:opacity-60 uppercase tracking-widest">Generate high-energy playlists for any vibe</p>
                </button>
                <button
                  onClick={() => handleModeSelect("mood")}
                  className="relative flex-1 group p-6 md:p-8 bg-zinc-900/30 border border-white/5 rounded-[32px] hover:bg-white hover:text-black transition-all duration-500 text-left"
                >
                  <motion.div whileHover={{ scale: 1.15 }} className="inline-block mb-4">
                    <Heart className="opacity-40 group-hover:opacity-100 text-rose-400 transition-colors" size={32} />
                  </motion.div>
                  <h3 className="text-2xl font-light mb-2">Mood Mode</h3>
                  <p className="text-xs opacity-40 group-hover:opacity-60 uppercase tracking-widest">Music for this exact emotional moment</p>
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Dashboard ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5 }}
              className="space-y-20"
            >
              <AnimatePresence mode="wait">
                <motion.section
                  key={mode}
                  initial={{ opacity: 0, x: mode === "explore" ? -20 : mode === "party" ? 20 : 0, y: mode === "mood" ? 20 : 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-12">
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 block">
                      {mode === "explore" ? "Manual Input" : mode === "party" ? "Party Vibes" : "Emotional Intelligence"}
                    </span>
                    <h2 className="text-5xl font-light tracking-tight">
                      {mode === "explore" ? "Explore New Sounds" : mode === "party" ? "Party Mode" : "Mood Mode"}
                    </h2>
                  </div>

                  {/* ── Explore ── */}
                  {mode === "explore" && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                        {exploreBands.map((band, idx) => (
                          <ArtistInput
                            key={idx}
                            value={band}
                            accentColor="cyan"
                            placeholder={`Band #${idx + 1}`}
                            onChange={(val) => { const n = [...exploreBands]; n[idx] = val; setExploreBands(n); }}
                            onSelect={(name) => { const n = [...exploreBands]; n[idx] = name; setExploreBands(n); }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-4 md:p-8 bg-zinc-900/30 rounded-[32px] border border-white/5 max-w-4xl mx-auto">
                        <div className="flex flex-wrap items-center justify-center gap-8 w-full">
                          <div className="flex flex-col gap-2">
                            <span className="text-[8px] uppercase tracking-widest text-white/20 text-center">Discovery</span>
                            <div className="flex items-center justify-center gap-2 bg-black/40 p-1 rounded-full border border-white/5">
                              {(["mainstream", "underground", "exotics"] as const).map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setDiscoveryLevel(level)}
                                  className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all",
                                    discoveryLevel === level ? "bg-white text-black" : "text-white/40 hover:text-white"
                                  )}
                                >{level}</button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={generateRecommendations}
                            disabled={isGenerating || exploreBands.every((b) => !b.trim())}
                            className={cn(
                              "flex items-center justify-center gap-2 px-8 py-2.5 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest bg-white text-black hover:bg-white/90",
                              isGenerating && "animate-pulse"
                            )}
                          >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {isGenerating ? loadingMessage : "Get Suggestions"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Party ── */}
                  {mode === "party" && (
                    <div className="space-y-12 max-w-4xl mx-auto">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {partyArtists.map((artist, idx) => (
                          <ArtistInput
                            key={idx}
                            value={artist}
                            accentColor="fuchsia"
                            placeholder={`Artist #${idx + 1}`}
                            showRemove={partyArtists.length > 1}
                            onChange={(val) => { const n = [...partyArtists]; n[idx] = val; setPartyArtists(n); }}
                            onSelect={(name) => { const n = [...partyArtists]; n[idx] = name; setPartyArtists(n); }}
                            onRemove={() => partyArtists.length > 1 && setPartyArtists(partyArtists.filter((_, i) => i !== idx))}
                          />
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => setPartyArtists([...partyArtists, ""])}
                          className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                          <Plus size={16} />Add more artists
                        </button>
                      </div>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-4 md:p-8 bg-zinc-900/30 rounded-[32px] border border-white/5">
                        <div className="flex flex-wrap items-center justify-center gap-8 w-full">
                          <div className="flex flex-col gap-2">
                            <span className="text-[8px] uppercase tracking-widest text-white/20 text-center">Energy</span>
                            <div className="flex items-center justify-center gap-2 bg-black/40 p-1 rounded-full border border-white/5">
                              {(["chill", "medium", "high"] as const).map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setPartyEnergy(level)}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-[9px] uppercase tracking-widest transition-all",
                                    partyEnergy === level ? "bg-white text-black" : "text-white/40 hover:text-white"
                                  )}
                                >{level}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-center">
                            <span className="text-[8px] uppercase tracking-widest text-white/20">Tracks: {partyLength}</span>
                            <input
                              type="range" min={5} max={20} value={partyLength}
                              onChange={(e) => setPartyLength(Number(e.target.value))}
                              className="w-32 accent-fuchsia-500"
                            />
                          </div>
                          <button
                            onClick={generatePartyPlaylist}
                            disabled={isGenerating || partyArtists.every((a) => !a.trim())}
                            className={cn(
                              "flex items-center justify-center gap-2 px-8 py-2.5 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest bg-fuchsia-600 text-white hover:bg-fuchsia-500",
                              isGenerating && "animate-pulse"
                            )}
                          >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <PartyPopper size={18} />}
                            {isGenerating ? loadingMessage : "Generate Playlist"}
                          </button>
                        </div>
                      </div>

                      {/* Party Playlist */}
                      {(partyPlaylist.length > 0 || partyMutation.isPending) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                              <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 block">The Lineup</span>
                              <h2 className="text-4xl font-light tracking-tight italic" style={{ fontFamily: "Georgia, serif" }}>
                                Your Party Playlist
                              </h2>
                            </div>
                            {partyPlaylist.length > 0 && (
                              <SpotifySaveSection
                                tracks={partyPlaylist.map((t) => ({ title: t.title, artist: t.artist }))}
                                playlistName={partyPlaylistName}
                                onPlaylistNameChange={setPartyPlaylistName}
                                showNameInput={showPartyPlaylistInput}
                                onToggleNameInput={() => setShowPartyPlaylistInput(!showPartyPlaylistInput)}
                                onSave={() => handleCreatePlaylist(partyPlaylist.map((t) => ({ title: t.title, artist: t.artist })), partyPlaylistName)}
                                onLogin={handleSpotifyLogin}
                                isLoggedIn={isSpotifyLoggedIn}
                                isLoginPending={getAuthUrlMutation.isPending}
                                isSaving={createPlaylistMutation.isPending}
                                saveError={saveError}
                              />
                            )}
                          </div>

                          <div className="space-y-3">
                            {partyMutation.isPending && partyPlaylist.length === 0
                              ? [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />)
                              : partyPlaylist.map((track, idx) => (
                                <div key={idx}>
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-800/50 transition-all duration-300"
                                  >
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/5 flex items-center justify-center text-white/20 overflow-hidden relative shrink-0 shadow-lg">
                                      {track.enriched?.image
                                        ? <img src={track.enriched.image} alt={track.artist} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                        : <span className="text-xl font-mono opacity-50">{String(idx + 1).padStart(2, "0")}</span>
                                      }
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1.5 w-full">
                                      <p className="text-sm text-fuchsia-400 uppercase tracking-widest font-medium">{track.artist}</p>
                                      <h4 className="text-xl font-light tracking-tight">{track.title}</h4>
                                      <p className="text-xs text-white/40 italic font-light leading-relaxed line-clamp-2">{track.reason}</p>
                                      {track.enriched?.url ? (
                                        <a href={track.enriched.url} target="_blank" rel="noopener noreferrer"
                                          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30 text-[#1DB954] text-[10px] uppercase tracking-widest hover:bg-[#1DB954]/20 transition-all w-fit">
                                          <SpotifyLogo size={12} />Open on Spotify
                                        </a>
                                      ) : (
                                        <span className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-white/20 text-[10px] uppercase tracking-widest w-fit">
                                          Not on Spotify
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
                                  {extractSpotifyArtistId(track.enriched?.url) && (
                                    <div className="mt-2">
                                      <SpotifyEmbedCard artistId={extractSpotifyArtistId(track.enriched?.url)} artistName={track.artist} accentColor="fuchsia" />
                                    </div>
                                  )}
                                </div>
                              ))
                            }
                          </div>

                          {partyPlaylist.length > 0 && (
                            <FloatingSaveButton
                              tracks={partyPlaylist.map((t) => ({ title: t.title, artist: t.artist }))}
                              playlistName={partyPlaylistName}
                              onSave={() => handleCreatePlaylist(partyPlaylist.map((t) => ({ title: t.title, artist: t.artist })), partyPlaylistName)}
                              onLogin={handleSpotifyLogin}
                              isLoggedIn={isSpotifyLoggedIn}
                              isLoginPending={getAuthUrlMutation.isPending}
                              isSaving={createPlaylistMutation.isPending}
                            />
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* ── Mood Mode ── */}
                  {mode === "mood" && (
                    <div className="space-y-12 max-w-3xl mx-auto">

                      {/* Input area */}
                      <div className="space-y-5">
                        <p className="text-white/50 text-sm font-light leading-relaxed max-w-xl">
                          Describe your moment. What occasion are you looking for music for? What do you want to express or feel?
                          The AI reads the emotional depth of your words and finds songs that truly fit.
                        </p>

                        {/* Emotional description */}
                        <div className="relative">
                          <textarea
                            value={moodPrompt}
                            onChange={(e) => setMoodPrompt(e.target.value)}
                            placeholder={moodPlaceholder}
                            rows={4}
                            maxLength={1000}
                            className="w-full bg-zinc-950 border border-rose-500/20 focus:border-rose-400/50 rounded-2xl px-5 py-4 text-sm font-light text-white/90 placeholder:text-white/25 focus:outline-none transition-all resize-none focus:shadow-[0_0_30px_rgba(244,114,182,0.12)] leading-relaxed"
                          />
                          <div className="absolute bottom-3 right-4 text-[9px] text-white/20 uppercase tracking-widest">
                            {moodPrompt.length}/1000
                          </div>
                        </div>

                        {/* Musical reference (optional) */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Guitar size={12} className="text-white/25" />
                            <span className="text-[9px] uppercase tracking-widest text-white/30">Musical Reference <span className="text-white/20 normal-case tracking-normal">(optional)</span></span>
                          </div>
                          <ArtistInput
                            value={moodReference}
                            onChange={setMoodReference}
                            onSelect={setMoodReference}
                            placeholder="e.g. Radiohead, Nick Cave, Portishead..."
                            accentColor="rose"
                          />
                          <p className="text-[10px] text-white/25 font-light leading-relaxed">
                            Defines the <em>sonic style</em> only — not the emotional content. The AI will find songs in a similar musical universe that match your emotional state.
                          </p>
                        </div>

                        {/* Generate button */}
                        <div className="flex justify-end">
                          <button
                            onClick={generateMoodPlaylist}
                            disabled={isGenerating || !moodPrompt.trim()}
                            className={cn(
                              "flex items-center justify-center gap-2 px-8 py-3 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest",
                              "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-400 hover:to-pink-400",
                              isGenerating && "animate-pulse"
                            )}
                          >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />}
                            {isGenerating ? loadingMessage : "Find My Songs"}
                          </button>
                        </div>
                      </div>

                      {/* Emotional Profile */}
                      <AnimatePresence>
                        {(emotionalProfile || moodMutation.isPending) && (
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                          >
                            {moodMutation.isPending && !emotionalProfile ? (
                              <div className="p-6 bg-zinc-900/60 border border-rose-500/10 rounded-3xl space-y-3">
                                <div className="h-4 bg-zinc-800 rounded-full animate-pulse w-1/3" />
                                <div className="h-3 bg-zinc-800 rounded-full animate-pulse w-2/3" />
                                <div className="h-3 bg-zinc-800 rounded-full animate-pulse w-1/2" />
                              </div>
                            ) : emotionalProfile && (
                              <div className="p-6 md:p-8 bg-gradient-to-br from-rose-950/40 to-zinc-900/60 border border-rose-500/15 rounded-3xl space-y-5">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                  <div>
                                    <span className="text-[9px] uppercase tracking-[0.3em] text-rose-400/60 block mb-1">Emotional Profile</span>
                                    <h3 className="text-2xl font-light tracking-tight text-rose-100">{emotionalProfile.coreEmotion}</h3>
                                  </div>
                                  <IntensityBadge intensity={emotionalProfile.intensity} />
                                </div>

                                {/* Empathetic note */}
                                <div className="flex gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                  <Quote size={14} className="text-rose-400/50 shrink-0 mt-0.5" />
                                  <p className="text-sm text-white/70 font-light leading-relaxed italic">{emotionalProfile.emotionalNote}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-[8px] uppercase tracking-widest text-white/25">Occasion</span>
                                    <p className="text-sm text-white/60 font-light">{emotionalProfile.occasion}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] uppercase tracking-widest text-white/25">Music Need</span>
                                    <p className="text-sm text-white/60 font-light">{emotionalProfile.musicNeed}</p>
                                  </div>
                                </div>

                                {moodReference && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <Guitar size={11} className="text-white/25" />
                                    <span className="text-[9px] uppercase tracking-widest text-white/25">Musical reference:</span>
                                    <span className="text-[9px] text-white/40 font-light">{moodReference}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Song Cards */}
                      {(moodSongs.length > 0 || moodMutation.isPending) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <div>
                              <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 block">Curated for this moment</span>
                              <h2 className="text-4xl font-light tracking-tight italic" style={{ fontFamily: "Georgia, serif" }}>
                                Your Emotional Soundtrack
                              </h2>
                            </div>

                            {moodSongs.length > 0 && (
                              <SpotifySaveSection
                                tracks={moodSongs.map((s) => ({ title: s.title, artist: s.artist }))}
                                playlistName={moodPlaylistName}
                                onPlaylistNameChange={setMoodPlaylistName}
                                showNameInput={showMoodPlaylistInput}
                                onToggleNameInput={() => setShowMoodPlaylistInput(!showMoodPlaylistInput)}
                                onSave={() => handleCreatePlaylist(moodSongs.map((s) => ({ title: s.title, artist: s.artist })), moodPlaylistName)}
                                onLogin={handleSpotifyLogin}
                                isLoggedIn={isSpotifyLoggedIn}
                                isLoginPending={getAuthUrlMutation.isPending}
                                isSaving={createPlaylistMutation.isPending}
                                saveError={saveError}
                                accentColor="rose"
                              />
                            )}
                          </div>

                          <div className="space-y-4">
                            {moodMutation.isPending && moodSongs.length === 0
                              ? [...Array(3)].map((_, i) => <div key={i} className="h-36 bg-zinc-900 rounded-3xl animate-pulse" />)
                              : moodSongs.map((song, idx) => (
                                <div key={idx}>
                                  <motion.div
                                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group p-6 bg-zinc-900/40 border border-white/5 rounded-3xl hover:bg-zinc-900/60 hover:border-rose-500/10 transition-all duration-400"
                                  >
                                    <div className="flex flex-col md:flex-row items-start gap-5">
                                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 overflow-hidden shrink-0 shadow-lg">
                                        {song.enriched?.image
                                          ? <img src={song.enriched.image} alt={song.artist} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                                          : <Heart size={20} className="text-rose-400/30" />
                                        }
                                      </div>

                                      <div className="flex-1 space-y-3 w-full">
                                        <div>
                                          <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <div>
                                              <p className="text-[10px] text-rose-400/70 uppercase tracking-widest font-medium mb-0.5">{song.artist}</p>
                                              <h4 className="text-xl font-light tracking-tight">{song.title}</h4>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] uppercase tracking-widest text-white/30 shrink-0">{song.genre}</span>
                                          </div>
                                        </div>

                                        <p className="text-sm text-white/55 font-light leading-relaxed">{song.emotionalBridge}</p>

                                        <div className="flex gap-2 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                          <Quote size={11} className="text-rose-400/40 shrink-0 mt-0.5" />
                                          <p className="text-xs text-white/40 italic font-light leading-relaxed">{song.lyricMoment}</p>
                                        </div>

                                        {song.enriched?.url ? (
                                          <a href={song.enriched.url} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/25 text-[#1DB954] text-[10px] uppercase tracking-widest hover:bg-[#1DB954]/20 transition-all w-fit">
                                            <SpotifyLogo size={12} />Open on Spotify
                                          </a>
                                        ) : (
                                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-white/20 text-[10px] uppercase tracking-widest w-fit">
                                            Not on Spotify
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>

                                  {(song.enriched?.spotifyId || extractSpotifyArtistId(song.enriched?.url)) && (
                                    <div className="mt-2">
                                      <SpotifyEmbedCard
                                        artistId={song.enriched?.spotifyId ?? extractSpotifyArtistId(song.enriched?.url)}
                                        artistName={song.artist}
                                        accentColor="emerald"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))
                            }
                          </div>

                          {moodSongs.length > 0 && (
                            <FloatingSaveButton
                              tracks={moodSongs.map((s) => ({ title: s.title, artist: s.artist }))}
                              playlistName={moodPlaylistName}
                              onSave={() => handleCreatePlaylist(moodSongs.map((s) => ({ title: s.title, artist: s.artist })), moodPlaylistName)}
                              onLogin={handleSpotifyLogin}
                              isLoggedIn={isSpotifyLoggedIn}
                              isLoginPending={getAuthUrlMutation.isPending}
                              isSaving={createPlaylistMutation.isPending}
                              accentColor="rose"
                            />
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                </motion.section>
              </AnimatePresence>

              {/* ── Explore Recommendations ── */}
              {(recommendations.length > 0 || exploreMutation.isPending) && mode === "explore" && (
                <section className="pb-20">
                  <div className="mb-12">
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 block">The Future</span>
                    <h2 className="text-5xl font-light tracking-tight italic" style={{ fontFamily: "Georgia, serif" }}>
                      Curated for you
                    </h2>
                  </div>

                  {/* Explore save section */}
                  {recommendations.length > 0 && (
                    <div className="mb-8 flex justify-end">
                      <SpotifySaveSection
                        tracks={recommendations.map((r) => ({ title: r.artist, artist: r.artist }))}
                        playlistName={explorePlaylistName}
                        onPlaylistNameChange={setExplorePlaylistName}
                        showNameInput={showExplorePlaylistInput}
                        onToggleNameInput={() => setShowExplorePlaylistInput(!showExplorePlaylistInput)}
                        onSave={() => handleCreatePlaylist(recommendations.map((r) => ({ title: r.artist, artist: r.artist })), explorePlaylistName)}
                        onLogin={handleSpotifyLogin}
                        isLoggedIn={isSpotifyLoggedIn}
                        isLoginPending={getAuthUrlMutation.isPending}
                        isSaving={createPlaylistMutation.isPending}
                        saveError={saveError}
                        compact
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {exploreMutation.isPending && recommendations.length === 0
                      ? [...Array(3)].map((_, i) => <div key={i} className="aspect-[4/5] bg-zinc-900 rounded-[32px] animate-pulse" />)
                      : recommendations.map((rec, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group bg-zinc-900/30 border border-white/5 rounded-[32px] overflow-hidden hover:bg-zinc-900/50 transition-all duration-500 flex flex-col"
                        >
                          <div className="relative aspect-[16/10] overflow-hidden">
                            {rec.enriched?.image
                              ? <img src={rec.enriched.image} alt={rec.artist} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-700 group-hover:scale-110" />
                              : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music className="text-white/10" size={32} /></div>
                            }
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-6 w-full">
                              <SpotifyLink url={rec.enriched?.url} className="group/name flex items-center gap-2 text-white hover:text-emerald-400 transition-colors text-left">
                                <h3 className="text-2xl font-light tracking-tight">{rec.artist}</h3>
                                {rec.enriched?.url && (
                                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 opacity-0 group-hover/name:opacity-100 transition-all">
                                    <ExternalLink size={12} />
                                  </div>
                                )}
                              </SpotifyLink>
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] uppercase tracking-widest">{rec.genre}</span>
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-start gap-2 mb-4">
                              <motion.div
                                animate={{ y: [0, -4, 0], rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="text-cyan-500 mt-0.5 shrink-0"
                              >
                                <Music size={14} />
                              </motion.div>
                              <p className="text-white/60 font-light leading-relaxed text-xs line-clamp-3">{rec.reason}</p>
                            </div>
                            <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] uppercase tracking-widest text-white/20">
                                  Similar to <span className="text-white/40">{rec.similarTo}</span>
                                </span>
                              </div>
                              <SpotifyEmbedCard artistId={extractSpotifyArtistId(rec.enriched?.url)} artistName={rec.artist} accentColor="cyan" />
                            </div>
                          </div>
                        </motion.div>
                      ))
                    }
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-12 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
          <div className="flex items-center gap-2">
            <Disc size={16} />
            <span className="text-xs uppercase tracking-widest">SONICPULSE © 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em]">
            <button onClick={() => setInfoModal("privacy")} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setInfoModal("terms")} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => setInfoModal("spotify")} className="hover:text-white transition-colors">Spotify API</button>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      <AnimatePresence>
        {infoModal && <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />}
        {playlistSuccess && (
          <PlaylistSuccessModal
            playlistUrl={playlistSuccess.url}
            tracksAdded={playlistSuccess.tracksAdded}
            tracksNotFound={playlistSuccess.tracksNotFound}
            onClose={() => setPlaylistSuccess(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
