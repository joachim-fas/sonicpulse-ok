import { motion } from "framer-motion";

interface AnimatedArtistFallbackProps {
  artistName: string;
  accentColor?: "cyan" | "rose";
  className?: string;
}

/**
 * Animated fallback graphic for artist cards without an image.
 * Visual style: dark ambient orbs + pulsing vinyl ring – matches the SonicPulse background aesthetic.
 */
export function AnimatedArtistFallback({
  artistName,
  accentColor = "cyan",
  className = "",
}: AnimatedArtistFallbackProps) {
  const isCyan = accentColor === "cyan";

  // Accent palette
  const primary   = isCyan ? "rgba(6,182,212,"   : "rgba(244,114,182,";
  const secondary = isCyan ? "rgba(20,184,166,"  : "rgba(168,85,247,";
  const tertiary  = isCyan ? "rgba(59,130,246,"  : "rgba(236,72,153,";

  // Initials from artist name (max 2 chars)
  const initials = artistName
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-zinc-950 ${className}`}
      aria-label={`No image available for ${artistName}`}
    >
      {/* ── Ambient background orbs ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: [
            `radial-gradient(ellipse 80% 60% at 20% 20%, ${primary}0.25) 0%, transparent 70%)`,
            `radial-gradient(ellipse 60% 80% at 80% 80%, ${secondary}0.20) 0%, transparent 70%)`,
            `radial-gradient(ellipse 50% 50% at 55% 45%, ${tertiary}0.12) 0%, transparent 60%)`,
          ].join(", "),
        }}
      />

      {/* ── Slow-drifting secondary orb ── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: "140%",
          height: "140%",
          top: "-20%",
          left: "-20%",
          background: `radial-gradient(ellipse 50% 50% at 60% 40%, ${secondary}0.15) 0%, transparent 65%)`,
        }}
        animate={{ x: [0, 18, -12, 0], y: [0, -14, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Vinyl record rings ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outer ring – slow spin */}
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: "75%",
            height: "75%",
            borderColor: `${primary}0.18)`,
            borderWidth: "1px",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />

        {/* Middle ring – counter-spin */}
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: "52%",
            height: "52%",
            borderColor: `${secondary}0.22)`,
            borderWidth: "1px",
            borderStyle: "dashed",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner ring – pulse */}
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: "32%",
            height: "32%",
            borderColor: `${primary}0.30)`,
            borderWidth: "1px",
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Center dot – pulsing glow */}
        <motion.div
          className="absolute rounded-full z-10"
          style={{
            width: "18%",
            height: "18%",
            background: `radial-gradient(circle, ${primary}0.9) 0%, ${primary}0.3) 50%, transparent 80%)`,
            boxShadow: `0 0 20px 4px ${primary}0.35)`,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Initials text */}
        <span
          className="absolute z-20 font-bold tracking-widest select-none"
          style={{
            fontSize: "clamp(0.75rem, 3vw, 1.1rem)",
            color: `${primary}0.85)`,
            textShadow: `0 0 12px ${primary}0.6)`,
            letterSpacing: "0.15em",
          }}
        >
          {initials || "♪"}
        </span>
      </div>

      {/* ── Subtle noise texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Scanning line – subtle animation ── */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${primary}0.4), transparent)` }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
