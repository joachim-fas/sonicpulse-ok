import { useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { trpc } from "@/lib/trpc";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface MBSuggestion { id: string; name: string; country?: string | null; }

// ─── SpotifyLink: nur echte Artist-Profile, niemals /search/ ─────────────────
const SpotifyLink = ({
  url, children, className,
}: { url?: string | null; children: React.ReactNode; className?: string }) => {
  // Sicherheits-Guard: Suche-URLs werden niemals gerendert
  if (!url || url.includes("/search/")) return <span className={className}>{children}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label="Auf Spotify öffnen"
    >
      {children}
    </a>
  );
};

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
          <button
            onClick={onClose}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-xs uppercase tracking-widest transition-colors"
          >
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
  accentColor?: "cyan" | "fuchsia";
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

  const borderColor = accentColor === "cyan"
    ? "border-cyan-500/30 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
    : "border-fuchsia-500/30 focus:border-fuchsia-500 focus:shadow-[0_0_15px_rgba(217,70,239,0.3)]";
  const textColor = accentColor === "cyan" ? "text-cyan-50" : "text-fuchsia-50";

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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<"explore" | "party">("explore");
  const [exploreBands, setExploreBands] = useState<string[]>(["", "", ""]);
  const [partyArtists, setPartyArtists] = useState<string[]>(["", "", ""]);
  const [partyLength, setPartyLength] = useState(10);
  const [partyEnergy, setPartyEnergy] = useState<"chill" | "medium" | "high">("high");
  const [discoveryLevel, setDiscoveryLevel] = useState<"mainstream" | "underground" | "exotics">("underground");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [partyPlaylist, setPartyPlaylist] = useState<Track[]>([]);
  const [infoModal, setInfoModal] = useState<"privacy" | "terms" | "spotify" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");

  const exploreMutation = trpc.sonicpulse.explore.useMutation({
    onSuccess: (data) => setRecommendations(data.recommendations as Recommendation[]),
  });
  const partyMutation = trpc.sonicpulse.party.useMutation({
    onSuccess: (data) => setPartyPlaylist(data.tracks as Track[]),
  });
  const isGenerating = exploreMutation.isPending || partyMutation.isPending;

  const handleModeSelect = (newMode: "explore" | "party") => {
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

  // Background gradient based on mode
  const bgGradient = !hasStarted
    ? "radial-gradient(circle at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 70%)"
    : mode === "explore"
    ? "radial-gradient(circle at 50% 0%, rgba(6,182,212,0.15) 0%, transparent 70%)"
    : "radial-gradient(circle at 50% 0%, rgba(217,70,239,0.15) 0%, transparent 70%)";
  const blob1 = !hasStarted ? "bg-yellow-900/40" : mode === "explore" ? "bg-cyan-900/40" : "bg-fuchsia-900/40";
  const blob2 = !hasStarted ? "bg-amber-900/40" : mode === "explore" ? "bg-blue-900/40" : "bg-orange-900/40";

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
        {hasStarted && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5">
            {(["explore", "party"] as const).map((m) => (
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
      </nav>

      {/* ── Main ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12">
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
                Choose your journey. Explore new sounds manually or generate the perfect party mix.
              </p>
              <div className="flex flex-col md:flex-row gap-6 justify-center w-full max-w-2xl">
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
                  initial={{ opacity: 0, x: mode === "explore" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "explore" ? 20 : -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-12">
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 block">
                      {mode === "explore" ? "Manual Input" : "Party Vibes"}
                    </span>
                    <h2 className="text-5xl font-light tracking-tight">
                      {mode === "explore" ? "Explore New Sounds" : "Party Mode"}
                    </h2>
                  </div>

                  {mode === "explore" ? (
                    /* ── Explore ── */
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
                          {/* Discovery Level */}
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
                  ) : (
                    /* ── Party ── */
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
                          <Plus size={16} />Add more Bands
                        </button>
                      </div>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-4 md:p-8 bg-zinc-900/30 rounded-[32px] border border-white/5">
                        <div className="flex flex-wrap items-center justify-center gap-8 w-full">
                          {/* Energy */}
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
                          {/* Track Count */}
                          <div className="flex flex-col gap-2 min-w-[120px]">
                            <div className="flex justify-center items-center gap-2">
                              <span className="text-[8px] uppercase tracking-widest text-white/20">Tracks</span>
                              <span className="text-[9px] text-white/60 uppercase tracking-widest">{partyLength}</span>
                            </div>
                            <input
                              type="range" min="5" max="20" step="1"
                              value={partyLength}
                              onChange={(e) => setPartyLength(parseInt(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          <button
                            onClick={generatePartyPlaylist}
                            disabled={isGenerating || partyArtists.every((a) => !a.trim())}
                            className={cn(
                              "flex items-center justify-center gap-2 px-10 py-3 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest bg-white text-black hover:bg-white/90",
                              isGenerating && "animate-pulse"
                            )}
                          >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <PartyPopper size={18} />}
                            {isGenerating ? loadingMessage : "Generate Party Playlist"}
                          </button>
                        </div>
                      </div>

                      {/* Party Playlist */}
                      {(partyPlaylist.length > 0 || partyMutation.isPending) && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="h-px flex-1 bg-white/5" />
                            <h3 className="text-xl font-light tracking-widest uppercase text-white/40">The Playlist</h3>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {partyMutation.isPending && partyPlaylist.length === 0
                              ? [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />)
                              : partyPlaylist.map((track, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="group flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-800/50 transition-all duration-300"
                                >
                                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-white/5 flex items-center justify-center text-white/20 overflow-hidden relative shrink-0 shadow-lg">
                                    {track.enriched?.image
                                      ? <img src={track.enriched.image} alt={track.artist} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                      : <span className="text-2xl font-mono opacity-50">{String(idx + 1).padStart(2, "0")}</span>
                                    }
                                  </div>
                                  <div className="flex-1 flex flex-col gap-2 w-full">
                                    <SpotifyLink url={track.enriched?.url} className="hover:text-emerald-400 transition-colors inline-flex items-center gap-2 text-left">
                                      <p className="text-sm text-fuchsia-400 uppercase tracking-widest font-medium">{track.artist}</p>
                                      {track.enriched?.url && <ExternalLink size={12} className="opacity-50" />}
                                    </SpotifyLink>
                                    <h4 className="text-2xl font-light tracking-tight">{track.title}</h4>
                                    <div className="flex items-start gap-2 mt-2">
                                      <motion.div
                                        animate={{ y: [0, -3, 0], rotate: [0, 15, -15, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                        className="text-fuchsia-500 mt-0.5 shrink-0"
                                      >
                                        <Music size={12} />
                                      </motion.div>
                                      <p className="text-sm text-white/50 italic font-light leading-relaxed">{track.reason}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              ))
                            }
                          </div>
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
                          {/* Image header */}
                          <div className="relative aspect-[16/10] overflow-hidden">
                            {rec.enriched?.image
                              ? <img src={rec.enriched.image} alt={rec.artist} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-700 group-hover:scale-110" />
                              : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Music className="text-white/10" size={32} /></div>
                            }
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-6 w-full">
                              <SpotifyLink
                                url={rec.enriched?.url}
                                className="group/name flex items-center gap-2 text-white hover:text-emerald-400 transition-colors text-left"
                              >
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
                          {/* Body */}
                          <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-start gap-2 mb-6">
                              <motion.div
                                animate={{ y: [0, -4, 0], rotate: [0, 10, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="text-cyan-500 mt-0.5 shrink-0"
                              >
                                <Music size={14} />
                              </motion.div>
                              <p className="text-white/60 font-light leading-relaxed text-xs line-clamp-3">{rec.reason}</p>
                            </div>
                            <div className="mt-auto pt-4 border-t border-white/5">
                              <span className="text-[8px] uppercase tracking-widest text-white/20">
                                Similar to <span className="text-white/40">{rec.similarTo}</span>
                              </span>
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
      </AnimatePresence>
    </div>
  );
}
