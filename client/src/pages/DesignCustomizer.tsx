import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft, RotateCcw, Copy, Check, Sliders, Palette,
  Layers, Eye, EyeOff, ChevronDown, ChevronUp, Zap
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlobColor {
  color: string;
  label: string;
}

interface DesignConfig {
  // Background
  bgColor: string;
  // Blob colors per palette
  landingBlobs: BlobColor[];
  exploreBlobs: BlobColor[];
  moodBlobs: BlobColor[];
  // Animation
  blobSpeed: number;        // 0.2 – 3.0 (multiplier)
  blobIntensity: number;    // 0.1 – 1.0 (opacity)
  blobBlur: number;         // 40 – 160 (px)
  blobCount: number;        // 3 – 7
  // Effects
  showGrain: boolean;
  showPulseRings: boolean;
  showWaveLines: boolean;
  mouseReactivity: number;  // 0.01 – 0.15 (lerp factor)
  // Cards
  cardBlur: number;         // 8 – 40 (px)
  cardOpacity: number;      // 0.02 – 0.15
  cardBorderOpacity: number;// 0.03 – 0.20
  cardRadius: number;       // 12 – 48 (px)
  // Typography
  accentGradient: [string, string, string]; // [from, via, to]
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: DesignConfig = {
  bgColor: "#0a0a0f",
  landingBlobs: [
    { color: "#954aaf", label: "Violet" },
    { color: "#0dabf7", label: "Sky Blue" },
    { color: "#eb518b", label: "Hot Pink" },
    { color: "#6b21a8", label: "Deep Violet" },
    { color: "#1e40af", label: "Deep Blue" },
    { color: "#f472b6", label: "Rose" },
    { color: "#c084fc", label: "Lavender" },
  ],
  exploreBlobs: [
    { color: "#7c3aed", label: "Violet" },
    { color: "#1e40af", label: "Deep Blue" },
    { color: "#0dabf7", label: "Sky Blue" },
    { color: "#4c1d95", label: "Dark Violet" },
    { color: "#2563eb", label: "Blue" },
    { color: "#8b5cf6", label: "Purple" },
    { color: "#0e7490", label: "Teal" },
  ],
  moodBlobs: [
    { color: "#eb518b", label: "Hot Pink" },
    { color: "#954aaf", label: "Violet" },
    { color: "#f472b6", label: "Rose" },
    { color: "#be185d", label: "Dark Pink" },
    { color: "#9d174d", label: "Crimson" },
    { color: "#c084fc", label: "Lavender" },
    { color: "#e879f9", label: "Fuchsia" },
  ],
  blobSpeed: 1.0,
  blobIntensity: 0.55,
  blobBlur: 80,
  blobCount: 7,
  showGrain: true,
  showPulseRings: true,
  showWaveLines: true,
  mouseReactivity: 0.04,
  cardBlur: 20,
  cardOpacity: 0.04,
  cardBorderOpacity: 0.07,
  cardRadius: 28,
  accentGradient: ["#954aaf", "#eb518b", "#0dabf7"],
};

const STORAGE_KEY = "sonicpulse_design_config";

function loadConfig(): DesignConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

function saveConfig(cfg: DesignConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── Apply config to CSS variables ───────────────────────────────────────────
function applyConfig(cfg: DesignConfig) {
  const root = document.documentElement;
  root.style.setProperty("--bg-primary", cfg.bgColor);
  root.style.setProperty("--blob-blur", `${cfg.blobBlur}px`);
  root.style.setProperty("--blob-opacity", String(cfg.blobIntensity));
  root.style.setProperty("--card-blur", `${cfg.cardBlur}px`);
  root.style.setProperty("--card-opacity", String(cfg.cardOpacity));
  root.style.setProperty("--card-border-opacity", String(cfg.cardBorderOpacity));
  root.style.setProperty("--card-radius", `${cfg.cardRadius}px`);
  root.style.setProperty("--accent-from", cfg.accentGradient[0]);
  root.style.setProperty("--accent-via", cfg.accentGradient[1]);
  root.style.setProperty("--accent-to", cfg.accentGradient[2]);
  // Blob colors
  cfg.landingBlobs.forEach((b, i) => root.style.setProperty(`--blob-landing-${i + 1}`, b.color));
  cfg.exploreBlobs.forEach((b, i) => root.style.setProperty(`--blob-explore-${i + 1}`, b.color));
  cfg.moodBlobs.forEach((b, i) => root.style.setProperty(`--blob-mood-${i + 1}`, b.color));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, open, onToggle }: {
  icon: React.ReactNode; title: string; open: boolean; onToggle: () => void;
}) => (
    <button
    onClick={onToggle}
    className="w-full flex items-center justify-between py-3 border-b border-white/8 hover:border-white/15 transition-colors group"
  >
    <div className="flex items-center gap-2.5 text-white/80 group-hover:text-white transition-colors">
      <span style={{ color: 'var(--violet-light)' }}>{icon}</span>
      <span className="text-xs font-medium uppercase tracking-widest">{title}</span>
    </div>
    {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
  </button>
);

const SliderRow = ({ label, value, min, max, step = 0.01, format, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-white/50 font-light">{label}</span>
      <span className="text-[11px] text-white/70 font-mono tabular-nums">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full"
    />
  </div>
);

const ColorSwatch = ({ color, label, onChange }: {
  color: string; label: string; onChange: (c: string) => void;
}) => (
  <div className="flex flex-col items-center gap-1.5">
    <label className="relative cursor-pointer group">
      <div
        className="w-8 h-8 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-all shadow-lg"
        style={{ background: color }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </label>
    <span className="text-[9px] text-white/30 font-light text-center leading-tight max-w-[40px] truncate">{label}</span>
  </div>
);

const ToggleRow = ({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[11px] text-white/50 font-light">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "w-10 h-5 rounded-full transition-all relative",
        value ? "bg-[var(--violet)]" : "bg-white/10"
      )}
    >
      <div className={cn(
        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
        value ? "left-5.5" : "left-0.5"
      )} style={{ left: value ? "calc(100% - 18px)" : "2px" }} />
    </button>
  </div>
);

// ─── Live Preview ─────────────────────────────────────────────────────────────
const LivePreview = ({ cfg, previewMode }: { cfg: DesignConfig; previewMode: "landing" | "explore" | "mood" }) => {
  const blobs = previewMode === "explore" ? cfg.exploreBlobs : previewMode === "mood" ? cfg.moodBlobs : cfg.landingBlobs;
  const visibleBlobs = blobs.slice(0, cfg.blobCount);

  const blobPositions = [
    { top: "-15%", left: "-10%", w: "55%", h: "55%" },
    { top: "25%", right: "-12%", w: "45%", h: "45%" },
    { bottom: "5%", left: "15%", w: "40%", h: "40%" },
    { top: "55%", right: "10%", w: "32%", h: "32%" },
    { top: "10%", left: "35%", w: "28%", h: "28%" },
    { bottom: "20%", right: "30%", w: "22%", h: "22%" },
    { top: "40%", left: "5%", w: "20%", h: "20%" },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/8"
      style={{ background: cfg.bgColor, aspectRatio: "16/9" }}
    >
      {/* Blobs */}
      {visibleBlobs.map((blob, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            ...blobPositions[i],
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            filter: `blur(${cfg.blobBlur * 0.4}px)`,
            opacity: cfg.blobIntensity,
          }}
        />
      ))}

      {/* Grain */}
      {cfg.showGrain && (
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
            backgroundSize: "128px 128px",
          }}
        />
      )}

      {/* Sample card */}
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="px-6 py-4 text-center"
          style={{
            background: `rgba(255,255,255,${cfg.cardOpacity})`,
            backdropFilter: `blur(${cfg.cardBlur}px)`,
            border: `1px solid rgba(255,255,255,${cfg.cardBorderOpacity})`,
            borderRadius: `${cfg.cardRadius}px`,
          }}
        >
          <div
            className="text-lg font-semibold mb-1"
            style={{
              background: `linear-gradient(135deg, ${cfg.accentGradient[0]}, ${cfg.accentGradient[1]}, ${cfg.accentGradient[2]})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SonicPulse
          </div>
          <div className="text-white/60 text-xs font-light">
            {previewMode === "explore" ? "Explore Mode" : previewMode === "mood" ? "Mood Mode" : "Landing"}
          </div>
        </div>
      </div>

      {/* Mode label */}
      <div className="absolute top-3 left-3">
        <span className="text-[9px] uppercase tracking-widest text-white/30 font-medium">
          {previewMode}
        </span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DesignCustomizer() {
  const [cfg, setCfg] = useState<DesignConfig>(loadConfig);
  const [previewMode, setPreviewMode] = useState<"landing" | "explore" | "mood">("landing");
  const [copied, setCopied] = useState(false);
  const [sections, setSections] = useState({
    background: true,
    blobs: true,
    animation: false,
    effects: false,
    cards: false,
    typography: false,
  });

  // Apply config to CSS vars whenever it changes
  useEffect(() => {
    applyConfig(cfg);
    saveConfig(cfg);
  }, [cfg]);

  // Apply on mount
  useEffect(() => {
    applyConfig(cfg);
  }, []);

  const update = useCallback(<K extends keyof DesignConfig>(key: K, value: DesignConfig[K]) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateBlobColor = useCallback((palette: "landingBlobs" | "exploreBlobs" | "moodBlobs", index: number, color: string) => {
    setCfg(prev => {
      const blobs = [...prev[palette]];
      blobs[index] = { ...blobs[index], color };
      return { ...prev, [palette]: blobs };
    });
  }, []);

  const updateAccent = useCallback((index: 0 | 1 | 2, color: string) => {
    setCfg(prev => {
      const g = [...prev.accentGradient] as [string, string, string];
      g[index] = color;
      return { ...prev, accentGradient: g };
    });
  }, []);

  const reset = useCallback(() => {
    setCfg(DEFAULT_CONFIG);
  }, []);

  const exportConfig = useCallback(() => {
    const json = JSON.stringify(cfg, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cfg]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg-primary)' }}>
      {/* Blob background (uses current config) */}
      <div className="bg-system" aria-hidden="true">
        {cfg.landingBlobs.slice(0, cfg.blobCount).map((blob, i) => (
          <div
            key={i}
            className={`blob blob-${i + 1}`}
            style={{
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              filter: `blur(${cfg.blobBlur}px)`,
              opacity: cfg.blobIntensity,
            }}
          />
        ))}
        {cfg.showPulseRings && (
          <>
            <div className="pulse-ring pulse-ring-1" />
            <div className="pulse-ring pulse-ring-2" />
          </>
        )}
        {cfg.showWaveLines && (
          <>
            <div className="wave-line wave-line-1" />
            <div className="wave-line wave-line-2" />
          </>
        )}
        {cfg.showGrain && <div className="grain" />}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <nav className="nav border-b border-white/8 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline font-light">Back</span>
              </button>
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2">
              <Sliders size={14} style={{ color: 'var(--violet-light)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Design Customizer</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              title="Reset to defaults"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={exportConfig}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/8 hover:bg-white/12 border border-white/10 transition-all text-xs"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              <span>{copied ? "Copied!" : "Export JSON"}</span>
            </button>
          </div>
        </nav>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">

          {/* ── Controls Panel ── */}
          <div className="w-full lg:w-80 xl:w-96 border-r border-white/8 overflow-y-auto">
            <div className="p-5 space-y-1">

              {/* Background */}
              <SectionHeader icon={<Palette size={13} />} title="Background" open={sections.background} onToggle={() => toggleSection("background")} />
              <AnimatePresence>
                {sections.background && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-white/50 font-light">Background Color</span>
                        <div className="flex items-center gap-3">
                          <label className="relative cursor-pointer">
                            <div
                              className="w-10 h-10 rounded-xl border border-white/15 shadow-lg"
                              style={{ background: cfg.bgColor }}
                            />
                            <input
                              type="color"
                              value={cfg.bgColor}
                              onChange={(e) => update("bgColor", e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </label>
                          <input
                            type="text"
                            value={cfg.bgColor}
                            onChange={(e) => {
                              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) update("bgColor", e.target.value);
                            }}
                            className="form-input flex-1 font-mono text-xs py-2"
                            placeholder="#0a0a0f"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Blob Colors */}
              <SectionHeader icon={<Layers size={13} />} title="Blob Colors" open={sections.blobs} onToggle={() => toggleSection("blobs")} />
              <AnimatePresence>
                {sections.blobs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-5">
                      {(["landing", "explore", "mood"] as const).map((palette) => {
                        const key = `${palette}Blobs` as "landingBlobs" | "exploreBlobs" | "moodBlobs";
                        const blobs = cfg[key];
                        return (
                          <div key={palette}>
                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3 font-medium">{palette}</div>
                            <div className="flex flex-wrap gap-3">
                              {blobs.slice(0, cfg.blobCount).map((blob, i) => (
                                <ColorSwatch
                                  key={i}
                                  color={blob.color}
                                  label={blob.label}
                                  onChange={(c) => updateBlobColor(key, i, c)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animation */}
              <SectionHeader icon={<Zap size={13} />} title="Animation" open={sections.animation} onToggle={() => toggleSection("animation")} />
              <AnimatePresence>
                {sections.animation && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-4">
                      <SliderRow
                        label="Blob Count"
                        value={cfg.blobCount}
                        min={3}
                        max={7}
                        step={1}
                        format={(v) => `${v} blobs`}
                        onChange={(v) => update("blobCount", v)}
                      />
                      <SliderRow
                        label="Blur Radius"
                        value={cfg.blobBlur}
                        min={40}
                        max={160}
                        step={5}
                        format={(v) => `${v}px`}
                        onChange={(v) => update("blobBlur", v)}
                      />
                      <SliderRow
                        label="Intensity (Opacity)"
                        value={cfg.blobIntensity}
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(v) => update("blobIntensity", v)}
                      />
                      <SliderRow
                        label="Mouse Reactivity"
                        value={cfg.mouseReactivity}
                        min={0.01}
                        max={0.15}
                        step={0.005}
                        format={(v) => v < 0.03 ? "Slow" : v < 0.07 ? "Medium" : "Fast"}
                        onChange={(v) => update("mouseReactivity", v)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Effects */}
              <SectionHeader icon={<Eye size={13} />} title="Effects" open={sections.effects} onToggle={() => toggleSection("effects")} />
              <AnimatePresence>
                {sections.effects && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-2">
                      <ToggleRow label="Grain Texture" value={cfg.showGrain} onChange={(v) => update("showGrain", v)} />
                      <ToggleRow label="Pulse Rings" value={cfg.showPulseRings} onChange={(v) => update("showPulseRings", v)} />
                      <ToggleRow label="Wave Lines" value={cfg.showWaveLines} onChange={(v) => update("showWaveLines", v)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cards */}
              <SectionHeader icon={<Layers size={13} />} title="Cards" open={sections.cards} onToggle={() => toggleSection("cards")} />
              <AnimatePresence>
                {sections.cards && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-4">
                      <SliderRow
                        label="Backdrop Blur"
                        value={cfg.cardBlur}
                        min={8}
                        max={40}
                        step={2}
                        format={(v) => `${v}px`}
                        onChange={(v) => update("cardBlur", v)}
                      />
                      <SliderRow
                        label="Background Opacity"
                        value={cfg.cardOpacity}
                        min={0.02}
                        max={0.15}
                        step={0.005}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(v) => update("cardOpacity", v)}
                      />
                      <SliderRow
                        label="Border Opacity"
                        value={cfg.cardBorderOpacity}
                        min={0.03}
                        max={0.20}
                        step={0.005}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(v) => update("cardBorderOpacity", v)}
                      />
                      <SliderRow
                        label="Border Radius"
                        value={cfg.cardRadius}
                        min={12}
                        max={48}
                        step={2}
                        format={(v) => `${v}px`}
                        onChange={(v) => update("cardRadius", v)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Typography */}
              <SectionHeader icon={<Palette size={13} />} title="Accent Gradient" open={sections.typography} onToggle={() => toggleSection("typography")} />
              <AnimatePresence>
                {sections.typography && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="py-4 space-y-4">
                      {/* Gradient preview */}
                      <div
                        className="h-8 rounded-full w-full"
                        style={{
                          background: `linear-gradient(135deg, ${cfg.accentGradient[0]}, ${cfg.accentGradient[1]}, ${cfg.accentGradient[2]})`,
                        }}
                      />
                      <div className="flex gap-4">
                        {(["From", "Via", "To"] as const).map((label, i) => (
                          <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                            <label className="relative cursor-pointer">
                              <div
                                className="w-10 h-10 rounded-xl border border-white/15 shadow-lg mx-auto"
                                style={{ background: cfg.accentGradient[i] }}
                              />
                              <input
                                type="color"
                                value={cfg.accentGradient[i]}
                                onChange={(e) => updateAccent(i as 0 | 1 | 2, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </label>
                            <span className="text-[10px] text-white/30">{label}</span>
                          </div>
                        ))}
                      </div>
                      {/* Sample text */}
                      <div
                        className="text-2xl font-semibold text-center py-2"
                        style={{
                          background: `linear-gradient(135deg, ${cfg.accentGradient[0]}, ${cfg.accentGradient[1]}, ${cfg.accentGradient[2]})`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        reimagined.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* ── Preview Panel ── */}
          <div className="flex-1 p-6 lg:p-10 flex flex-col gap-6">
            {/* Mode selector */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Preview</span>
              <div className="flex items-center gap-1 p-1 rounded-full bg-black/30 border border-white/8">
                {(["landing", "explore", "mood"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPreviewMode(m)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest transition-all",
                      previewMode === m
                        ? m === "explore"
                          ? "bg-gradient-to-r from-[var(--sp-violet)] to-[var(--sp-blue-deep)] text-white"
                          : m === "mood"
                          ? "bg-gradient-to-r from-[var(--sp-pink-hot)] to-[var(--sp-violet)] text-white"
                          : "bg-white/10 text-white"
                        : "text-white/40 hover:text-white"
                    )}
                  >{m}</button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="w-full max-w-3xl">
              <LivePreview cfg={cfg} previewMode={previewMode} />
            </div>

            {/* Sample Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
              {["Artist Card", "Mood Card", "Info Card"].map((title, i) => (
                <div
                  key={title}
                  className="p-5 transition-all"
                  style={{
                    background: `rgba(255,255,255,${cfg.cardOpacity})`,
                    backdropFilter: `blur(${cfg.cardBlur}px)`,
                    border: `1px solid rgba(255,255,255,${cfg.cardBorderOpacity})`,
                    borderRadius: `${cfg.cardRadius}px`,
                  }}
                >
                  <div className="w-8 h-8 rounded-full mb-3" style={{
                    background: i === 0
                      ? `linear-gradient(135deg, ${cfg.accentGradient[0]}, ${cfg.accentGradient[1]})`
                      : i === 1
                      ? `linear-gradient(135deg, ${cfg.accentGradient[1]}, ${cfg.accentGradient[2]})`
                      : `linear-gradient(135deg, ${cfg.accentGradient[2]}, ${cfg.accentGradient[0]})`,
                  }} />
                  <div className="text-sm font-medium text-white/80 mb-1">{title}</div>
                  <div className="text-[11px] text-white/30 font-light leading-relaxed">
                    Sample content preview with current card settings applied.
                  </div>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="max-w-3xl p-4 rounded-2xl bg-white/3 border border-white/6">
              <p className="text-[11px] text-white/30 font-light leading-relaxed">
                <strong className="text-white/50 font-medium">Changes apply instantly</strong> — your settings are saved automatically to your browser and applied across the entire app. Use "Export JSON" to copy the current config, or "Reset" to restore defaults. User-specific settings and password protection will be added in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
