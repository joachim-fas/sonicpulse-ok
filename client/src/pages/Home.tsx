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


// ── Variant 1: Kassette (Hochwertig) ─────────────────────────────────────────
const AnimVariantCassette = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const SPOKE_ANGLES_L = [0, 72, 144, 216, 288];
  const SPOKE_ANGLES_R = [36, 108, 180, 252, 324];
  return (
    <>
      <div className="relative" style={{ width: 280, height: 180 }}>
        <svg width="280" height="180" viewBox="0 0 280 180">
          <defs>
            <linearGradient id="cs-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1428" />
              <stop offset="100%" stopColor="#120c1c" />
            </linearGradient>
            <linearGradient id="cs-label" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentHex + '22'} />
              <stop offset="100%" stopColor={accentHex2 + '18'} />
            </linearGradient>
            <linearGradient id="cs-tape" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accentHex2 + '80'} />
              <stop offset="50%" stopColor={accentHex + 'cc'} />
              <stop offset="100%" stopColor={accentHex2 + '80'} />
            </linearGradient>
          </defs>

          {/* Drop shadow */}
          <ellipse cx="140" cy="174" rx="110" ry="6" fill={glowColor} opacity="0.3" />

          {/* Cassette body */}
          <rect x="10" y="12" width="260" height="155" rx="12" fill="url(#cs-body)" stroke={accentHex + '55'} strokeWidth="2" />
          {/* Top edge highlight */}
          <rect x="10" y="12" width="260" height="8" rx="6" fill="rgba(255,255,255,0.05)" />
          {/* Bottom notch cutout */}
          <rect x="60" y="148" width="160" height="20" rx="4" fill="#0a0812" stroke={accentHex + '30'} strokeWidth="1" />

          {/* Label area */}
          <rect x="22" y="22" width="236" height="90" rx="8" fill="url(#cs-label)" stroke={accentHex + '35'} strokeWidth="1" />
          <text x="140" y="44" textAnchor="middle" fill={accentHex} fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="4">SONICPULSE</text>
          <text x="140" y="58" textAnchor="middle" fill={accentHex + '70'} fontSize="7" fontFamily="monospace" letterSpacing="2">TYPE II · CHROME · 90 MIN</text>
          <line x1="30" y1="65" x2="110" y2="65" stroke={accentHex + '30'} strokeWidth="0.5" />
          <line x1="170" y1="65" x2="250" y2="65" stroke={accentHex + '30'} strokeWidth="0.5" />
          {/* Side notches */}
          <rect x="10" y="30" width="8" height="20" rx="2" fill="#0a0812" stroke={accentHex + '20'} strokeWidth="1" />
          <rect x="262" y="30" width="8" height="20" rx="2" fill="#0a0812" stroke={accentHex + '20'} strokeWidth="1" />

          {/* Tape window */}
          <rect x="75" y="72" width="130" height="52" rx="8" fill="#060410" stroke={accentHex + '40'} strokeWidth="1.5" />
          <rect x="78" y="74" width="50" height="4" rx="2" fill="rgba(255,255,255,0.04)" />

          {/* Tape path */}
          <path d="M 100 98 L 108 108 L 172 108 L 180 98" fill="none" stroke="url(#cs-tape)" strokeWidth="3" strokeLinecap="round" />
          {/* Playhead housing */}
          <rect x="132" y="104" width="16" height="12" rx="3" fill="#1a1228" stroke={accentHex + '80'} strokeWidth="1.5" />
          <rect x="136" y="107" width="8" height="6" rx="1" fill={accentHex} opacity="0.6" />
          {/* Pinch rollers */}
          <circle cx="122" cy="110" r="5" fill="#1a1228" stroke={accentHex + '50'} strokeWidth="1" />
          <circle cx="158" cy="110" r="5" fill="#1a1228" stroke={accentHex + '50'} strokeWidth="1" />

          {/* Left reel – spins counter-clockwise (supply) */}
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
            style={{ originX: '100px', originY: '90px' }}
          >
            <circle cx="100" cy="90" r="28" fill="#0e0b18" stroke={accentHex + '50'} strokeWidth="1.5" />
            <circle cx="100" cy="90" r="22" fill="none" stroke={accentHex + '25'} strokeWidth="5" />
            <circle cx="100" cy="90" r="16" fill="none" stroke={accentHex + '15'} strokeWidth="3" />
            <circle cx="100" cy="90" r="10" fill="#1a1228" stroke={accentHex + '60'} strokeWidth="1.5" />
            {SPOKE_ANGLES_L.map((a, i) => (
              <line key={i}
                x1={100 + 10 * Math.cos(a * Math.PI / 180)}
                y1={90 + 10 * Math.sin(a * Math.PI / 180)}
                x2={100 + 22 * Math.cos(a * Math.PI / 180)}
                y2={90 + 22 * Math.sin(a * Math.PI / 180)}
                stroke={accentHex + '80'} strokeWidth="2" strokeLinecap="round"
              />
            ))}
            <circle cx="100" cy="90" r="4" fill="#060410" />
            <circle cx="100" cy="90" r="6" fill="none" stroke={accentHex} strokeWidth="1" opacity="0.5" />
          </motion.g>

          {/* Right reel – spins clockwise (take-up, faster) */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.0, ease: 'linear' }}
            style={{ originX: '180px', originY: '90px' }}
          >
            <circle cx="180" cy="90" r="28" fill="#0e0b18" stroke={accentHex2 + '50'} strokeWidth="1.5" />
            <circle cx="180" cy="90" r="14" fill="none" stroke={accentHex2 + '25'} strokeWidth="3" />
            <circle cx="180" cy="90" r="10" fill="#1a1228" stroke={accentHex2 + '60'} strokeWidth="1.5" />
            {SPOKE_ANGLES_R.map((a, i) => (
              <line key={i}
                x1={180 + 10 * Math.cos(a * Math.PI / 180)}
                y1={90 + 10 * Math.sin(a * Math.PI / 180)}
                x2={180 + 22 * Math.cos(a * Math.PI / 180)}
                y2={90 + 22 * Math.sin(a * Math.PI / 180)}
                stroke={accentHex2 + '80'} strokeWidth="2" strokeLinecap="round"
              />
            ))}
            <circle cx="180" cy="90" r="4" fill="#060410" />
            <circle cx="180" cy="90" r="6" fill="none" stroke={accentHex2} strokeWidth="1" opacity="0.5" />
          </motion.g>

          {/* Screw holes */}
          {[28, 252].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy="155" r="5" fill="#0a0812" stroke={accentHex + '30'} strokeWidth="1" />
              <line x1={x - 3} y1="155" x2={x + 3} y2="155" stroke={accentHex + '40'} strokeWidth="1" />
              <line x1={x} y1="152" x2={x} y2="158" stroke={accentHex + '40'} strokeWidth="1" />
            </g>
          ))}

          {/* Tape counter */}
          <rect x="108" y="148" width="64" height="16" rx="3" fill="#060410" stroke={accentHex + '30'} strokeWidth="1" />
          <motion.text x="140" y="159" textAnchor="middle" fill={accentHex} fontSize="8" fontFamily="monospace" fontWeight="bold"
            animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
          >▶ PLAYING</motion.text>

          {/* Playhead glow pulse */}
          <motion.rect x="130" y="103" width="20" height="14" rx="4"
            fill={accentHex} opacity="0"
            animate={{ opacity: [0, 0.18, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
            style={{ filter: 'blur(4px)' }}
          />
        </svg>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.7 }}
          className="w-2 h-2 rounded-full"
          style={{ background: accentHex, boxShadow: `0 0 8px ${accentHex}` }}
        />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Tape Running</span>
      </div>
    </>
  );
};

// ── Variant 2: Graphic Equalizer (Hochwertig) ─────────────────────────────────
const AnimVariantEqualizer = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  const BANDS = 16;
  const baseHeights = [0.82, 0.88, 0.78, 0.68, 0.52, 0.44, 0.38, 0.48, 0.58, 0.64, 0.70, 0.76, 0.68, 0.58, 0.48, 0.38];
  const freqLabels = ['32', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
  const bandDelays = Array.from({ length: BANDS }, (_, i) => i * 0.06);
  const bandDurations = [0.70, 0.90, 0.80, 1.10, 0.75, 0.95, 0.85, 1.00, 0.72, 0.88, 0.78, 1.05, 0.82, 0.92, 0.68, 1.00];

  const barW = 13;
  const gap = 3;
  const totalW = BANDS * (barW + gap) - gap;
  const startX = (290 - totalW) / 2 + 5;
  const maxH = 110;
  const minH = 4;
  const barBaseline = 155;

  return (
    <>
      <div className="relative" style={{ width: 300, height: 200 }}>
        <svg width="300" height="200" viewBox="0 0 300 200">
          <defs>
            <linearGradient id="eq-bar" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={accentHex2} />
              <stop offset="60%" stopColor={accentHex} />
              <stop offset="85%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="eq-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0a0812" />
              <stop offset="100%" stopColor="#06040e" />
            </linearGradient>
          </defs>

          {/* EQ unit body */}
          <rect x="5" y="5" width="290" height="185" rx="10" fill="url(#eq-bg)" stroke={accentHex + '50'} strokeWidth="2" />
          {/* Rack mount ears */}
          <rect x="5" y="12" width="16" height="170" rx="3" fill="#1a1228" stroke={accentHex + '30'} strokeWidth="1" />
          <rect x="279" y="12" width="16" height="170" rx="3" fill="#1a1228" stroke={accentHex + '30'} strokeWidth="1" />
          {/* Rack screws */}
          {([22, 168] as number[]).map((y) => [
            <circle key={`ls-${y}`} cx={13} cy={y} r={4} fill="#0a0812" stroke={accentHex + '40'} strokeWidth={1} />,
            <line key={`lsl-${y}`} x1={10} y1={y} x2={16} y2={y} stroke={accentHex + '50'} strokeWidth={0.8} />,
            <circle key={`rs-${y}`} cx={287} cy={y} r={4} fill="#0a0812" stroke={accentHex + '40'} strokeWidth={1} />,
            <line key={`rsl-${y}`} x1={284} y1={y} x2={290} y2={y} stroke={accentHex + '50'} strokeWidth={0.8} />,
          ]).flat()}

          {/* Header */}
          <text x="150" y="22" textAnchor="middle" fill={accentHex} fontSize="8" fontFamily="monospace" fontWeight="bold" letterSpacing="3">GRAPHIC EQUALIZER</text>
          <line x1="25" y1="27" x2="275" y2="27" stroke={accentHex + '25'} strokeWidth="0.5" />

          {/* dB scale */}
          {(['+12', '+6', '0', '-6', '-12'] as string[]).map((label, i) => (
            <g key={i}>
              <text x="26" y={44 + i * 28} fill={accentHex + '60'} fontSize="6" fontFamily="monospace" textAnchor="end">{label}</text>
              <line x1="28" y1={41 + i * 28} x2="275" y2={41 + i * 28}
                stroke={accentHex + (label === '0' ? '30' : '12')}
                strokeWidth={label === '0' ? 0.8 : 0.4}
                strokeDasharray={label === '0' ? undefined : '3,4'}
              />
            </g>
          ))}

          {/* EQ Bars */}
          {Array.from({ length: BANDS }, (_, i) => {
            const x = startX + i * (barW + gap);
            const targetH = baseHeights[i] * maxH;
            return (
              <motion.g key={i}>
                <motion.rect
                  x={x} y={barBaseline - targetH}
                  width={barW} height={targetH}
                  rx={2}
                  fill="url(#eq-bar)"
                  animate={{
                    height: [
                      Math.max(minH, targetH * 0.3),
                      targetH * 1.05,
                      Math.max(minH, targetH * 0.5),
                      targetH * 0.85,
                      Math.max(minH, targetH * 0.3),
                    ],
                    y: [
                      barBaseline - Math.max(minH, targetH * 0.3),
                      barBaseline - targetH * 1.05,
                      barBaseline - Math.max(minH, targetH * 0.5),
                      barBaseline - targetH * 0.85,
                      barBaseline - Math.max(minH, targetH * 0.3),
                    ],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: bandDurations[i],
                    delay: bandDelays[i],
                    ease: 'easeInOut',
                  }}
                  style={{ filter: `drop-shadow(0 0 3px ${accentHex}60)` }}
                />
                {/* Peak hold dot */}
                <motion.rect
                  x={x} y={barBaseline - targetH * 1.1}
                  width={barW} height={2} rx={1}
                  fill={accentHex}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ repeat: Infinity, duration: bandDurations[i] * 1.5, delay: bandDelays[i] + 0.2 }}
                />
              </motion.g>
            );
          })}

          {/* Frequency labels */}
          {freqLabels.map((label, i) => {
            const bandIdx = Math.round(i * (BANDS - 1) / (freqLabels.length - 1));
            const x = startX + bandIdx * (barW + gap) + barW / 2;
            return (
              <text key={i} x={x} y="175" textAnchor="middle" fill={accentHex + '70'} fontSize="6" fontFamily="monospace">{label}</text>
            );
          })}
          <text x="150" y="184" textAnchor="middle" fill={accentHex + '40'} fontSize="5.5" fontFamily="monospace" letterSpacing="1">Hz</text>

          {/* VU meter strip */}
          <rect x="258" y="32" width="18" height="130" rx="3" fill="#06040e" stroke={accentHex + '30'} strokeWidth="1" />
          {Array.from({ length: 10 }, (_, i) => (
            <motion.rect key={i}
              x={260} y={150 - i * 12}
              width={14} height={10} rx={1}
              fill={i < 6 ? accentHex : i < 8 ? '#f59e0b' : '#ef4444'}
              animate={{ opacity: [0.15, i < 3 ? 1 : i < 6 ? 0.7 : 0.4, 0.15] }}
              transition={{ repeat: Infinity, duration: 0.5 + i * 0.08, delay: i * 0.04, ease: 'easeInOut' }}
            />
          ))}
          <text x="267" y="170" textAnchor="middle" fill={accentHex + '50'} fontSize="5" fontFamily="monospace">VU</text>

          {/* Power LED */}
          <motion.circle cx="40" cy="175" r="4"
            fill={accentHex}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.0 }}
            style={{ filter: `drop-shadow(0 0 5px ${accentHex})` }}
          />
          <text x="48" y="178" fill={accentHex + '80'} fontSize="6" fontFamily="monospace">PWR</text>
        </svg>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-0.5" style={{ height: 16 }}>
          {[0.4, 0.8, 1.0, 0.7, 0.5].map((h, i) => (
            <motion.div key={i}
              className="w-1 rounded-t-sm origin-bottom"
              style={{ height: 12, background: accentHex, opacity: 0.8 }}
              animate={{ scaleY: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Analyzing Frequencies</span>
      </div>
    </>
  );
};

// ── Variant 3: Revox Reel-to-Reel Tape Machine ──────────────────────────────────
const AnimVariantRevox = ({ accentHex, accentHex2, glowColor }: { accentHex: string; accentHex2: string; glowColor: string }) => {
  // Reel geometry: 3 triangular cutouts per reel (like the Revox B77/PR99)
  const CUTOUT_ANGLES = [0, 120, 240];
  const W = 340, H = 280;
  // Left reel center, right reel center
  const LX = 95, LY = 100, RX = 245, RY = 100, REEL_R = 72;
  const HUB_R = 22, INNER_R = 30;
  const CUTOUT_W = 28, CUTOUT_H = 44;

  return (
    <>
      <div className="relative" style={{ width: W, height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="rv-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>
            <linearGradient id="rv-panel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#222222" />
              <stop offset="100%" stopColor="#181818" />
            </linearGradient>
            <linearGradient id="rv-reel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="50%" stopColor="#2c2c2c" />
              <stop offset="100%" stopColor="#222222" />
            </linearGradient>
            <linearGradient id="rv-hub" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#888" />
              <stop offset="50%" stopColor="#aaa" />
              <stop offset="100%" stopColor="#666" />
            </linearGradient>
            <linearGradient id="rv-vu-l" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00c853" />
              <stop offset="70%" stopColor="#00e676" />
              <stop offset="90%" stopColor="#ffeb3b" />
              <stop offset="100%" stopColor="#f44336" />
            </linearGradient>
            <linearGradient id="rv-vu-r" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00c853" />
              <stop offset="70%" stopColor="#00e676" />
              <stop offset="90%" stopColor="#ffeb3b" />
              <stop offset="100%" stopColor="#f44336" />
            </linearGradient>
            <radialGradient id="rv-reel-shine" cx="35%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <clipPath id="rv-reel-clip-l">
              <circle cx={LX} cy={LY} r={REEL_R} />
            </clipPath>
            <clipPath id="rv-reel-clip-r">
              <circle cx={RX} cy={RY} r={REEL_R} />
            </clipPath>
          </defs>

          {/* ── Machine body ── */}
          <rect x="5" y="5" width="330" height="265" rx="8" fill="url(#rv-body)" stroke="#444" strokeWidth="1.5" />
          {/* Top brushed-metal strip */}
          <rect x="5" y="5" width="330" height="12" rx="6" fill="#3a3a3a" />
          {/* REVOX logo */}
          <text x="170" y="16" textAnchor="middle" fill="#ccc" fontSize="9" fontFamily="Arial, sans-serif" fontWeight="bold" letterSpacing="3">reVOX</text>

          {/* ── Reel deck area (upper half) ── */}
          <rect x="10" y="18" width="320" height="160" rx="4" fill="#252525" />

          {/* ── Left reel ── */}
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
            style={{ originX: `${LX}px`, originY: `${LY}px` }}
          >
            {/* Outer reel disc */}
            <circle cx={LX} cy={LY} r={REEL_R} fill="url(#rv-reel)" stroke="#555" strokeWidth="1.5" />
            <circle cx={LX} cy={LY} r={REEL_R} fill="url(#rv-reel-shine)" />
            {/* Tape wound on reel (concentric rings) */}
            {[62, 55, 48].map((r, i) => (
              <circle key={i} cx={LX} cy={LY} r={r} fill="none" stroke={accentHex + '18'} strokeWidth={3 - i * 0.5} />
            ))}
            {/* 3 triangular cutouts */}
            {CUTOUT_ANGLES.map((angle, i) => {
              const rad = (angle - 90) * Math.PI / 180;
              const cx2 = LX + (INNER_R + CUTOUT_H / 2 + 4) * Math.cos(rad);
              const cy2 = LY + (INNER_R + CUTOUT_H / 2 + 4) * Math.sin(rad);
              return (
                <g key={i} transform={`rotate(${angle}, ${LX}, ${LY})`}>
                  <rect
                    x={LX - CUTOUT_W / 2}
                    y={LY - INNER_R - CUTOUT_H - 2}
                    width={CUTOUT_W}
                    height={CUTOUT_H}
                    rx={4}
                    fill="#1a1a1a"
                    clipPath="url(#rv-reel-clip-l)"
                  />
                </g>
              );
            })}
            {/* Hub ring (silver) */}
            <circle cx={LX} cy={LY} r={HUB_R} fill="url(#rv-hub)" stroke="#999" strokeWidth="1" />
            <circle cx={LX} cy={LY} r={HUB_R - 4} fill="#333" stroke="#777" strokeWidth="0.5" />
            {/* Center spindle */}
            <circle cx={LX} cy={LY} r={7} fill="#555" stroke="#888" strokeWidth="1" />
            <circle cx={LX} cy={LY} r={3} fill="#222" />
          </motion.g>

          {/* ── Right reel (take-up, slightly faster) ── */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.6, ease: 'linear' }}
            style={{ originX: `${RX}px`, originY: `${RY}px` }}
          >
            <circle cx={RX} cy={RY} r={REEL_R} fill="url(#rv-reel)" stroke="#555" strokeWidth="1.5" />
            <circle cx={RX} cy={RY} r={REEL_R} fill="url(#rv-reel-shine)" />
            {[50, 43].map((r, i) => (
              <circle key={i} cx={RX} cy={RY} r={r} fill="none" stroke={accentHex2 + '18'} strokeWidth={2.5 - i * 0.5} />
            ))}
            {CUTOUT_ANGLES.map((angle, i) => (
              <g key={i} transform={`rotate(${angle}, ${RX}, ${RY})`}>
                <rect
                  x={RX - CUTOUT_W / 2}
                  y={RY - INNER_R - CUTOUT_H - 2}
                  width={CUTOUT_W}
                  height={CUTOUT_H}
                  rx={4}
                  fill="#1a1a1a"
                  clipPath="url(#rv-reel-clip-r)"
                />
              </g>
            ))}
            <circle cx={RX} cy={RY} r={HUB_R} fill="url(#rv-hub)" stroke="#999" strokeWidth="1" />
            <circle cx={RX} cy={RY} r={HUB_R - 4} fill="#333" stroke="#777" strokeWidth="0.5" />
            <circle cx={RX} cy={RY} r={7} fill="#555" stroke="#888" strokeWidth="1" />
            <circle cx={RX} cy={RY} r={3} fill="#222" />
          </motion.g>

          {/* ── Tape path ── */}
          {/* Left guide post */}
          <circle cx="130" cy="168" r="5" fill="#555" stroke="#888" strokeWidth="1" />
          {/* Right guide post */}
          <circle cx="210" cy="168" r="5" fill="#555" stroke="#888" strokeWidth="1" />
          {/* Tape from left reel to left guide */}
          <path d={`M ${LX + 18} ${LY + 65} Q 130 155 125 168`} fill="none" stroke={accentHex + '90'} strokeWidth="2.5" strokeLinecap="round" />
          {/* Tape across heads */}
          <path d="M 135 168 L 205 168" fill="none" stroke={accentHex + 'cc'} strokeWidth="2.5" strokeLinecap="round" />
          {/* Tape from right guide to right reel */}
          <path d={`M 215 168 Q 210 155 ${RX - 18} ${RY + 65}`} fill="none" stroke={accentHex2 + '90'} strokeWidth="2.5" strokeLinecap="round" />

          {/* ── Tape head assembly ── */}
          <rect x="155" y="162" width="30" height="14" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
          {/* 3 head gaps */}
          {[161, 169, 177].map((x, i) => (
            <rect key={i} x={x} y="165" width="4" height="8" rx="1" fill="#1a1a1a" stroke={accentHex + '60'} strokeWidth="0.5" />
          ))}
          {/* Playhead glow */}
          <motion.rect x="167" y="163" width="6" height="12" rx="2"
            fill={accentHex} opacity="0"
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
            style={{ filter: 'blur(3px)' }}
          />

          {/* ── Counter display (green LED) ── */}
          <rect x="145" y="148" width="50" height="14" rx="3" fill="#0a1a0a" stroke="#333" strokeWidth="1" />
          <motion.text x="170" y="158" textAnchor="middle" fill="#00e676" fontSize="9" fontFamily="monospace" fontWeight="bold"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >03:45.0</motion.text>

          {/* ── Front panel ── */}
          <rect x="10" y="182" width="320" height="80" rx="4" fill="url(#rv-panel)" stroke="#333" strokeWidth="1" />

          {/* VU meters (left + right) – teal/green backlit */}
          {/* Left VU */}
          <rect x="220" y="188" width="48" height="32" rx="3" fill="#001a0a" stroke="#444" strokeWidth="1" />
          <rect x="222" y="190" width="44" height="28" rx="2" fill="#002a10" />
          {/* VU scale lines */}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={223 + i * 5.5} y1="192" x2={223 + i * 5.5} y2="196" stroke={i < 6 ? '#00c853' : i < 7 ? '#ffeb3b' : '#f44336'} strokeWidth="0.8" />
          ))}
          {/* Animated needle */}
          <motion.g
            animate={{ rotate: [-20, 25, -5, 30, -15, 20, -20] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            style={{ originX: '244px', originY: '214px' }}
          >
            <line x1="244" y1="214" x2="244" y2="196" stroke="#ff5722" strokeWidth="1.2" strokeLinecap="round" />
          </motion.g>
          {/* VU meter backlight glow */}
          <motion.rect x="222" y="190" width="44" height="28" rx="2"
            fill="#00e676" opacity="0"
            animate={{ opacity: [0.04, 0.12, 0.04] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
          <text x="244" y="226" textAnchor="middle" fill="#555" fontSize="5" fontFamily="monospace">LEFT</text>

          {/* Right VU */}
          <rect x="272" y="188" width="48" height="32" rx="3" fill="#001a0a" stroke="#444" strokeWidth="1" />
          <rect x="274" y="190" width="44" height="28" rx="2" fill="#002a10" />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={275 + i * 5.5} y1="192" x2={275 + i * 5.5} y2="196" stroke={i < 6 ? '#00c853' : i < 7 ? '#ffeb3b' : '#f44336'} strokeWidth="0.8" />
          ))}
          <motion.g
            animate={{ rotate: [-25, 15, -10, 35, -20, 10, -25] }}
            transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut', delay: 0.3 }}
            style={{ originX: '296px', originY: '214px' }}
          >
            <line x1="296" y1="214" x2="296" y2="196" stroke="#ff5722" strokeWidth="1.2" strokeLinecap="round" />
          </motion.g>
          <motion.rect x="274" y="190" width="44" height="28" rx="2"
            fill="#00e676" opacity="0"
            animate={{ opacity: [0.04, 0.10, 0.04] }}
            transition={{ repeat: Infinity, duration: 2.0, ease: 'easeInOut', delay: 0.4 }}
          />
          <text x="296" y="226" textAnchor="middle" fill="#555" fontSize="5" fontFamily="monospace">RIGHT</text>

          {/* ── Knobs (left panel area) ── */}
          {/* Volume knob */}
          <circle cx="50" cy="210" r="14" fill="#2a2a2a" stroke="#666" strokeWidth="1.5" />
          <circle cx="50" cy="210" r="10" fill="#333" stroke="#555" strokeWidth="0.8" />
          <motion.line x1="50" y1="210" x2="50" y2="200"
            stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"
            animate={{ rotate: [-30, 30, -30] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{ originX: '50px', originY: '210px' }}
          />
          <text x="50" y="230" textAnchor="middle" fill="#555" fontSize="5" fontFamily="monospace">VOLUME</text>

          {/* Input level knob L */}
          <circle cx="110" cy="210" r="11" fill="#2a2a2a" stroke="#666" strokeWidth="1.5" />
          <circle cx="110" cy="210" r="7" fill="#333" stroke="#555" strokeWidth="0.8" />
          <motion.line x1="110" y1="210" x2="110" y2="202"
            stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"
            animate={{ rotate: [20, -20, 20] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            style={{ originX: '110px', originY: '210px' }}
          />
          <text x="110" y="226" textAnchor="middle" fill="#555" fontSize="5" fontFamily="monospace">REC·L</text>

          {/* Input level knob R */}
          <circle cx="155" cy="210" r="11" fill="#2a2a2a" stroke="#666" strokeWidth="1.5" />
          <circle cx="155" cy="210" r="7" fill="#333" stroke="#555" strokeWidth="0.8" />
          <motion.line x1="155" y1="210" x2="155" y2="202"
            stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"
            animate={{ rotate: [-15, 25, -15] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut', delay: 0.5 }}
            style={{ originX: '155px', originY: '210px' }}
          />
          <text x="155" y="226" textAnchor="middle" fill="#555" fontSize="5" fontFamily="monospace">REC·R</text>

          {/* ── Transport buttons ── */}
          {[
            { label: '\u23f8', x: 220, active: false },
            { label: '\u23ea', x: 236, active: false },
            { label: '\u23e9', x: 252, active: false },
            { label: '\u25b6', x: 268, active: true },
            { label: '\u23f9', x: 284, active: false },
            { label: '\u25cf', x: 300, active: false, red: true },
          ].map(({ label, x, active, red }) => (
            <g key={x}>
              <rect x={x - 7} y="232" width="14" height="10" rx="2"
                fill={active ? accentHex + '30' : red ? '#3a0a0a' : '#2a2a2a'}
                stroke={active ? accentHex : red ? '#f44336' : '#555'}
                strokeWidth="1"
              />
              <text x={x} y="240" textAnchor="middle"
                fill={active ? accentHex : red ? '#f44336' : '#888'}
                fontSize="7" fontFamily="monospace"
              >{label}</text>
            </g>
          ))}

          {/* PLAY button active glow */}
          <motion.rect x="261" y="231" width="14" height="12" rx="2"
            fill={accentHex} opacity="0"
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut' }}
            style={{ filter: 'blur(3px)' }}
          />

          {/* Speed selector label */}
          <text x="20" y="195" fill="#444" fontSize="5.5" fontFamily="monospace">7½ / 15 IPS</text>

          {/* Power indicator LED */}
          <motion.circle cx="20" cy="242" r="3"
            fill={accentHex}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ filter: `drop-shadow(0 0 4px ${accentHex})` }}
          />
          <text x="28" y="245" fill="#444" fontSize="5" fontFamily="monospace">POWER</text>

          {/* Bottom chrome strip */}
          <rect x="5" y="262" width="330" height="8" rx="4" fill="#3a3a3a" stroke="#555" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          className="flex items-end gap-0.5"
          style={{ height: 16 }}
        >
          {[0.5, 0.9, 0.7, 1.0, 0.6, 0.8].map((h, i) => (
            <motion.div key={i}
              className="w-1 rounded-t-sm origin-bottom"
              style={{ height: 12, background: '#00c853', opacity: 0.9 }}
              animate={{ scaleY: [h * 0.2, h, h * 0.4, h * 0.7, h * 0.2] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.12, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentHex }}>Tape Rolling</span>
      </div>
    </>
  );
};

// ── MusicLoadingBar: Random Variant Selector ─────────────────────────────────────────────────
const ANIM_VARIANTS = [AnimVariantCassette, AnimVariantEqualizer, AnimVariantRevox] as const;

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
