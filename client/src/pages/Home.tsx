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
  Trash2,
  ExternalLink,
  ListMusic,
  CheckCircle2,
  LogOut,
  User,
  Heart,
  Quote,
  Guitar,
  ChevronDown,
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
  trackId?: string | null;    // Spotify Track-ID für Track-Embed
  trackUrl?: string | null;   // https://open.spotify.com/track/{id}
  enriched?: { image?: string | null; url?: string | null; spotifyId?: string | null; previewUrl?: string | null; uri?: string | null };
}

interface MoodSong {
  title: string;
  artist: string;
  emotionalBridge: string;
  genre: string;
  lyricMoment: string;
  trackId?: string | null;    // Spotify Track-ID für Track-Embed
  trackUrl?: string | null;   // https://open.spotify.com/track/{id}
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

// ─── Music Loading Bar ──────────────────────────────────────────────────────────
const EXPLORE_MESSAGES = [
  "Bribing the AI with concert tickets...",
  "Asking Keith Richards what he thinks...",
  "Cross-referencing 47 obscure Pitchfork reviews...",
  "Consulting the ghost of John Peel...",
  "Digging through a crate of forgotten 7-inches...",
  "Calculating the exact BPM of your soul...",
  "Translating your taste into 12 musical dimensions...",
  "Arguing with the algorithm about shoegaze...",
  "Checking if this band is still underground enough...",
  "Asking Spotify's recommendation engine nicely...",
  "Dusting off the B-sides...",
  "Running a vibe check on 3,000 artists...",
];

const MOOD_MESSAGES = [
  "Reading your emotional subtext between the lines...",
  "Consulting the International Registry of Sad Songs...",
  "Asking what Nick Cave would do in your situation...",
  "Translating your feelings into chord progressions...",
  "Scanning 40 years of heartbreak anthems...",
  "Calibrating the melancholy-to-euphoria ratio...",
  "Checking if Sufjan Stevens has a song for this...",
  "Decoding your emotional frequency...",
  "Matching your vibe to the perfect key signature...",
  "Consulting the Spotify Sad Hours playlist...",
  "Asking the universe what song this moment deserves...",
  "Mapping your feelings to a Pitchfork 10.0...",
];

const MusicLoadingBar = ({ mode }: { mode: "explore" | "mood" }) => {
  const messages = mode === "explore" ? EXPLORE_MESSAGES : MOOD_MESSAGES;
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Progress bar: fills over ~20s then stays near 95%
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p + 0.1;
        return p + (92 - p) * 0.04;
      });
    }, 200);

    // Message rotation every 2.5s with fade
    const msgInterval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
  }, [messages.length]);

  const accentColor = mode === "explore" ? "#06b6d4" : "#fb7185";
  const glowColor = mode === "explore" ? "rgba(6,182,212,0.4)" : "rgba(251,113,133,0.4)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center gap-8 py-16 px-4"
    >
      {/* Animated disc */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="relative"
      >
        <div
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: accentColor, boxShadow: `0 0 20px ${glowColor}` }}
        >
          <Disc size={28} style={{ color: accentColor }} />
        </div>
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: accentColor }}
        />
      </motion.div>

      {/* Message */}
      <div className="h-6 flex items-center">
        <motion.p
          animate={{ opacity: fade ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-light tracking-wide text-center"
          style={{ color: accentColor }}
        >
          {messages[msgIdx]}
        </motion.p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
              boxShadow: `0 0 8px ${glowColor}`,
            }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px] uppercase tracking-widest text-white/15">Thinking</span>
          <span className="text-[9px] uppercase tracking-widest text-white/15">{Math.round(progress)}%</span>
        </div>
      </div>
    </motion.div>
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
  const abortRef = useRef<AbortController | null>(null);
  const mouseDownOnDropdown = useRef(false);
  const utils = trpc.useUtils();

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      try {
        const res = await utils.sonicpulse.musicbrainzSearch.fetch({ query: val });
        setSuggestions(res as MBSuggestion[]);
        setOpen(true);
      } catch { /* ignore */ }
    }, 300);
  };

  const handleSelect = (name: string) => {
    onSelect(name);
    setSuggestions([]);
    setOpen(false);
    mouseDownOnDropdown.current = false;
  };

  const handleBlur = () => {
    // Only close if the user didn't mousedown on the dropdown
    if (!mouseDownOnDropdown.current) {
      setOpen(false);
    }
  };

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
          onBlur={handleBlur}
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
            onMouseDown={() => { mouseDownOnDropdown.current = true; }}
            onMouseUp={() => { mouseDownOnDropdown.current = false; }}
            onMouseLeave={() => { mouseDownOnDropdown.current = false; }}
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(s.name);
                }}
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
  const [mode, setMode] = useState<"explore" | "mood">("explore");

  // Explore
  const [exploreBands, setExploreBands] = useState<string[]>(["", "", ""]);
  const [discoveryLevel, setDiscoveryLevel] = useState<"mainstream" | "underground" | "exotics">("underground");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [explorePlaylistName, setExplorePlaylistName] = useState("SonicPulse Explore Mix");
  const [showExplorePlaylistInput, setShowExplorePlaylistInput] = useState(false);

  // Mood
  const [moodPrompt, setMoodPrompt] = useState("");
  const [moodReference, setMoodReference] = useState("");
  const [moodDiscovery, setMoodDiscovery] = useState<"mainstream" | "underground" | "exotic">("mainstream");
  const [showMoodReference, setShowMoodReference] = useState(false);
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
      setMode("mood");
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
  const moodMutation = trpc.sonicpulse.mood.useMutation({
    onSuccess: (data) => {
      setMoodSongs(data.songs as MoodSong[]);
      setEmotionalProfile(data.emotionalProfile as EmotionalProfile | null);
    },
  });

  const isGenerating = exploreMutation.isPending || moodMutation.isPending;

  const handleModeSelect = (newMode: "explore" | "mood") => {
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

  const generateMoodPlaylist = useCallback(() => {
    if (!moodPrompt.trim()) return;
    setMoodSongs([]);
    setEmotionalProfile(null);
    setLoadingMessage("Reading your emotional landscape...");
    moodMutation.mutate({
      prompt: moodPrompt.trim(),
      songCount: 3,
      musicReference: moodReference.trim() || undefined,
      discoveryFilter: moodDiscovery,
    });
  }, [moodPrompt, moodReference, moodDiscovery, moodMutation]);

  // ─── Background Gradient ──────────────────────────────────────────────────
  const bgGradient = !hasStarted
    ? "radial-gradient(circle at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 70%)"
    : mode === "explore"
    ? "radial-gradient(circle at 50% 0%, rgba(6,182,212,0.15) 0%, transparent 70%)"
    : "radial-gradient(circle at 50% 0%, rgba(244,114,182,0.18) 0%, transparent 70%)";

  const blob1 = !hasStarted ? "bg-yellow-900/40" : mode === "explore" ? "bg-cyan-900/40" : "bg-rose-900/40";
  const blob2 = !hasStarted ? "bg-amber-900/40" : mode === "explore" ? "bg-blue-900/40" : "bg-pink-900/30";

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
              {(["explore", "mood"] as const).map((m) => (
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
                  initial={{ opacity: 0, x: mode === "explore" ? -20 : 0, y: mode === "mood" ? 20 : 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-12">
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 block">
                      {mode === "explore" ? "Manual Input" : "Emotional Intelligence"}
                    </span>
                    <h2 className="text-5xl font-light tracking-tight">
                      {mode === "explore" ? "Explore New Sounds" : "Mood Mode"}
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

                  {/* ── Mood Mode ── */}
                  {mode === "mood" && (
                    <div className="space-y-10 max-w-2xl mx-auto">

                      {/* Input area */}
                      <div className="space-y-4">

                        {/* Textarea */}
                        <div className="relative">
                          <textarea
                            value={moodPrompt}
                            onChange={(e) => setMoodPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && moodPrompt.trim() && !isGenerating) generateMoodPlaylist(); }}
                            placeholder={moodPlaceholder}
                            rows={4}
                            maxLength={1000}
                            className="w-full bg-zinc-950 border border-rose-500/20 focus:border-rose-400/50 rounded-2xl px-5 py-4 text-sm font-light text-white/90 placeholder:text-white/25 focus:outline-none transition-all resize-none focus:shadow-[0_0_30px_rgba(244,114,182,0.12)] leading-relaxed"
                          />
                          <div className="absolute bottom-3 right-4 text-[9px] text-white/20 uppercase tracking-widest">
                            {moodPrompt.length}/1000
                          </div>
                        </div>

                        {/* Discovery Filter + Generate Row */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

                          {/* Discovery Filter */}
                          <div className="flex items-center gap-1 bg-zinc-950 border border-white/8 rounded-full p-1 shrink-0">
                            {(["mainstream", "underground", "exotic"] as const).map((f) => (
                              <button
                                key={f}
                                onClick={() => setMoodDiscovery(f)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all whitespace-nowrap",
                                  moodDiscovery === f
                                    ? f === "mainstream" ? "bg-white text-black"
                                      : f === "underground" ? "bg-rose-500 text-white"
                                      : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
                                    : "text-white/30 hover:text-white/60"
                                )}
                              >{f}</button>
                            ))}
                          </div>

                          {/* Generate Button */}
                          <button
                            onClick={generateMoodPlaylist}
                            disabled={isGenerating || !moodPrompt.trim()}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest",
                              "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-400 hover:to-pink-400",
                              isGenerating && "animate-pulse"
                            )}
                          >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
                            {isGenerating ? loadingMessage : "Find My Songs"}
                          </button>
                        </div>

                        {/* Musical Reference – optional collapse */}
                        <div>
                          <button
                            onClick={() => setShowMoodReference(!showMoodReference)}
                            className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors"
                          >
                            <Guitar size={11} />
                            <span>Musical reference</span>
                            <span className="text-white/15">(optional)</span>
                            <motion.span animate={{ rotate: showMoodReference ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown size={11} />
                            </motion.span>
                          </button>
                          <AnimatePresence>
                            {showMoodReference && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3 space-y-2">
                                  <ArtistInput
                                    value={moodReference}
                                    onChange={setMoodReference}
                                    onSelect={setMoodReference}
                                    placeholder="e.g. Radiohead, Nick Cave, Portishead..."
                                    accentColor="rose"
                                  />
                                  <p className="text-[10px] text-white/20 font-light">
                                    Sonic style only — not emotional context.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                              <AnimatePresence><MusicLoadingBar mode="mood" /></AnimatePresence>
                            ) : emotionalProfile && (
                              <div className="p-5 bg-gradient-to-br from-rose-950/30 to-zinc-900/50 border border-rose-500/15 rounded-2xl">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <h3 className="text-lg font-light tracking-tight text-rose-100">{emotionalProfile.coreEmotion}</h3>
                                  <IntensityBadge intensity={emotionalProfile.intensity} />
                                </div>
                                <div className="flex gap-2">
                                  <Quote size={12} className="text-rose-400/40 shrink-0 mt-0.5" />
                                  <p className="text-xs text-white/55 font-light leading-relaxed italic">{emotionalProfile.emotionalNote}</p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Song Cards */}
                      {(moodSongs.length > 0 || moodMutation.isPending) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                          <div className="flex items-center justify-between gap-4 mb-6">
                            <span className="text-xs uppercase tracking-[0.3em] text-white/35">Your Emotional Soundtrack</span>
                            <span className="text-[9px] uppercase tracking-widest text-white/20 px-2 py-1 rounded-full border border-white/8">{moodDiscovery}</span>
                          </div>

                          <div className="space-y-4">
                            {moodMutation.isPending && moodSongs.length === 0
                              ? null
                              : moodSongs.map((song, idx) => (
                                <div key={idx}>
                                  <motion.div
                                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group p-5 bg-zinc-900/40 border border-white/5 rounded-2xl hover:bg-zinc-900/60 hover:border-rose-500/10 transition-all duration-300"
                                  >
                                    <div className="flex items-start gap-4">
                                      {/* Artist image */}
                                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                        {song.enriched?.image
                                          ? <img src={song.enriched.image} alt={song.artist} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity" />
                                          : <Heart size={16} className="text-rose-400/30" />
                                        }
                                      </div>

                                      {/* Title + meta */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <p className="text-[10px] text-rose-400/60 uppercase tracking-widest font-medium">{song.artist}</p>
                                            <h4 className="text-base font-light tracking-tight leading-snug">{song.title}</h4>
                                          </div>
                                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] uppercase tracking-widest text-white/25 shrink-0 mt-0.5">{song.genre}</span>
                                        </div>
                                        <p className="text-xs text-white/45 font-light leading-relaxed mt-2">{song.emotionalBridge}</p>
                                        {song.lyricMoment && (
                                          <div className="flex gap-1.5 mt-2">
                                            <Quote size={9} className="text-rose-400/30 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-white/30 italic font-light leading-relaxed">{song.lyricMoment}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>

                                  {/* Track-Embed direkt integriert – immer sichtbar */}
                                  {song.trackId && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                      <iframe
                                        src={`https://open.spotify.com/embed/track/${song.trackId}?utm_source=generator&theme=0`}
                                        width="100%"
                                        height="80"
                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                        loading="lazy"
                                        title={`${song.title} – ${song.artist}`}
                                        className="rounded-xl border-0 w-full"
                                        style={{ minHeight: "80px" }}
                                      />
                                    </div>
                                  )}
                                  {/* Fallback: Artist-Embed wenn kein Track gefunden */}
                                  {!song.trackId && (song.enriched?.spotifyId || extractSpotifyArtistId(song.enriched?.url)) && (
                                    <div className="mt-2">
                                      <SpotifyEmbedCard
                                        artistId={song.enriched?.spotifyId ?? extractSpotifyArtistId(song.enriched?.url)}
                                        artistName={song.artist}
                                        accentColor="rose"
                                        defaultOpen={true}
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
                      ? <div className="col-span-full"><AnimatePresence><MusicLoadingBar mode="explore" /></AnimatePresence></div>
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
