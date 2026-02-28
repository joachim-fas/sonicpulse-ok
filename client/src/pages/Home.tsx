import { useState, useEffect, useRef, useCallback } from "react";
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
  CircleSlash,
  Moon,
  Sun,
  AlertCircle,
  Radio,
  Waves,
  Network,
  Zap,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { trpc } from "@/lib/trpc";
import { SpotifyEmbedCard } from "@/components/SpotifyEmbedCard";
import { YouTubeEmbedCard } from "@/components/YouTubeEmbedCard";
import { AnimatedArtistFallback } from "@/components/AnimatedArtistFallback";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Recommendation {
  artist: string;
  reason: string;
  genre: string;
  similarTo: string;
  youtubeId?: string | null;
  similarityScore?: number | null;
  listeners?: number | null;
  lastfmUrl?: string | null;
  enriched?: { image?: string | null; url?: string | null; spotifyId?: string | null; previewUrl?: string | null };
}

interface Track {
  title: string;
  artist: string;
  reason: string;
  trackId?: string | null;
  trackUrl?: string | null;
  enriched?: { image?: string | null; url?: string | null; spotifyId?: string | null; previewUrl?: string | null; uri?: string | null };
}

interface MoodSong {
  title: string;
  artist: string;
  emotionalBridge: string;
  genre: string;
  lyricMoment: string;
  trackId?: string | null;
  trackUrl?: string | null;
  youtubeId?: string | null;
  listeners?: number | null;
  lastfmUrl?: string | null;
  enriched?: { image?: string | null; url?: string | null; spotifyId?: string | null };
}

interface EmotionalProfile {
  coreEmotion: string;
  occasion: string;
  musicNeed: string;
  intensity: "subtle" | "moderate" | "intense";
  emotionalNote: string;
}

interface MBSuggestion { id: string; name: string; country?: string | null; disambiguation?: string | null; }

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

// ─── SpotifyLink ─────────────────────────────────────────────────────────────
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
        className="relative w-full max-w-lg sp-card p-8 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-light tracking-tight mb-6">{title}</h2>
        {text}
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="sp-btn-ghost text-xs uppercase tracking-widest">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Intensity Badge ──────────────────────────────────────────────────────────
const IntensityBadge = ({ intensity }: { intensity: "subtle" | "moderate" | "intense" }) => {
  const map = {
    subtle:   { label: "Subtle",   cls: "bg-violet-500/15 text-violet-300 border-violet-500/20" },
    moderate: { label: "Moderate", cls: "bg-pink-500/15 text-pink-300 border-pink-500/20" },
    intense:  { label: "Intense",  cls: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  };
  const { label, cls } = map[intensity];
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[8px] uppercase tracking-widest border font-medium", cls)}>
      {label}
    </span>
  );
};

// ─── Music Loading Bar ────────────────────────────────────────────────────────

const EXPLORE_MAINSTREAM_MESSAGES = [
  "Checking if this is already on a Spotify editorial playlist...",
  "Asking Spotify HQ if they've heard of your bands...",
  "Cross-referencing with the Top 40 from three years ago...",
  "Verifying these artists have at least one stadium tour...",
  "Making sure the algorithm already knows what you like...",
  "Consulting the Billboard chart from when this was cool...",
  "Checking if this has been in a Netflix trailer yet...",
  "Asking a Shazam employee for their honest opinion...",
  "Confirming these bands have a greatest hits compilation...",
  "Finding artists your parents might actually recognize...",
  "Verifying there's a deluxe edition with bonus tracks...",
  "Checking if this artist has done a Tiny Desk concert...",
  "Consulting the Spotify Wrapped Hall of Fame...",
  "Making sure this is safe for a dinner party playlist...",
  "Asking if this has been covered by a talent show contestant...",
  "Cross-referencing with Apple Music's 'Today's Hits'...",
  "Confirming there's at least one collab with a pop star...",
  "Checking if the lead single has 100M+ streams...",
  "Verifying this artist has a verified blue checkmark everywhere...",
  "Asking the algorithm to do what it does best...",
  "Consulting the 'Songs You Already Know' database...",
  "Making sure this is available on every streaming platform...",
  "Checking if this was on a FIFA soundtrack at some point...",
  "Asking Pitchfork's Best New Music archive, 2010–2018...",
];

const EXPLORE_UNDERGROUND_MESSAGES = [
  "Bribing the AI with backstage passes to a show in a basement...",
  "Consulting the ghost of John Peel...",
  "Digging through a crate of forgotten 7-inches in Kreuzberg...",
  "Arguing with the algorithm about whether shoegaze is back...",
  "Checking if this band is still underground enough to recommend...",
  "Verifying the band hasn't sold out since last Tuesday...",
  "Scanning liner notes from albums pressed in editions of 300...",
  "Asking the AI to be honest about its music taste for once...",
  "Filtering out everything that's been in a car commercial...",
  "Consulting a vinyl collector who lives in a basement in Leeds...",
  "Sorting through 14 years of Last.fm scrobbles nobody asked for...",
  "Checking if this band broke up before you heard of them...",
  "Asking Thom Yorke if this is still too mainstream...",
  "Translating your taste into 12 musical dimensions...",
  "Running a vibe check on 3,000 artists with under 10k monthly listeners...",
  "Consulting the Allmusic database circa 2003...",
  "Checking if this genre even has a name yet...",
  "Matching your energy to a Bandcamp rabbit hole at 2am...",
  "Asking the algorithm to think outside the algorithm...",
  "Dusting off the B-sides nobody asked for but everyone needed...",
  "Verifying this hasn't been featured in a Starbucks playlist...",
  "Checking if the drummer has a side project that's better...",
  "Consulting a zine from 2008 that predicted all of this...",
  "Asking if this band has a Bandcamp page and nothing else...",
];

const EXPLORE_EXOTICS_MESSAGES = [
  "Sending a probe into genres that don't have Wikipedia pages yet...",
  "Asking a music ethnologist in a timezone 9 hours ahead...",
  "Cross-referencing with sounds that don't have English names...",
  "Consulting a field recording from a market in Marrakech...",
  "Checking if this rhythm exists in Western notation at all...",
  "Translating your taste into frequencies the algorithm fears...",
  "Digging through a DAT tape from a 1994 radio broadcast in Lagos...",
  "Asking the AI to go somewhere it's never been before...",
  "Verifying this artist has never been on a 'Best Of' list...",
  "Consulting a music journalist who only writes in Portuguese...",
  "Checking if this genre has a dedicated Discord server yet...",
  "Scanning a 3-hour Boiler Room set for hidden gems...",
  "Asking a crate digger in Tokyo what they found last week...",
  "Translating the feeling into a scale that doesn't exist in C major...",
  "Verifying this can't be described in fewer than 4 hyphenated genre words...",
  "Consulting the Discogs database for something truly unrepeatable...",
  "Asking the algorithm to hallucinate something beautiful...",
  "Checking if this has ever been played on a commercial radio station...",
  "Mapping your taste to a coordinate system with no axis labels...",
  "Asking a music librarian in São Paulo for a second opinion...",
  "Verifying this exists in a format you can't easily stream...",
  "Consulting the ghost of a genre that peaked in 1987...",
  "Checking if this artist has ever given an interview in English...",
  "Asking the AI to surprise itself...",
];

const MOOD_MAINSTREAM_MESSAGES = [
  "Checking if Adele already wrote a song about this...",
  "Consulting the Top 10 Most-Streamed Breakup Songs of 2023...",
  "Asking if Taylor Swift has an album for this specific feeling...",
  "Verifying this emotion has a radio-friendly chord progression...",
  "Cross-referencing with the Spotify 'Sad Bops' editorial playlist...",
  "Checking if this has been on a Grey's Anatomy episode...",
  "Asking Coldplay if they've covered this emotional territory...",
  "Consulting the 'Songs to Cry To in Your Car' playlist...",
  "Verifying this feeling has at least 500M streams attached to it...",
  "Checking if this emotion has a corresponding Spotify mood tag...",
  "Asking if there's a Sam Smith song for exactly this...",
  "Consulting the official 'Chill Vibes' playlist committee...",
  "Verifying this can be played at a wedding without incident...",
  "Checking if Lewis Capaldi has already been through this...",
  "Asking Spotify's algorithm to validate your feelings...",
  "Cross-referencing with the 'Feel Good Friday' playlist...",
  "Consulting the International Registry of Songs That Hit Different...",
  "Checking if this feeling has a 4-chord solution...",
  "Asking if this emotion has been in a movie trailer recently...",
  "Verifying this song will still make sense in 10 years...",
  "Consulting the Shazam chart for songs people cry to in public...",
  "Asking the algorithm to be emotionally available for a moment...",
  "Checking if this is the kind of feeling that gets a playlist name...",
  "Verifying there's a lyric video with 50M views for this...",
];

const MOOD_UNDERGROUND_MESSAGES = [
  "Reading your emotional subtext between the lines...",
  "Consulting the International Registry of Sad Songs, Vol. 7...",
  "Asking what Nick Cave would do in your situation...",
  "Translating your feelings into chord progressions nobody plays live...",
  "Scanning 40 years of heartbreak anthems pressed on 12-inch...",
  "Calibrating the melancholy-to-euphoria ratio...",
  "Checking if Sufjan Stevens has a song for this specific feeling...",
  "Decoding your emotional frequency in Hz...",
  "Asking Phoebe Bridgers if she's been through this too...",
  "Cross-referencing your mood with 200 breakup albums from the 90s...",
  "Checking if Elliott Smith wrote something for this exact moment...",
  "Translating silence into a tracklist...",
  "Asking what Joni Mitchell would say about all of this...",
  "Calibrating the bittersweet-to-hopeful dial...",
  "Finding the song that sounds like this exact feeling at 3am...",
  "Consulting the emotional index of 10,000 lyrics nobody knows by heart...",
  "Asking the AI to feel something for a moment...",
  "Matching your inner weather to a sonic landscape...",
  "Checking if this feeling has a genre yet...",
  "Asking the Kübler-Ross model which stage has the best soundtrack...",
  "Verifying this emotion has been captured on a 4-track recorder...",
  "Consulting a playlist made by someone who also couldn't sleep...",
  "Checking if this feeling has a corresponding Grouper album...",
  "Asking the algorithm to find the song before you knew you needed it...",
];

const MOOD_EXOTIC_MESSAGES = [
  "Asking a music therapist in Reykjavik what they'd prescribe...",
  "Consulting a field recording that sounds exactly like this feeling...",
  "Translating your emotion into a scale with no Western equivalent...",
  "Checking if there's a Japanese word for this feeling and a song for it...",
  "Scanning 60 years of music from places that don't export it...",
  "Asking a musician in Dakar what this feeling sounds like there...",
  "Consulting the emotional vocabulary of a genre you've never heard...",
  "Verifying this feeling exists in a time signature you can't count...",
  "Asking the AI to find the song that doesn't know it's perfect for this...",
  "Cross-referencing your mood with sounds from 7 different continents...",
  "Checking if this emotion has been captured in a language you don't speak...",
  "Consulting a playlist that exists in one city and nowhere else...",
  "Asking a composer in Tbilisi if they've felt this too...",
  "Translating the feeling into frequencies the body understands before the brain does...",
  "Verifying this can only be fully heard on headphones at 2am...",
  "Scanning an archive of music that never got a streaming release...",
  "Asking the algorithm to go somewhere it's never been emotionally...",
  "Consulting a music tradition older than the genre names we use...",
  "Checking if this feeling has a corresponding instrument that doesn't exist in English...",
  "Asking a sound artist in Seoul what silence sounds like when it's full...",
  "Verifying this song exists in a format that requires patience...",
  "Consulting the emotional index of music that never charted anywhere...",
  "Asking the universe what frequency this moment deserves...",
  "Translating your inner weather into a sonic landscape with no borders...",
];

// ── Shared loading sub-components ──────────────────────────────────────────
const LoadingMessageCard = ({ messages, accentHex }: { messages: string[]; accentHex: string }) => {
  const [msgIdx, setMsgIdx] = useState(() => Math.floor(Math.random() * messages.length));
  const seenRef = useRef<Set<number>>(new Set([msgIdx]));
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((prev) => {
        const unseen = messages.map((_: string, i: number) => i).filter((i: number) => !seenRef.current.has(i));
        if (unseen.length === 0) { seenRef.current.clear(); }
        const pool = unseen.length > 0 ? unseen : messages.map((_: string, i: number) => i);
        const next = pool[Math.floor(Math.random() * pool.length)];
        seenRef.current.add(next);
        return next;
      });
    }, 2800);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <div className="w-full max-w-lg rounded-2xl px-6 py-4 text-center" style={{ background: 'rgba(10,10,20,0.88)', backdropFilter: 'blur(20px)', border: `1px solid ${accentHex}30`, boxShadow: `0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 ${accentHex}20` }}>
      <motion.p key={msgIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="text-sm font-medium tracking-wide leading-relaxed" style={{ color: '#f0f0ff' }}>{messages[msgIdx]}</motion.p>
    </div>
  );
};

const LoadingProgressBar = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setProgress((p) => p >= 92 ? p + 0.05 : p + (92 - p) * 0.04), 200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full max-w-sm">
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div className="h-full rounded-full" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accentHex2}, ${accentHex})`, boxShadow: `0 0 12px ${glowColor}` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accentHex + 'cc' }}>Analysing</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: accentHex + 'cc' }}>{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// ── Variant 1: Vinyl + Orbit + Equalizer ────────────────────────────────────
const AnimVariantVinyl = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const BAR_COUNT = 14;
  const barDelays = Array.from({ length: BAR_COUNT }, (_, i) => i * 0.08);
  const ORBIT_COUNT = 6;
  const orbitAngles = Array.from({ length: ORBIT_COUNT }, (_, i) => (i / ORBIT_COUNT) * 360);
  return (
    <>
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }} />
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }} className="absolute inset-0">
          {orbitAngles.map((angle, i) => (
            <motion.div key={i} animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.25, ease: 'easeInOut' }} className="absolute w-2 h-2 rounded-full" style={{ background: i % 2 === 0 ? accentHex : accentHex2, top: `${50 - 45 * Math.cos((angle * Math.PI) / 180)}%`, left: `${50 + 45 * Math.sin((angle * Math.PI) / 180)}%`, transform: 'translate(-50%,-50%)', boxShadow: `0 0 6px ${i % 2 === 0 ? accentHex : accentHex2}` }} />
          ))}
        </motion.div>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: 'linear' }} className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(from 0deg,#111,#222,#111,#1a1a1a,#111)', boxShadow: `0 0 30px ${glowColor},0 0 60px ${glowColor}40`, border: `2px solid ${accentHex}60` }}>
          <div className="absolute inset-2 rounded-full" style={{ border: `1px solid ${accentHex}20` }} />
          <div className="absolute inset-4 rounded-full" style={{ border: `1px solid ${accentHex}15` }} />
          <div className="absolute inset-6 rounded-full" style={{ border: `1px solid ${accentHex}10` }} />
          <div className="w-6 h-6 rounded-full z-10 flex items-center justify-center" style={{ background: `linear-gradient(135deg,${accentHex},${accentHex2})` }}><Disc size={10} className="text-white" /></div>
        </motion.div>
      </div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {barDelays.map((delay, i) => (
          <motion.div key={i} animate={{ scaleY: [0.2, 1, 0.4, 0.8, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay, ease: 'easeInOut' }} className="w-2 rounded-t-full origin-bottom" style={{ height: 40, background: `linear-gradient(to top,${accentHex},${accentHex2}80)`, boxShadow: `0 0 4px ${accentHex}60` }} />
        ))}
      </div>
    </>
  );
};

// ── Variant 2: Waveform Scan ─────────────────────────────────────────────────
const AnimVariantWaveform = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const WAVE_BARS = 32;
  const waveDelays = Array.from({ length: WAVE_BARS }, (_, i) => i * 0.04);
  return (
    <>
      <div className="relative flex flex-col items-center gap-4">
        {/* Scan label */}
        <div className="flex items-center gap-2">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }} className="w-2 h-2 rounded-full" style={{ background: accentHex, boxShadow: `0 0 8px ${accentHex}` }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Scanning Frequencies</span>
        </div>
        {/* Waveform */}
        <div className="flex items-center gap-0.5" style={{ height: 80 }}>
          {waveDelays.map((delay, i) => {
            const isMid = i > 8 && i < 24;
            return (
              <motion.div key={i}
                animate={{ scaleY: isMid ? [0.1, 1, 0.3, 0.8, 0.1] : [0.05, 0.3, 0.1, 0.2, 0.05] }}
                transition={{ repeat: Infinity, duration: isMid ? 0.9 : 1.4, delay, ease: 'easeInOut' }}
                className="rounded-full origin-center"
                style={{ width: 5, height: 60, background: `linear-gradient(to top, ${accentHex2}40, ${accentHex})`, boxShadow: isMid ? `0 0 6px ${accentHex}80` : 'none' }}
              />
            );
          })}
        </div>
        {/* Horizontal scan line */}
        <div className="relative w-full" style={{ height: 2 }}>
          <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }} className="absolute inset-y-0 w-16 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${accentHex}, transparent)`, boxShadow: `0 0 12px ${glowColor}` }} />
        </div>
        {/* Radio icon */}
        <Radio size={28} style={{ color: accentHex + '80' }} />
      </div>
    </>
  );
};

// ── Variant 3: Constellation ─────────────────────────────────────────────────
const AnimVariantConstellation = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  // 8 stars in a circle pattern
  const STARS = 8;
  const starAngles = Array.from({ length: STARS }, (_, i) => (i / STARS) * 360);
  const r = 70;
  const cx = 90, cy = 90;
  const starPoints = starAngles.map((a) => ({
    x: cx + r * Math.cos((a - 90) * Math.PI / 180),
    y: cy + r * Math.sin((a - 90) * Math.PI / 180),
  }));
  return (
    <>
      <div className="relative" style={{ width: 180, height: 180 }}>
        <svg width="180" height="180" className="absolute inset-0">
          {/* Connection lines */}
          {starPoints.map((p, i) => {
            const next = starPoints[(i + 2) % STARS];
            return (
              <motion.line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y}
                stroke={accentHex} strokeWidth="1"
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.25, ease: 'easeInOut' }}
              />
            );
          })}
          {/* Stars */}
          {starPoints.map((p, i) => (
            <motion.circle key={i} cx={p.x} cy={p.y} r={4}
              fill={i % 2 === 0 ? accentHex : accentHex2}
              animate={{ r: [3, 6, 3], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: 'easeInOut' }}
              style={{ filter: `drop-shadow(0 0 4px ${accentHex})` }}
            />
          ))}
          {/* Center */}
          <motion.circle cx={cx} cy={cy} r={8} fill={accentHex}
            animate={{ r: [6, 10, 6], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />
          <Sparkles size={10} style={{ color: 'white' }} />
        </svg>
        {/* Center icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}>
            <Music size={16} style={{ color: accentHex }} />
          </motion.div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} className="w-1.5 h-1.5 rounded-full" style={{ background: accentHex2 }} />
        <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: accentHex2 + 'cc' }}>Mapping Sound Universe</span>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.6, ease: 'easeInOut' }} className="w-1.5 h-1.5 rounded-full" style={{ background: accentHex }} />
      </div>
    </>
  );
};

// ── Variant 4: Cassette Tape ─────────────────────────────────────────────────
const AnimVariantCassette = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  return (
    <>
      {/* Cassette body */}
      <div className="relative" style={{ width: 200, height: 120 }}>
        {/* Body */}
        <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', border: `2px solid ${accentHex}40`, boxShadow: `0 0 20px ${glowColor}` }} />
        {/* Label */}
        <div className="absolute inset-x-4 top-3 bottom-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg,${accentHex}15,${accentHex2}15)`, border: `1px solid ${accentHex}30` }}>
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: accentHex }}>SonicPulse</span>
        </div>
        {/* Left reel */}
        <div className="absolute bottom-2 left-8 w-10 h-10 rounded-full flex items-center justify-center" style={{ border: `2px solid ${accentHex}60`, background: '#0a0a14' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} className="w-6 h-6 rounded-full" style={{ background: `conic-gradient(${accentHex},${accentHex2},${accentHex})` }}>
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#0a0a14', margin: '3px', width: 'calc(100% - 6px)', height: 'calc(100% - 6px)' }} />
          </motion.div>
        </div>
        {/* Right reel */}
        <div className="absolute bottom-2 right-8 w-10 h-10 rounded-full flex items-center justify-center" style={{ border: `2px solid ${accentHex2}60`, background: '#0a0a14' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} className="w-6 h-6 rounded-full" style={{ background: `conic-gradient(${accentHex2},${accentHex},${accentHex2})` }}>
            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#0a0a14', margin: '3px', width: 'calc(100% - 6px)', height: 'calc(100% - 6px)' }} />
          </motion.div>
        </div>
        {/* Tape window */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-5 rounded" style={{ background: '#0a0a14', border: `1px solid ${accentHex}30` }}>
          <motion.div animate={{ scaleX: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} className="h-0.5 mx-1 mt-2 rounded-full" style={{ background: accentHex }} />
        </div>
      </div>
      {/* Tape running indicator */}
      <div className="flex items-center gap-3">
        <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-2 rounded-full" style={{ background: accentHex, boxShadow: `0 0 6px ${accentHex}` }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Playing</span>
        <Zap size={12} style={{ color: accentHex2 }} />
      </div>
    </>
  );
};

// ── Variant 5: Neural Network ────────────────────────────────────────────────
const AnimVariantNeural = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  // 3 layers: 3 + 4 + 3 nodes
  const layers = [[0, 1, 2], [0, 1, 2, 3], [0, 1, 2]];
  const layerX = [30, 90, 150];
  const nodeY = (layer: number[], idx: number) => {
    const total = layer.length;
    const spacing = 120 / (total + 1);
    return 20 + spacing * (idx + 1);
  };
  return (
    <>
      <div className="relative" style={{ width: 180, height: 140 }}>
        <svg width="180" height="140" className="absolute inset-0">
          {/* Connections */}
          {layers.slice(0, -1).map((layer, li) =>
            layer.map((_, ni) =>
              layers[li + 1].map((_, nj) => (
                <motion.line key={`${li}-${ni}-${nj}`}
                  x1={layerX[li]} y1={nodeY(layer, ni)}
                  x2={layerX[li + 1]} y2={nodeY(layers[li + 1], nj)}
                  stroke={accentHex}
                  strokeWidth="1"
                  animate={{ opacity: [0.1, 0.6, 0.1], strokeWidth: [0.5, 1.5, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: (ni + nj + li) * 0.15, ease: 'easeInOut' }}
                />
              ))
            )
          )}
          {/* Nodes */}
          {layers.map((layer, li) =>
            layer.map((_, ni) => (
              <motion.circle key={`n-${li}-${ni}`}
                cx={layerX[li]} cy={nodeY(layer, ni)} r={7}
                fill={li === 1 ? accentHex : accentHex2}
                animate={{ r: [5, 9, 5], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: (ni + li) * 0.2, ease: 'easeInOut' }}
                style={{ filter: `drop-shadow(0 0 4px ${li === 1 ? accentHex : accentHex2})` }}
              />
            ))
          )}
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <Network size={14} style={{ color: accentHex }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex + 'cc' }}>Neural Analysis</span>
        <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
          <Zap size={12} style={{ color: accentHex2 }} />
        </motion.div>
      </div>
    </>
  );
};

// ── Variant 6: Turntable ────────────────────────────────────────────────────
const AnimVariantTurntable = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  return (
    <>
      <div className="relative" style={{ width: 240, height: 240 }}>
        <svg width="240" height="240" viewBox="0 0 240 240">
          <defs>
            <radialGradient id="tt-lbl" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accentHex} />
              <stop offset="100%" stopColor={accentHex2} />
            </radialGradient>
            <radialGradient id="tt-platter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0a0a14" />
            </radialGradient>
          </defs>
          {/* Plinth / base – full width wooden cabinet */}
          <rect x="20" y="185" width="200" height="40" rx="8" fill="#2a1f14" stroke={accentHex + '50'} strokeWidth="1.5" />
          <rect x="20" y="185" width="200" height="8" rx="4" fill="#3a2a1a" />
          {/* Platter mat */}
          <circle cx="110" cy="140" r="88" fill="#111118" stroke={accentHex + '20'} strokeWidth="1" />
          {/* Spinning vinyl record */}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }} style={{ originX: '110px', originY: '140px' }}>
            <circle cx="110" cy="140" r="82" fill="url(#tt-platter)" />
            {/* Grooves */}
            {[70, 62, 54, 46, 38, 30].map((r, i) => (
              <circle key={i} cx="110" cy="140" r={r} fill="none" stroke={accentHex + '18'} strokeWidth="0.8" />
            ))}
            {/* Label */}
            <circle cx="110" cy="140" r="22" fill={`url(#tt-lbl)`} opacity="0.9" />
            <circle cx="110" cy="140" r="4" fill="#0a0a14" />
          </motion.g>
          {/* Glow */}
          <ellipse cx="110" cy="185" rx="75" ry="6" fill={glowColor} opacity="0.3" />
          {/* Tonearm pivot */}
          <circle cx="185" cy="75" r="9" fill="#2a2040" stroke={accentHex + '70'} strokeWidth="2" />
          <circle cx="185" cy="75" r="4" fill={accentHex} opacity="0.8" />
          {/* Tonearm – pivots from top-right, stylus lands on record */}
          <motion.g
            animate={{ rotate: [-22, -12, -22] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{ originX: '185px', originY: '75px' }}
          >
            {/* Arm tube */}
            <line x1="185" y1="75" x2="148" y2="118" stroke={accentHex} strokeWidth="3" strokeLinecap="round" />
            {/* Head shell */}
            <rect x="141" y="114" width="14" height="8" rx="3" fill={accentHex2} opacity="0.9" />
            {/* Stylus */}
            <line x1="148" y1="122" x2="148" y2="130" stroke="#e0e0e0" strokeWidth="1.5" strokeLinecap="round" />
          </motion.g>
          {/* Speed badge */}
          <rect x="22" y="190" width="50" height="14" rx="3" fill="#1a1020" />
          <motion.circle cx="30" cy="197" r="3" fill={accentHex} animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
          <text x="36" y="201" fill={accentHex + 'cc'} fontSize="7" fontFamily="monospace" fontWeight="bold">33 RPM</text>
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}>
          <Disc size={14} style={{ color: accentHex }} />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Spinning Up</span>
      </div>
    </>
  );
};

// ── Variant 7: Walkman / Cassette Player ─────────────────────────────────────
const AnimVariantWalkman = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  return (
    <>
      <div className="relative" style={{ width: 180, height: 240 }}>
        <svg width="180" height="240" viewBox="0 0 180 240">
          <defs>
            <linearGradient id="wm-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2a2040" />
              <stop offset="100%" stopColor="#1a1028" />
            </linearGradient>
          </defs>
          {/* Body */}
          <rect x="10" y="8" width="160" height="220" rx="16" fill="url(#wm-body)" stroke={accentHex + '60'} strokeWidth="2" />
          {/* Highlight edge */}
          <rect x="10" y="8" width="160" height="220" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          {/* Cassette window */}
          <rect x="22" y="20" width="136" height="90" rx="10" fill="#0a0814" stroke={accentHex + '50'} strokeWidth="1.5" />
          {/* Window glare */}
          <rect x="24" y="22" width="40" height="6" rx="3" fill="rgba(255,255,255,0.06)" />
          {/* Left reel */}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }} style={{ originX: '55px', originY: '65px' }}>
            <circle cx="55" cy="65" r="26" fill="#12101e" stroke={accentHex + '50'} strokeWidth="1.5" />
            <circle cx="55" cy="65" r="18" fill="none" stroke={accentHex + '30'} strokeWidth="1" />
            {/* 4 spokes */}
            {[0, 90, 180, 270].map((a, i) => (
              <line key={i}
                x1={55 + 10 * Math.cos(a * Math.PI / 180)}
                y1={65 + 10 * Math.sin(a * Math.PI / 180)}
                x2={55 + 22 * Math.cos(a * Math.PI / 180)}
                y2={65 + 22 * Math.sin(a * Math.PI / 180)}
                stroke={accentHex + '70'} strokeWidth="2" strokeLinecap="round"
              />
            ))}
            <circle cx="55" cy="65" r="7" fill={accentHex} opacity="0.8" />
            <circle cx="55" cy="65" r="3" fill="#0a0814" />
          </motion.g>
          {/* Right reel */}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }} style={{ originX: '125px', originY: '65px' }}>
            <circle cx="125" cy="65" r="26" fill="#12101e" stroke={accentHex2 + '50'} strokeWidth="1.5" />
            <circle cx="125" cy="65" r="18" fill="none" stroke={accentHex2 + '30'} strokeWidth="1" />
            {[0, 90, 180, 270].map((a, i) => (
              <line key={i}
                x1={125 + 10 * Math.cos(a * Math.PI / 180)}
                y1={65 + 10 * Math.sin(a * Math.PI / 180)}
                x2={125 + 22 * Math.cos(a * Math.PI / 180)}
                y2={65 + 22 * Math.sin(a * Math.PI / 180)}
                stroke={accentHex2 + '70'} strokeWidth="2" strokeLinecap="round"
              />
            ))}
            <circle cx="125" cy="65" r="7" fill={accentHex2} opacity="0.8" />
            <circle cx="125" cy="65" r="3" fill="#0a0814" />
          </motion.g>
          {/* Tape path */}
          <path d="M 55 91 Q 90 100 125 91" fill="none" stroke={accentHex + '60'} strokeWidth="1.5" />
          {/* Playhead */}
          <rect x="84" y="96" width="12" height="8" rx="2" fill="#2a2040" stroke={accentHex + '80'} strokeWidth="1" />
          {/* LCD Display */}
          <rect x="22" y="118" width="136" height="32" rx="5" fill="#050510" stroke={accentHex + '40'} strokeWidth="1" />
          <motion.text x="90" y="138" textAnchor="middle" fill={accentHex} fontSize="10" fontFamily="monospace" fontWeight="bold"
            animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            ♪ SONICPULSE ♪
          </motion.text>
          {/* Transport buttons */}
          {[22, 50, 78, 106, 134].map((x, i) => (
            <g key={i}>
              <rect x={x} y="160" width="22" height="16" rx="4" fill="#2a2040" stroke={i === 2 ? accentHex : accentHex + '25'} strokeWidth="1" />
              {i === 0 && <text x={x + 11} y="172" textAnchor="middle" fill={accentHex + '80'} fontSize="8">⏮</text>}
              {i === 1 && <text x={x + 11} y="172" textAnchor="middle" fill={accentHex + '80'} fontSize="8">⏪</text>}
              {i === 2 && <motion.text x={x + 11} y="172" textAnchor="middle" fill={accentHex} fontSize="10" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>▶</motion.text>}
              {i === 3 && <text x={x + 11} y="172" textAnchor="middle" fill={accentHex + '80'} fontSize="8">⏩</text>}
              {i === 4 && <text x={x + 11} y="172" textAnchor="middle" fill={accentHex + '80'} fontSize="8">⏭</text>}
            </g>
          ))}
          {/* Volume wheel */}
          <motion.g animate={{ rotate: [0, 25, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} style={{ originX: '145px', originY: '200px' }}>
            <circle cx="145" cy="200" r="14" fill="#2a2040" stroke={accentHex2 + '60'} strokeWidth="1.5" />
            <line x1="145" y1="186" x2="145" y2="193" stroke={accentHex2} strokeWidth="2.5" strokeLinecap="round" />
          </motion.g>
          <text x="145" y="222" textAnchor="middle" fill={accentHex2 + '60'} fontSize="6" fontFamily="monospace">VOL</text>
          {/* Headphone jack */}
          <circle cx="90" cy="220" r="6" fill="#0a0814" stroke={accentHex + '60'} strokeWidth="1.5" />
          {/* LED indicator */}
          <motion.circle cx="35" cy="200" r="5" fill={accentHex}
            animate={{ opacity: [1, 0.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            style={{ filter: `drop-shadow(0 0 5px ${accentHex})` }}
          />
          <text x="44" y="204" fill={accentHex + '80'} fontSize="6" fontFamily="monospace">PLAY</text>
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 rounded-full" style={{ background: accentHex, boxShadow: `0 0 6px ${accentHex}` }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Tape Running</span>
      </div>
    </>
  );
};

// ── Variant 8: Gramophone ────────────────────────────────────────────────────
const AnimVariantGramophone = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  return (
    <>
      <div className="relative" style={{ width: 240, height: 240 }}>
        <svg width="240" height="240" viewBox="0 0 240 240">
          <defs>
            <linearGradient id="gph-horn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentHex2} stopOpacity="0.7" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {/* Shadow */}
          <ellipse cx="95" cy="232" rx="60" ry="7" fill={glowColor} opacity="0.25" />
          {/* Cabinet base */}
          <rect x="45" y="200" width="100" height="28" rx="6" fill="#2a1a10" stroke={accentHex + '50'} strokeWidth="1.5" />
          <rect x="45" y="200" width="100" height="8" rx="4" fill="#3a2a18" />
          {/* Pedestal column */}
          <rect x="86" y="155" width="18" height="48" rx="4" fill="#3a2a18" stroke={accentHex + '30'} strokeWidth="1" />
          {/* Platter */}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }} style={{ originX: '95px', originY: '138px' }}>
            <circle cx="95" cy="138" r="42" fill="#0d0d18" stroke={accentHex + '50'} strokeWidth="2" />
            <circle cx="95" cy="138" r="35" fill="none" stroke={accentHex + '25'} strokeWidth="1" />
            <circle cx="95" cy="138" r="28" fill="none" stroke={accentHex + '18'} strokeWidth="1" />
            <circle cx="95" cy="138" r="21" fill="none" stroke={accentHex + '12'} strokeWidth="1" />
            <circle cx="95" cy="138" r="12" fill={accentHex2} opacity="0.7" />
            <circle cx="95" cy="138" r="4" fill="#0d0d18" />
          </motion.g>
          {/* Tonearm – connects platter to horn */}
          <line x1="95" y1="138" x2="120" y2="105" stroke={accentHex + '90'} strokeWidth="2.5" strokeLinecap="round" />
          {/* Horn – large bell pointing upper-right */}
          <motion.g
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            style={{ originX: '120px', originY: '105px' }}
          >
            {/* Neck tube */}
            <path d="M 120 105 C 130 95 138 85 142 78" fill="none" stroke={accentHex} strokeWidth="4" strokeLinecap="round" />
            {/* Bell – wide flare to the right */}
            <path d="M 142 78 C 158 58 185 38 210 22 C 220 16 218 28 210 38 C 195 55 172 70 155 82 C 148 87 140 88 136 86 Z"
              fill="url(#gph-horn)" stroke={accentHex + '70'} strokeWidth="1.5" />
            {/* Sound waves emanating from bell opening */}
            {[0, 1, 2, 3].map((i) => (
              <motion.path key={i}
                d={`M ${210 + i * 6} ${30 - i * 4} Q ${215 + i * 8} ${40 - i * 2} ${208 + i * 6} ${50 + i * 2}`}
                fill="none" stroke={accentHex}
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={{ opacity: [0, 0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3, ease: 'easeOut' }}
              />
            ))}
          </motion.g>
          {/* Crank on side of cabinet */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            style={{ originX: '45px', originY: '175px' }}
          >
            <line x1="45" y1="175" x2="32" y2="162" stroke={accentHex2} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="162" r="5" fill={accentHex2} />
          </motion.g>
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}>
          <Music size={14} style={{ color: accentHex }} />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Winding Up</span>
      </div>
    </>
  );
};

// ── Variant 9: Tape Machine (Reel-to-Reel) ───────────────────────────────────
const AnimVariantTapeMachine = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const VU_BARS = 8;
  return (
    <>
      <div className="relative" style={{ width: 240, height: 180 }}>
        <svg width="240" height="180" viewBox="0 0 240 180">
          {/* Machine body */}
          <rect x="5" y="10" width="230" height="160" rx="10" fill="#12100e" stroke={accentHex + '40'} strokeWidth="2" />
          <rect x="5" y="10" width="230" height="160" rx="10" fill="none" stroke={accentHex + '15'} strokeWidth="6" />
          {/* Left reel (supply) */}
          <motion.g animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }} style={{ originX: '60px', originY: '75px' }}>
            <circle cx="60" cy="75" r="42" fill="#1a1510" stroke={accentHex + '50'} strokeWidth="2" />
            <circle cx="60" cy="75" r="34" fill="none" stroke={accentHex + '30'} strokeWidth="1" />
            <circle cx="60" cy="75" r="26" fill="none" stroke={accentHex + '20'} strokeWidth="1" />
            <circle cx="60" cy="75" r="18" fill="none" stroke={accentHex + '15'} strokeWidth="1" />
            {/* Spokes */}
            {[0, 60, 120, 180, 240, 300].map((a, i) => (
              <line key={i}
                x1={60 + 18 * Math.cos(a * Math.PI / 180)}
                y1={75 + 18 * Math.sin(a * Math.PI / 180)}
                x2={60 + 34 * Math.cos(a * Math.PI / 180)}
                y2={75 + 34 * Math.sin(a * Math.PI / 180)}
                stroke={accentHex + '60'} strokeWidth="2" strokeLinecap="round"
              />
            ))}
            <circle cx="60" cy="75" r="8" fill={accentHex2} />
            <circle cx="60" cy="75" r="4" fill="#12100e" />
          </motion.g>
          {/* Right reel (take-up) */}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }} style={{ originX: '180px', originY: '75px' }}>
            <circle cx="180" cy="75" r="42" fill="#1a1510" stroke={accentHex2 + '50'} strokeWidth="2" />
            <circle cx="180" cy="75" r="34" fill="none" stroke={accentHex2 + '30'} strokeWidth="1" />
            <circle cx="180" cy="75" r="26" fill="none" stroke={accentHex2 + '20'} strokeWidth="1" />
            <circle cx="180" cy="75" r="18" fill="none" stroke={accentHex2 + '15'} strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map((a, i) => (
              <line key={i}
                x1={180 + 18 * Math.cos(a * Math.PI / 180)}
                y1={75 + 18 * Math.sin(a * Math.PI / 180)}
                x2={180 + 34 * Math.cos(a * Math.PI / 180)}
                y2={75 + 34 * Math.sin(a * Math.PI / 180)}
                stroke={accentHex2 + '60'} strokeWidth="2" strokeLinecap="round"
              />
            ))}
            <circle cx="180" cy="75" r="8" fill={accentHex} />
            <circle cx="180" cy="75" r="4" fill="#12100e" />
          </motion.g>
          {/* Tape path */}
          <path d="M 60 117 L 80 125 L 120 128 L 160 125 L 180 117" fill="none" stroke={accentHex + '70'} strokeWidth="2" />
          {/* Tape head */}
          <rect x="112" y="120" width="16" height="12" rx="2" fill="#2a2010" stroke={accentHex + '80'} strokeWidth="1.5" />
          {/* VU Meters */}
          <rect x="90" y="138" width="60" height="28" rx="4" fill="#0a0808" stroke={accentHex + '30'} strokeWidth="1" />
          {Array.from({ length: VU_BARS }, (_, i) => (
            <motion.rect key={i}
              x={93 + i * 7} y={148}
              width={5} height={12}
              rx={1}
              fill={i < 5 ? accentHex : i < 7 ? '#f59e0b' : '#ef4444'}
              animate={{ scaleY: [0.1, Math.random() * 0.8 + 0.2, 0.1] }}
              transition={{ repeat: Infinity, duration: 0.6 + i * 0.07, delay: i * 0.05, ease: 'easeInOut' }}
              style={{ transformOrigin: `${93 + i * 7 + 2.5}px 160px` }}
            />
          ))}
          {/* Transport buttons */}
          {[18, 38, 58, 78, 98].map((x, i) => (
            <g key={i}>
              <rect x={x} y="142" width="16" height="12" rx="2" fill="#2a2010" stroke={i === 2 ? accentHex : accentHex + '30'} strokeWidth="1" />
              {i === 2 && <motion.rect x={x} y="142" width="16" height="12" rx="2" fill={accentHex} opacity="0.2" animate={{ opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 0.8 }} />}
            </g>
          ))}
        </svg>
      </div>
      <div className="flex items-center gap-3">
        <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-2 h-2 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Recording</span>
        <Waves size={12} style={{ color: accentHex2 }} />
      </div>
    </>
  );
};

// ── Variant 10: iPod Classic ─────────────────────────────────────────────────
const AnimVariantIPod = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const menuItems = ['Music', 'Photos', 'Videos', 'Settings'];
  const [activeItem, setActiveItem] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveItem((p) => (p + 1) % menuItems.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="relative" style={{ width: 140, height: 240 }}>
        <svg width="140" height="240" viewBox="0 0 140 240">
          {/* Body */}
          <rect x="10" y="5" width="120" height="230" rx="18" fill="#f0ede8" stroke="#ccc" strokeWidth="1.5" />
          <rect x="10" y="5" width="120" height="230" rx="18" fill="none" stroke="white" strokeWidth="3" opacity="0.6" />
          {/* Screen */}
          <rect x="18" y="14" width="104" height="80" rx="8" fill="#0a0a14" />
          {/* Screen content */}
          <rect x="18" y="14" width="104" height="14" rx="0" fill={accentHex} opacity="0.9" />
          <text x="70" y="24" textAnchor="middle" fill="white" fontSize="8" fontFamily="-apple-system,sans-serif" fontWeight="bold">iPod</text>
          {menuItems.map((item, i) => (
            <g key={i}>
              {i === activeItem && <rect x="18" y={30 + i * 15} width="104" height="14" fill={accentHex} opacity="0.85" />}
              <text x="28" y={41 + i * 15} fill={i === activeItem ? 'white' : '#aaa'} fontSize="8" fontFamily="-apple-system,sans-serif">{item}</text>
              {i === activeItem && <text x="110" y={41 + i * 15} textAnchor="middle" fill="white" fontSize="8">›</text>}
            </g>
          ))}
          {/* Battery */}
          <rect x="108" y="16" width="10" height="6" rx="1" fill="none" stroke="#888" strokeWidth="0.8" />
          <motion.rect x="109" y="17" width={6} height="4" rx="0.5" fill={accentHex}
            animate={{ width: [2, 6, 2] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
          <rect x="118" y="18" width="2" height="2" rx="0.5" fill="#888" />
          {/* Click wheel */}
          <circle cx="70" cy="175" r="48" fill="#e8e5e0" stroke="#ccc" strokeWidth="1" />
          <circle cx="70" cy="175" r="40" fill="#ddd8d0" stroke="#bbb" strokeWidth="0.5" />
          {/* Wheel labels */}
          <text x="70" y="140" textAnchor="middle" fill="#888" fontSize="7" fontFamily="-apple-system,sans-serif">MENU</text>
          <text x="70" y="215" textAnchor="middle" fill="#888" fontSize="7" fontFamily="-apple-system,sans-serif">▶▶</text>
          <text x="28" y="178" textAnchor="middle" fill="#888" fontSize="7" fontFamily="-apple-system,sans-serif">◀◀</text>
          <text x="112" y="178" textAnchor="middle" fill="#888" fontSize="7" fontFamily="-apple-system,sans-serif">▶▶</text>
          {/* Center button */}
          <circle cx="70" cy="175" r="16" fill="#d0ccc6" stroke="#bbb" strokeWidth="1" />
          <motion.circle cx="70" cy="175" r="14" fill={accentHex} opacity="0.15"
            animate={{ opacity: [0.05, 0.3, 0.05] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
          {/* Spinning wheel indicator */}
          <motion.g animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }} style={{ originX: '70px', originY: '175px' }}>
            <circle cx="70" cy="161" r="2.5" fill={accentHex} opacity="0.7" />
          </motion.g>
          {/* Headphone jack */}
          <circle cx="70" cy="228" r="4" fill="#0a0a14" stroke="#aaa" strokeWidth="1" />
          {/* Hold switch */}
          <rect x="55" y="8" width="30" height="5" rx="2.5" fill="#ccc" />
          <motion.rect x="56" y="8.5" width="12" height="4" rx="2" fill={accentHex}
            animate={{ x: [56, 72, 56] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
          <Music size={14} style={{ color: accentHex }} />
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>1000 Songs in Your Pocket</span>
      </div>
    </>
  );
};

// ── MusicLoadingBar: Random Variant Selector ─────────────────────────────────
const ANIM_VARIANTS = [AnimVariantVinyl, AnimVariantWaveform, AnimVariantConstellation, AnimVariantCassette, AnimVariantNeural, AnimVariantTurntable, AnimVariantWalkman, AnimVariantGramophone, AnimVariantTapeMachine, AnimVariantIPod] as const;

const MusicLoadingBar = ({
  mode,
  discoveryLevel = "underground",
}: {
  mode: "explore" | "mood";
  discoveryLevel?: "mainstream" | "underground" | "exotics" | "exotic";
}) => {
  const messages = mode === "explore"
    ? discoveryLevel === "mainstream" ? EXPLORE_MAINSTREAM_MESSAGES
      : discoveryLevel === "exotics" ? EXPLORE_EXOTICS_MESSAGES
      : EXPLORE_UNDERGROUND_MESSAGES
    : discoveryLevel === "mainstream" ? MOOD_MAINSTREAM_MESSAGES
      : discoveryLevel === "exotic" || discoveryLevel === "exotics" ? MOOD_EXOTIC_MESSAGES
      : MOOD_UNDERGROUND_MESSAGES;

  // Random variant selected once per mount
  const [variantIdx] = useState(() => Math.floor(Math.random() * ANIM_VARIANTS.length));
  const ChosenVariant = ANIM_VARIANTS[variantIdx];

  const accentHex = mode === "explore" ? "#a855f7" : "#ec4899";
  const accentHex2 = mode === "explore" ? "#6366f1" : "#f43f5e";
  const glowColor = mode === "explore" ? "rgba(168,85,247,0.5)" : "rgba(236,72,153,0.5)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-10 py-16 px-4 w-full"
    >
      <ChosenVariant accentHex={accentHex} accentHex2={accentHex2} glowColor={glowColor} />
      <LoadingMessageCard messages={messages} accentHex={accentHex} />
      <LoadingProgressBar accentHex={accentHex} accentHex2={accentHex2} glowColor={glowColor} />
    </motion.div>
  );
};

// ─── Artist Input with MusicBrainz Autocomplete ───────────────────────────────
const ArtistInput = ({
  value, onChange, onSelect, placeholder, accentColor = "cyan", onRemove, showRemove = false, confirmed = false, onUnconfirm,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (name: string) => void;
  placeholder: string;
  accentColor?: "cyan" | "fuchsia" | "rose";
  onRemove?: () => void;
  showRemove?: boolean;
  confirmed?: boolean;
  onUnconfirm?: () => void;
}) => {
  const [suggestions, setSuggestions] = useState<MBSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mouseDownOnDropdown = useRef(false);
  const utils = trpc.useUtils();

  const handleChange = (val: string) => {
    // Wenn der Nutzer tippt, wird die Bestätigung aufgehoben
    if (confirmed && onUnconfirm) onUnconfirm();
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
    if (!mouseDownOnDropdown.current) {
      setOpen(false);
    }
  };

  // Warnung erst nach blur anzeigen (nicht während Dropdown offen ist)
  const [touched, setTouched] = useState(false);
  const showWarning = touched && value.trim().length > 0 && !confirmed && !open;

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => { setTouched(true); handleBlur(); }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "form-input w-full",
            showRemove ? "pr-16" : "pr-10",
            confirmed && value ? "border-emerald-500/60" : "",
            showWarning ? "border-amber-400/60" : ""
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {showRemove && (
            <button onClick={onRemove} className="text-white/30 transition-colors hover:text-red-400">
              <Trash2 size={14} />
            </button>
          )}
          {confirmed && value ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : showWarning ? (
            <AlertCircle size={14} className="text-amber-400" />
          ) : (
            <Mic2 size={14} className="text-white/20" />
          )}
        </div>
      </div>
      {showWarning && (
        <p className="text-[9px] text-amber-400/80 mt-1 px-1">Bitte aus der Liste auswählen</p>
      )}
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl border border-white/10" style={{ background: '#1a1a2e', backdropFilter: 'blur(20px)' }}
            onMouseDown={() => { mouseDownOnDropdown.current = true; }}
            onMouseUp={() => { mouseDownOnDropdown.current = false; }}
            onMouseLeave={() => { mouseDownOnDropdown.current = false; }}
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s.name);
                }}
                className="w-full px-4 py-2 text-left transition-colors flex justify-between items-center border-b last:border-0 hover:bg-white/10 border-white/10 text-white"
              >
                <span className="text-xs font-light">{s.name}</span>
                <span className="text-[8px] uppercase tracking-widest text-white/40">{s.disambiguation ?? (s.country ? s.country : null)}</span>
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
      className="relative w-full max-w-md sp-card p-8 shadow-2xl border-[#1DB954]/30"
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

// ─── Spotify Save Section ─────────────────────────────────────────────────────
const SpotifySaveSection = ({
  tracks, playlistName, onPlaylistNameChange, showNameInput, onToggleNameInput,
  onSave, onLogin, isLoggedIn, isLoginPending, isSaving, saveError, accentColor = "green", compact = false,
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

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col gap-2">
      {showNameInput && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => onPlaylistNameChange(e.target.value)}
            placeholder="Playlist name..."
                              className="form-input text-sm w-full md:w-64"
          />
        </motion.div>
      )}
      <div className="flex items-center gap-2">
        {!compact && (
          <button onClick={onToggleNameInput} className="text-white/30 hover:text-white/60 transition-colors text-xs">
            {showNameInput ? "▲" : "▼"} Name
          </button>
        )}
        <button
          onClick={onSave}
          disabled={isSaving || !tracks.length}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            saveBtn, isSaving && "animate-pulse"
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

// ─── Floating Save Button ─────────────────────────────────────────────────────
const FloatingSaveButton = ({
  tracks, playlistName, onSave, onLogin, isLoggedIn, isLoginPending, isSaving, accentColor = "green",
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
  if (!tracks.length) return null;
  const btnClass = accentColor === "rose"
    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-400 hover:to-pink-400 shadow-rose-900/40"
    : "bg-[#1DB954] text-black hover:bg-[#1ed760]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-8 right-8 z-30"
    >
      {isLoggedIn ? (
        <button
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm shadow-2xl transition-all active:scale-95 disabled:opacity-50",
            btnClass, isSaving && "animate-pulse"
          )}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <ListMusic size={16} />}
          {isSaving ? "Saving..." : "Save playlist"}
        </button>
      ) : (
        <button
          onClick={onLogin}
          disabled={isLoginPending}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1DB954] text-black font-medium text-sm shadow-2xl hover:bg-[#1ed760] transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoginPending ? <Loader2 size={16} className="animate-spin" /> : <SpotifyLogo size={16} />}
          Connect Spotify
        </button>
      )}
    </motion.div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<"explore" | "mood">("explore");
  const [confirmedBands, setConfirmedBands] = useState<boolean[]>([false, false, false]);
  const [exploreBands, setExploreBands] = useState<string[]>(["", "", ""]);
  const [discoveryLevel, setDiscoveryLevel] = useState<"mainstream" | "underground" | "exotics">("underground");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [explorePlaylistName, setExplorePlaylistName] = useState("SonicPulse Explore Mix");
  const [showExplorePlaylistInput, setShowExplorePlaylistInput] = useState(false);
  const [seenArtists, setSeenArtists] = useState<string[]>([]);

  // Mood
  const [moodPrompt, setMoodPrompt] = useState("");
  const [moodReference, setMoodReference] = useState("");
  const [moodDiscovery, setMoodDiscovery] = useState<"mainstream" | "underground" | "exotic">("mainstream");
  const [showMoodReference, setShowMoodReference] = useState(false);
  const [moodSongs, setMoodSongs] = useState<MoodSong[]>([]);
  const [emotionalProfile, setEmotionalProfile] = useState<EmotionalProfile | null>(null);
  const [moodPlaylistName, setMoodPlaylistName] = useState("SonicPulse Mood Mix");
  const [showMoodPlaylistInput, setShowMoodPlaylistInput] = useState(false);
  const [seenSongs, setSeenSongs] = useState<string[]>([]);

  // UI
  const [infoModal, setInfoModal] = useState<"privacy" | "terms" | "spotify" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isLightMode, setIsLightMode] = useState(false);

  // Apply theme classes (v3.html: data-theme attribute)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
    if (isLightMode) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [isLightMode]);

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
    onSuccess: (data) => {
      const recs = data.recommendations as Recommendation[];
      setRecommendations(recs);
      setSeenArtists(prev => {
        const newSeen = [...prev, ...recs.map(r => r.artist)];
        return newSeen.slice(-20);
      });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    },
  });
  const moodMutation = trpc.sonicpulse.mood.useMutation({
    onSuccess: (data) => {
      const songs = data.songs as MoodSong[];
      setMoodSongs(songs);
      setEmotionalProfile(data.emotionalProfile as EmotionalProfile | null);
      setSeenSongs(prev => {
        const newSeen = [...prev, ...songs.map(s => `${s.artist} - ${s.title}`)];
        return newSeen.slice(-20);
      });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    },
  });

  const isGenerating = exploreMutation.isPending || moodMutation.isPending;

  // ─── Scroll Refs ──────────────────────────────────────────────────
  const loadingRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleModeSelect = (newMode: "explore" | "mood") => {
    setMode(newMode);
    setHasStarted(true);
  };

  const generateRecommendations = useCallback(() => {
    // Nur Bands die explizit aus dem Dropdown ausgewählt wurden
    const artists = exploreBands.filter((b, i) => b.trim() && confirmedBands[i]);
    if (!artists.length) return;
    setRecommendations([]);
    setLoadingMessage("Consulting the AI oracle...");
    setTimeout(() => {
      loadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    exploreMutation.mutate({ artists, discoveryLevel, exclude: seenArtists.length > 0 ? seenArtists : undefined });
  }, [exploreBands, discoveryLevel, exploreMutation, loadingRef]);

  const generateMoodPlaylist = useCallback(() => {
    if (!moodPrompt.trim()) return;
    setMoodSongs([]);
    setEmotionalProfile(null);
    setLoadingMessage("Reading your emotional landscape...");
    setTimeout(() => {
      loadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    moodMutation.mutate({
      prompt: moodPrompt.trim(),
      songCount: 3,
      musicReference: moodReference.trim() || undefined,
      discoveryFilter: moodDiscovery,
      exclude: seenSongs.length > 0 ? seenSongs : undefined,
    });
  }, [moodPrompt, moodReference, moodDiscovery, moodMutation]);

  // ─── Mouse tracking for blob parallax ────────────────────────────────────
  const mousePos = useRef({ x: 50, y: 50 });
  const mousePosSmooth = useRef({ x: 50, y: 50 });
  const [pulses, setPulses] = useState<{ id: number; x: number; y: number }[]>([]);
  const pulseIdRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const x = (touch.clientX / window.innerWidth) * 100;
      const y = (touch.clientY / window.innerHeight) * 100;
      const id = ++pulseIdRef.current;
      setPulses((prev) => [...prev.slice(-4), { id, x, y }]);
      setTimeout(() => setPulses((prev) => prev.filter((p) => p.id !== id)), 1200);
    };

    let rafId: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      mousePosSmooth.current = {
        x: lerp(mousePosSmooth.current.x, mousePos.current.x, 0.04),
        y: lerp(mousePosSmooth.current.y, mousePos.current.y, 0.04),
      };
      document.documentElement.style.setProperty('--mx', `${mousePosSmooth.current.x}%`);
      document.documentElement.style.setProperty('--my', `${mousePosSmooth.current.y}%`);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

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

  // ─── Background blob colors based on mode ────────────────────────────────
  const blobMode = !hasStarted ? "landing" : mode;

  return (
    <div
      className="min-h-screen overflow-x-hidden relative"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background 0.7s, color 0.7s' }}
    >

      {/* ── Animated Blob Background (v3.html exakt) ── */}
      <div className="sp-bg-system" aria-hidden="true">
        <div className={cn("blob blob-1", blobMode === "explore" ? "sp-blob-explore-1" : blobMode === "mood" ? "sp-blob-mood-1" : "")} />
        <div className={cn("blob blob-2", blobMode === "explore" ? "sp-blob-explore-2" : blobMode === "mood" ? "sp-blob-mood-2" : "")} />
        <div className={cn("blob blob-3", blobMode === "explore" ? "sp-blob-explore-3" : blobMode === "mood" ? "sp-blob-mood-3" : "")} />
        <div className={cn("blob blob-4", blobMode === "explore" ? "sp-blob-explore-4" : blobMode === "mood" ? "sp-blob-mood-4" : "")} />
        <div className={cn("blob blob-5", blobMode === "explore" ? "sp-blob-explore-5" : blobMode === "mood" ? "sp-blob-mood-5" : "")} />
        <div className={cn("blob blob-6", blobMode === "explore" ? "sp-blob-explore-6" : blobMode === "mood" ? "sp-blob-mood-6" : "")} />
        <div className={cn("blob blob-7", blobMode === "explore" ? "sp-blob-explore-7" : blobMode === "mood" ? "sp-blob-mood-7" : "")} />
        <div className="pulse-ring pulse-ring-1" />
        <div className="pulse-ring pulse-ring-2" />
        <div className="pulse-ring pulse-ring-3" />
        <div className="pulse-ring pulse-ring-4" />
        <div className="wave-line" />
        <div className="wave-line" />
        <div className="wave-line" />
        <div className="wave-line" />
        <div className="grain" />
        {/* Mouse-reactive blob (v3.html: cursor follower) */}
        <div
          style={{
            position: 'absolute',
            width: 500, height: 500,
            marginLeft: -250, marginTop: -250,
            borderRadius: '50%',
            filter: 'blur(100px)',
            opacity: 0.18,
            pointerEvents: 'none',
            left: 'var(--mx, 50%)',
            top: 'var(--my, 50%)',
            background: blobMode === "explore"
              ? 'radial-gradient(circle, rgba(149,74,175,0.6) 0%, transparent 70%)'
              : blobMode === "mood"
              ? 'radial-gradient(circle, rgba(235,81,139,0.6) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(13,171,247,0.5) 0%, transparent 70%)',
            transition: 'background 0.5s',
          }}
        />
        {/* Touch pulses */}
        {pulses.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0.5, scale: 0.2 }}
            animate={{ opacity: 0, scale: 3.5 }}
            transition={{ duration: 1.1, ease: [0.2, 0.8, 0.4, 1] }}
            style={{
              position: 'absolute',
              left: `${p.x}%`, top: `${p.y}%`,
              width: 120, height: 120,
              marginLeft: -60, marginTop: -60,
              borderRadius: '50%',
              pointerEvents: 'none',
              background: blobMode === "explore"
                ? 'radial-gradient(circle, rgba(149,74,175,0.4) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(235,81,139,0.4) 0%, transparent 70%)',
            }}
          />
        ))}
      </div>

      {/* ── Navbar (v3.html: nav class) ── */}
      <nav className="sp-nav relative z-10 flex items-center justify-between px-4 md:px-8 py-5 sticky top-0">
        <button
          onClick={() => setHasStarted(false)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: blobMode === "explore" ? 'rgba(149,74,175,0.15)' : blobMode === "mood" ? 'rgba(235,81,139,0.15)' : 'rgba(13,171,247,0.15)'
              }}>
                <Disc size={16} style={{ color: blobMode === "explore" ? 'var(--violet)' : blobMode === "mood" ? 'var(--pink-hot)' : 'var(--blue-sky)' }} />
              </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            SonicPulse
          </span>
        </button>

        <div className="flex items-center gap-3">
          {hasStarted && (
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 9999, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                {(["explore", "mood"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeSelect(m)}
                    style={{
                      padding: '6px 14px', borderRadius: 9999,
                      fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                      transition: 'all 0.3s', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
                      background: mode === m
                        ? m === "explore" ? 'linear-gradient(135deg, var(--violet), var(--blue-deep))' : 'linear-gradient(135deg, var(--pink-hot), var(--violet))'
                        : 'transparent',
                      color: mode === m ? 'white' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)', fontWeight: 600,
                    }}
                  >{m}</button>
                ))}
              </div>
          )}

          {/* Light/Dark Toggle (v3.html: btn-icon) */}
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className="btn-icon"
          >
            {isLightMode ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {isSpotifyLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] text-[10px] uppercase tracking-widest">
                <User size={10} />
                <span className="max-w-[100px] truncate">{spotifyDisplayName}</span>
              </div>
              <button
                onClick={() => logoutMutation.mutate({ sessionId })}
                title="Disconnect Spotify"
                className={cn(
                  "p-2 rounded-full transition-all",
                  isLightMode ? "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100" : "text-white/30 hover:text-white/60 hover:bg-white/5"
                )}
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
            /* ── Landing: zentriertes Layout mit zwei Mode-Karten ── */
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-[80vh] text-center"
            >
              {/* Headline */}
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 9vw, 7rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                Your sound,<br />
                <em className="gradient-text" style={{ fontStyle: 'italic', fontFamily: 'var(--font-accent)' }}>reimagined.</em>
              </h1>
              {/* Subtext */}
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '3.5rem', maxWidth: 480 }}>
                No DJ required. Tell us what you love, or how you feel — we'll handle the rest.
              </p>
              {/* Two Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                <button
                  onClick={() => handleModeSelect("explore")}
                  className={cn(
                    "feature-card text-left p-8 rounded-[28px] transition-all duration-300 hover:scale-[1.02] group",
                    isLightMode ? "bg-white/80 border border-zinc-200 hover:border-violet-300" : ""
                  )}
                >
                  <Sparkles size={24} className="mb-5" style={{ color: 'var(--violet)' }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Explore Mode
                  </h3>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Feed it 3 bands. Get artists you'll actually love.
                  </p>
                </button>
                <button
                  onClick={() => handleModeSelect("mood")}
                  className={cn(
                    "feature-card text-left p-8 rounded-[28px] transition-all duration-300 hover:scale-[1.02] group",
                    isLightMode ? "bg-white/80 border border-zinc-200 hover:border-pink-300" : ""
                  )}
                >
                  <Heart size={24} className="mb-5" style={{ color: 'var(--pink-hot)' }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Mood Mode
                  </h3>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Describe the feeling. We find the soundtrack.
                  </p>
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
                    <span className={cn(
                      "text-xs uppercase tracking-[0.3em] mb-4 block",
                      mode === "explore" ? "text-[var(--violet)]/70" : "text-[var(--pink-hot)]/70"
                    )} style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.25em' }}>
                      {mode === "explore" ? "Manual Input" : "Emotional Intelligence"}
                    </span>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
                      {mode === "explore" ? <>Explore <em className="gradient-text" style={{ fontStyle: 'italic', fontFamily: 'var(--font-accent)' }}>New Sounds</em></> : <>Mood <em className="gradient-text" style={{ fontStyle: 'italic', fontFamily: 'var(--font-accent)' }}>Mode</em></>}
                    </h2>
                  </div>

                  {/* ── Explore ── */}
                  {mode === "explore" && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto relative z-10">
                        {exploreBands.map((band, idx) => (
                          <ArtistInput
                            key={idx}
                            value={band}
                            accentColor="cyan"
                            placeholder={`Band #${idx + 1}`}
                            confirmed={confirmedBands[idx]}
                            onChange={(val) => { const n = [...exploreBands]; n[idx] = val; setExploreBands(n); }}
                            onSelect={(name) => {
                              const nb = [...exploreBands]; nb[idx] = name; setExploreBands(nb);
                              const nc = [...confirmedBands]; nc[idx] = true; setConfirmedBands(nc);
                            }}
                            onUnconfirm={() => { const nc = [...confirmedBands]; nc[idx] = false; setConfirmedBands(nc); }}
                          />
                        ))}
                      </div>
                      <div className={cn(
                        "flex flex-col sm:flex-row items-center justify-between gap-4 p-5 md:p-6 rounded-[28px] border max-w-4xl mx-auto",
                        isLightMode ? "bg-zinc-100 border-zinc-200" : "feature-card"
                      )}>
                        {/* Discovery Filter */}
                        <div className="flex flex-col gap-1.5 items-center sm:items-start">
                          <span className={cn("text-[8px] uppercase tracking-widest", isLightMode ? "text-zinc-500" : "text-white/40")}>Discovery</span>
                          <div className={cn(
                            "inline-flex items-center gap-0.5 p-1 rounded-full border w-fit",
                            isLightMode ? "bg-white border-zinc-300 shadow-sm" : "bg-black/30 border-white/8"
                          )}>
                            {(["mainstream", "underground", "exotics"] as const).map((level) => (
                              <button
                                key={level}
                                onClick={() => setDiscoveryLevel(level)}
                                className={cn(
                                  "px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all whitespace-nowrap",
                                  discoveryLevel === level
                                    ? level === "mainstream"
                                      ? "bg-gradient-to-r from-[var(--violet)] to-[var(--blue-sky)] text-white"
                                      : level === "underground"
                                      ? "bg-[var(--violet-deep)] text-white"
                                      : "bg-gradient-to-r from-[var(--blue-deep)] to-[var(--blue-sky)] text-white"
                                    : isLightMode ? "text-zinc-500 hover:text-zinc-900" : "text-white/50 hover:text-white"
                                )}
                              >{level}</button>
                            ))}
                          </div>
                        </div>
                        {/* Submit Button */}
                        <button
                          onClick={generateRecommendations}
                          disabled={isGenerating || !exploreBands.some((b, i) => b.trim() && confirmedBands[i])}
                          className={cn(
                            "btn btn-primary flex items-center justify-center gap-2 shrink-0",
                            isGenerating && "animate-pulse"
                          )}
                        >
                          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          {isGenerating ? "Thinking..." : "Get Suggestions"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Mood Mode ── */}
                  {mode === "mood" && (
                    <div className="space-y-8">

                      {/* Textarea */}
                      <div className="relative max-w-4xl mx-auto">
                        <textarea
                          value={moodPrompt}
                          onChange={(e) => setMoodPrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && moodPrompt.trim() && !isGenerating) generateMoodPlaylist(); }}
                          placeholder={moodPlaceholder}
                          rows={4}
                          maxLength={1000}
                          className={cn(
                            "form-input w-full rounded-2xl resize-none leading-relaxed",
                            isLightMode && "bg-white border-zinc-300 shadow-sm"
                          )}
                        />
                        <div className={cn("absolute bottom-3 right-4 text-[9px] uppercase tracking-widest", isLightMode ? "text-zinc-400" : "text-white/20")}>
                          {moodPrompt.length}/1000
                        </div>
                      </div>

                      {/* Filter + CTA Card */}
                      <div className={cn(
                        "flex flex-col sm:flex-row items-center justify-between gap-4 p-5 md:p-6 rounded-[28px] border max-w-4xl mx-auto",
                        isLightMode ? "bg-zinc-100 border-zinc-200" : "feature-card"
                      )}>
                        <div className="flex flex-col gap-1.5 items-center sm:items-start">
                          <span className={cn("text-[8px] uppercase tracking-widest", isLightMode ? "text-zinc-400" : "text-white/20")}>Discovery</span>
                          <div className={cn(
                            "inline-flex items-center gap-0.5 p-1 rounded-full border w-fit",
                            isLightMode ? "bg-white border-zinc-300 shadow-sm" : "bg-black/30 border-white/8"
                          )}>
                            {(["mainstream", "underground", "exotic"] as const).map((f) => (
                              <button
                                key={f}
                                onClick={() => setMoodDiscovery(f)}
                                className={cn(
                                  "px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest transition-all whitespace-nowrap",
                                  moodDiscovery === f
                                    ? f === "mainstream"
                                      ? "bg-gradient-to-r from-[var(--pink-hot)] to-[var(--pink-rose)] text-white"
                                      : f === "underground"
                                      ? "bg-[var(--pink-hot)] text-white"
                                      : "bg-gradient-to-r from-[var(--violet)] to-[var(--pink-hot)] text-white"
                                    : isLightMode ? "text-zinc-500 hover:text-zinc-900" : "text-white/40 hover:text-white"
                                )}
                              >{f}</button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={generateMoodPlaylist}
                          disabled={isGenerating || !moodPrompt.trim()}
                          className={cn(
                            "btn btn-mood flex items-center justify-center gap-2 shrink-0",
                            isGenerating && "animate-pulse"
                          )}
                        >
                          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} />}
                          {isGenerating ? loadingMessage : "Find My Songs"}
                        </button>
                      </div>

                      {/* Musical Reference */}
                      <div className="max-w-4xl mx-auto">
                        <button
                          onClick={() => setShowMoodReference(!showMoodReference)}
                          className={cn("flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors", isLightMode ? "text-zinc-400 hover:text-zinc-600" : "text-white/20 hover:text-white/50")}
                        >
                          <Guitar size={11} />
                          <span>Musical reference</span>
                          <span className={isLightMode ? "text-zinc-400" : "text-white/20"}>(optional)</span>
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
                                <p className={cn("text-[10px] font-light", isLightMode ? "text-zinc-500" : "text-white/40")}>
                                  Sonic style only — not emotional context.
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
                              <div ref={loadingRef}><AnimatePresence><MusicLoadingBar mode="mood" discoveryLevel={moodDiscovery} /></AnimatePresence></div>
                            ) : emotionalProfile && (
                              <div className={cn(
                                "p-5 rounded-2xl border",
                                isLightMode ? "bg-rose-50 border-rose-200" : "feature-card border-[var(--pink-hot)]/15"
                              )}>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <h3 className={cn("text-lg font-light tracking-tight", isLightMode ? "text-rose-800" : "text-[var(--text-primary)]")}>{emotionalProfile.coreEmotion}</h3>
                                  <IntensityBadge intensity={emotionalProfile.intensity} />
                                </div>
                                <div className="flex gap-2">
                                  <Quote size={12} className="shrink-0 mt-0.5" style={{ color: 'rgba(235,81,139,0.4)' }} />
                                  <p className={cn("text-xs font-light leading-relaxed italic", isLightMode ? "text-zinc-600" : "text-white/60")}>{emotionalProfile.emotionalNote}</p>
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
                          <span className={cn("text-xs uppercase tracking-[0.3em]", isLightMode ? "text-[var(--pink-hot)]" : "text-[var(--pink-hot)]/70")}>Your Emotional Soundtrack</span>                         <span className="tag tag-pink">{moodDiscovery}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {moodMutation.isPending && moodSongs.length === 0
                              ? null
                              : moodSongs.map((song, idx) => (
                          <motion.div
                            key={idx}
                            ref={idx === 0 ? resultsRef : undefined}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="overflow-hidden flex flex-col group rounded-[28px] border"
                            style={{
                              background: isLightMode ? 'rgba(30,18,40,0.96)' : 'rgba(18,10,28,0.92)',
                              borderColor: isLightMode ? 'rgba(235,81,139,0.25)' : 'rgba(235,81,139,0.15)',
                              boxShadow: isLightMode
                                ? '0 8px 40px rgba(235,81,139,0.18), 0 2px 12px rgba(0,0,0,0.25)'
                                : '0 8px 40px rgba(235,81,139,0.12), 0 2px 12px rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(20px)',
                            }}
                          >
                            {/* ── Artist Photo + Overlay ── */}
                            <div className="relative aspect-[16/10] overflow-hidden rounded-t-[28px]">
                              {song.enriched?.image
                                ? <img src={song.enriched.image} alt={song.artist} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" style={{ opacity: 0.75 }} />
                                : <AnimatedArtistFallback artistName={song.artist} accentColor="rose" className="w-full h-full" />
                              }
                              {/* Strong gradient so text is always readable */}
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%)' }} />
                              {/* NOW PLAYING badge – top left */}
                              <div className="absolute top-4 left-4">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(235,81,139,0.85)', backdropFilter: 'blur(8px)' }}>
                                  <motion.div
                                    animate={{ scale: [1, 1.4, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                                    className="w-1.5 h-1.5 rounded-full bg-white"
                                  />
                                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white">Now Playing</span>
                                </div>
                              </div>
                              {/* Song title + artist – bottom */}
                              <div className="absolute bottom-0 left-0 p-5 w-full">
                                <SpotifyLink url={song.trackUrl ?? song.enriched?.url} className="group/name flex items-start gap-2 text-white hover:text-[var(--pink-rose)] transition-colors text-left">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold tracking-tight leading-tight text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{song.title}</h3>
                                    <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{song.artist}</p>
                                  </div>
                                  {(song.trackUrl ?? song.enriched?.url) && (
                                    <div className="p-1.5 rounded-full mt-0.5 shrink-0 opacity-70 group-hover/name:opacity-100 transition-all" style={{ background: 'rgba(235,81,139,0.3)', color: 'white' }}>
                                      <ExternalLink size={11} />
                                    </div>
                                  )}
                                </SpotifyLink>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="tag tag-pink">{song.genre}</span>
                                  {song.listeners != null && song.listeners > 0 && (
                                    <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                      {song.listeners >= 1_000_000
                                        ? `${(song.listeners / 1_000_000).toFixed(1)}M`
                                        : song.listeners >= 1_000
                                        ? `${Math.round(song.listeners / 1_000)}K`
                                        : song.listeners.toLocaleString()} listeners
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* ── Card Body ── */}
                            <div className="p-5 flex-1 flex flex-col gap-4">
                              {/* Emotional description */}
                              <div className="flex items-start gap-2">
                                <motion.div
                                  animate={{ y: [0, -3, 0], rotate: [0, 8, -8, 0] }}
                                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                                  className="mt-0.5 shrink-0" style={{ color: 'var(--pink-hot)' }}
                                >
                                  <Music size={13} />
                                </motion.div>
                                <p className="font-light leading-relaxed text-xs line-clamp-3" style={{ color: 'rgba(255,255,255,0.72)' }}>{song.emotionalBridge}</p>
                              </div>
                              {/* Lyric quote */}
                              {song.lyricMoment && (
                                <div className="flex gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(235,81,139,0.08)', borderLeft: '2px solid rgba(235,81,139,0.4)' }}>
                                  <p className="text-[10px] italic font-light leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{song.lyricMoment}</p>
                                </div>
                              )}
                              {/* YouTube embed */}
                              <div className="mt-auto">
                                {song.youtubeId ? (
                                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(235,81,139,0.2)' }}>
                                    <YouTubeEmbedCard
                                      videoId={song.youtubeId}
                                      label={`${song.title} – ${song.artist}`}
                                      accentColor="rose"
                                      defaultOpen={true}
                                      compact={true}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                                    <CircleSlash size={12} />
                                    No video found for this song
                                  </div>
                                )}
                                {song.trackUrl && (
                                  <a
                                    href={song.trackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all w-full justify-center mt-3"
                                    style={{ background: 'rgba(29,185,84,0.15)', color: '#1DB954', border: '1px solid rgba(29,185,84,0.3)' }}
                                  >
                                    <SpotifyLogo size={12} />
                                    Listen on Spotify
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
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
                    <span className={cn("text-xs uppercase tracking-[0.3em] mb-4 block font-medium", isLightMode ? "text-[var(--violet)]" : "text-[var(--violet)]/80")}>The Future</span>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Curated <em className="gradient-text" style={{ fontStyle: 'italic', fontFamily: 'var(--font-accent)' }}>for you</em>
                    </h2>
                  </div>

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
                      ? <div ref={loadingRef} className="col-span-full"><AnimatePresence><MusicLoadingBar mode="explore" discoveryLevel={discoveryLevel} /></AnimatePresence></div>
                      : recommendations.map((rec, idx) => (
                        <motion.div
                          key={idx}
                          ref={idx === 0 ? resultsRef : undefined}
                          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className={cn(
                            "overflow-hidden flex flex-col group rounded-[28px] transition-all duration-500",
                            isLightMode
                              ? "bg-white border border-zinc-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] hover:-translate-y-1"
                              : "bg-white/[0.04] border border-white/8 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:border-white/14 hover:-translate-y-1"
                          )}
                        >
                          {/* ── Photo Header ── */}
                          <div className="relative aspect-[16/9] overflow-hidden rounded-t-[28px]">
                            {rec.enriched?.image
                              ? <img src={rec.enriched.image} alt={rec.artist} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 brightness-90 group-hover:brightness-100" />
                              : <AnimatedArtistFallback artistName={rec.artist} accentColor="cyan" className="w-full h-full" />
                            }
                            {/* Strong gradient for text readability */}
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)' }} />
                            {/* Top-right: match badge */}
                            {rec.similarityScore != null && (
                              <div className="absolute top-3 right-3">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide" style={{ background: 'rgba(149,74,175,0.85)', backdropFilter: 'blur(8px)', color: 'white', border: '1px solid rgba(149,74,175,0.5)' }}>
                                  {rec.similarityScore}%
                                </span>
                              </div>
                            )}
                            {/* Bottom: artist name + genre */}
                            <div className="absolute bottom-0 left-0 p-5 w-full">
                              <SpotifyLink url={rec.enriched?.url} className="group/name inline-flex items-center gap-2 transition-colors text-left">
                                <h3 className="text-white drop-shadow-lg" style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{rec.artist}</h3>
                                {rec.enriched?.url && (
                                  <ExternalLink size={13} className="text-white/60 group-hover/name:text-white transition-colors shrink-0 mb-0.5" />
                                )}
                              </SpotifyLink>
                              <div className="mt-1.5">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}>{rec.genre}</span>
                              </div>
                            </div>
                          </div>

                          {/* ── Card Body ── */}
                          <div className="p-5 flex-1 flex flex-col gap-4">
                            {/* Description with fade */}
                            <div className="relative">
                              <p className={cn("text-[13px] leading-relaxed line-clamp-3", isLightMode ? "text-zinc-600" : "text-white/65")}>{rec.reason}</p>
                            </div>

                            {/* Metadata row */}
                            <div className={cn("flex items-center justify-between gap-3 pt-3 border-t", isLightMode ? "border-zinc-100" : "border-white/6")}>
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className={cn("text-[10px] font-medium leading-tight", isLightMode ? "text-zinc-400" : "text-white/40")}>Similar to</span>
                                <span className={cn("text-[12px] font-semibold truncate", isLightMode ? "text-zinc-700" : "text-white/80")}>{rec.similarTo}</span>
                                {rec.listeners != null && rec.listeners > 0 && (
                                  <span className={cn("text-[10px]", isLightMode ? "text-zinc-400" : "text-white/35")}>
                                    {rec.listeners >= 1_000_000
                                      ? `${(rec.listeners / 1_000_000).toFixed(1)}M listeners`
                                      : `${rec.listeners.toLocaleString()} listeners`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Spotify / YouTube embed */}
                            <div className="mt-auto">
                              {(rec.enriched?.spotifyId || extractSpotifyArtistId(rec.enriched?.url) || rec.enriched?.url) && (
                                <SpotifyEmbedCard
                                  artistId={rec.enriched?.spotifyId ?? extractSpotifyArtistId(rec.enriched?.url)}
                                  artistName={rec.artist}
                                  accentColor="cyan"
                                />
                              )}
                              {!rec.enriched?.spotifyId && !extractSpotifyArtistId(rec.enriched?.url) && !rec.enriched?.url && rec.youtubeId && (
                                <YouTubeEmbedCard
                                  videoId={rec.youtubeId}
                                  label="Watch on YouTube"
                                  accentColor="cyan"
                                />
                              )}
                              {!rec.enriched?.spotifyId && !extractSpotifyArtistId(rec.enriched?.url) && !rec.enriched?.url && !rec.youtubeId && (
                                <SpotifyEmbedCard
                                  artistId={null}
                                  artistName={rec.artist}
                                  accentColor="cyan"
                                />
                              )}
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
      <footer className={cn(
        "relative z-10 border-t px-8 py-12 mt-20",
        isLightMode ? "border-zinc-200" : "border-white/5"
      )}>
        <div className={cn("max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8", isLightMode ? "text-zinc-400" : "text-white/40")}>
          <div className="flex items-center gap-2">
            <Disc size={16} />
            <span className="sp-display text-xs font-medium uppercase tracking-widest">SONICPULSE © 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em]">
            <button onClick={() => setInfoModal("privacy")} className={cn("transition-colors", isLightMode ? "hover:text-zinc-800" : "hover:text-white")}>Privacy</button>
            <button onClick={() => setInfoModal("terms")} className={cn("transition-colors", isLightMode ? "hover:text-zinc-800" : "hover:text-white")}>Terms</button>
            <button onClick={() => setInfoModal("spotify")} className={cn("transition-colors", isLightMode ? "hover:text-zinc-800" : "hover:text-white")}>Spotify API</button>
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
