import { useEffect, useRef, useMemo } from "react";

// ─── Shape Definitions ──────────────────────────────────────────────────────
type ShapeType = "sphere" | "blob" | "kidney" | "teardrop" | "elongated" | "plasma" | "crescent" | "torus";

interface ShapeConfig {
  id: number;
  type: ShapeType;
  x: number;        // % from left
  y: number;        // % from top
  size: number;     // px
  color: string;    // CSS color
  blur: number;     // px
  opacity: number;
  parallaxFactor: number;
  driftX: number[];
  driftY: number[];
  driftScale: number[];
  driftDuration: number;
  driftDelay: number;
  rotation: number;
}

// ─── Color Palettes ─────────────────────────────────────────────────────────
const EXPLORE_COLORS = [
  "rgba(0, 212, 255, 0.85)",   // Electric Cyan
  "rgba(0, 102, 255, 0.80)",   // Electric Blue
  "rgba(0, 180, 160, 0.75)",   // Teal
  "rgba(139, 92, 246, 0.70)",  // Violet
  "rgba(52, 211, 153, 0.65)",  // Mint
  "rgba(6, 182, 212, 0.80)",   // Cyan-500
  "rgba(59, 130, 246, 0.75)",  // Blue-500
];

const MOOD_COLORS = [
  "rgba(255, 45, 120, 0.85)",  // Hot Rose
  "rgba(255, 107, 53, 0.75)",  // Coral
  "rgba(224, 64, 251, 0.80)",  // Magenta
  "rgba(251, 191, 36, 0.65)",  // Amber
  "rgba(255, 179, 198, 0.60)", // Soft Pink
  "rgba(244, 114, 182, 0.80)", // Pink-400
  "rgba(168, 85, 247, 0.70)",  // Purple-500
];

const LANDING_COLORS = [
  "rgba(0, 212, 255, 0.70)",
  "rgba(255, 45, 120, 0.70)",
  "rgba(139, 92, 246, 0.65)",
  "rgba(0, 180, 160, 0.60)",
  "rgba(255, 107, 53, 0.60)",
];

// ─── Shape Border Radius Presets ─────────────────────────────────────────────
function getBorderRadius(type: ShapeType): string {
  switch (type) {
    case "sphere":    return "50%";
    case "blob":      return "60% 40% 70% 30% / 50% 60% 40% 50%";
    case "kidney":    return "30% 70% 70% 30% / 30% 30% 70% 70%";
    case "teardrop":  return "50% 50% 50% 50% / 60% 60% 40% 40%";
    case "elongated": return "40% 60% 60% 40% / 50% 40% 60% 50%";
    case "plasma":    return "55% 45% 35% 65% / 45% 55% 65% 35%";
    case "crescent":  return "50% 50% 50% 50% / 70% 30% 70% 30%";
    case "torus":     return "40% 60% 40% 60% / 60% 40% 60% 40%";
    default:          return "50%";
  }
}

// ─── Shape Generator ─────────────────────────────────────────────────────────
function generateShapes(
  mode: "explore" | "mood" | "landing",
  count: number = 6
): ShapeConfig[] {
  const colors = mode === "explore" ? EXPLORE_COLORS : mode === "mood" ? MOOD_COLORS : LANDING_COLORS;

  // Explore: prefer cosmic/cold shapes; Mood: prefer organic/warm shapes
  const exploreShapes: ShapeType[] = ["sphere", "torus", "elongated", "blob", "crescent"];
  const moodShapes: ShapeType[] = ["kidney", "plasma", "teardrop", "blob", "crescent", "elongated"];
  const landingShapes: ShapeType[] = ["sphere", "blob", "kidney", "teardrop", "elongated", "plasma"];
  const shapePool = mode === "explore" ? exploreShapes : mode === "mood" ? moodShapes : landingShapes;

  const shapes: ShapeConfig[] = [];
  const usedColors = new Set<number>();

  for (let i = 0; i < count; i++) {
    // Pick unique color
    let colorIdx: number;
    do { colorIdx = Math.floor(Math.random() * colors.length); }
    while (usedColors.has(colorIdx) && usedColors.size < colors.length);
    usedColors.add(colorIdx);

    const shapeType = shapePool[Math.floor(Math.random() * shapePool.length)];
    const size = 200 + Math.random() * 400; // 200–600px
    const blur = 60 + Math.random() * 80;   // 60–140px
    const opacity = 0.45 + Math.random() * 0.35; // 0.45–0.80

    // Deeper (larger, more blur) = slower parallax
    const parallaxFactor = (0.02 + Math.random() * 0.06) * (1 - blur / 300);

    // Drift keyframes (4 waypoints + return)
    const driftAmp = mode === "mood" ? 70 : 50; // Mood moves more
    const driftX = [0, (Math.random() - 0.5) * driftAmp * 2, (Math.random() - 0.5) * driftAmp, (Math.random() - 0.5) * driftAmp * 1.5, 0];
    const driftY = [0, (Math.random() - 0.5) * driftAmp, (Math.random() - 0.5) * driftAmp * 2, (Math.random() - 0.5) * driftAmp * 0.5, 0];
    const driftScale = [1, 0.95 + Math.random() * 0.15, 1.0 + Math.random() * 0.1, 0.97 + Math.random() * 0.08, 1];

    // Mood: faster (8–18s), Explore: slower (12–25s)
    const driftDuration = mode === "mood"
      ? 8 + Math.random() * 10
      : 12 + Math.random() * 13;

    shapes.push({
      id: i,
      type: shapeType,
      x: 5 + Math.random() * 90,   // 5–95% (allow slight overflow)
      y: 5 + Math.random() * 90,
      size,
      color: colors[colorIdx],
      blur,
      opacity,
      parallaxFactor,
      driftX,
      driftY,
      driftScale,
      driftDuration,
      driftDelay: Math.random() * -20, // negative delay = start mid-animation
      rotation: Math.random() * 360,
    });
  }

  return shapes;
}

// ─── CSS Keyframe Generator ───────────────────────────────────────────────────
function buildKeyframes(shape: ShapeConfig, idx: number): string {
  const name = `drift-${idx}`;
  const [d0, d1, d2, d3, d4] = shape.driftX;
  const [y0, y1, y2, y3, y4] = shape.driftY;
  const [s0, s1, s2, s3, s4] = shape.driftScale;
  return `
    @keyframes ${name} {
      0%   { transform: translate(${d0}px, ${y0}px) scale(${s0}) rotate(${shape.rotation}deg); }
      25%  { transform: translate(${d1}px, ${y1}px) scale(${s1}) rotate(${shape.rotation + 8}deg); }
      50%  { transform: translate(${d2}px, ${y2}px) scale(${s2}) rotate(${shape.rotation - 5}deg); }
      75%  { transform: translate(${d3}px, ${y3}px) scale(${s3}) rotate(${shape.rotation + 12}deg); }
      100% { transform: translate(${d4}px, ${y4}px) scale(${s4}) rotate(${shape.rotation}deg); }
    }
  `;
}

// ─── Component ───────────────────────────────────────────────────────────────
interface OrganicBackgroundProps {
  mode: "explore" | "mood" | "landing";
  shapeCount?: number;
}

export function OrganicBackground({ mode, shapeCount = 6 }: OrganicBackgroundProps) {
  // Shapes are randomized once per mount (per page load)
  const shapes = useMemo(() => generateShapes(mode, shapeCount), [mode, shapeCount]);

  const containerRef = useRef<HTMLDivElement>(null);
  const shapeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const smoothPos = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  // Inject CSS keyframes
  useEffect(() => {
    const styleId = `organic-bg-keyframes-${mode}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = shapes.map((s, i) => buildKeyframes(s, i)).join("\n");
    return () => {
      // Don't remove on unmount to avoid flicker on mode switch
    };
  }, [shapes, mode]);

  // Parallax loop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      mousePos.current = {
        x: t.clientX / window.innerWidth,
        y: t.clientY / window.innerHeight,
      };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      smoothPos.current.x = lerp(smoothPos.current.x, mousePos.current.x, 0.05);
      smoothPos.current.y = lerp(smoothPos.current.y, mousePos.current.y, 0.05);

      const dx = (smoothPos.current.x - 0.5) * window.innerWidth;
      const dy = (smoothPos.current.y - 0.5) * window.innerHeight;

      shapeRefs.current.forEach((el, i) => {
        if (!el) return;
        const shape = shapes[i];
        const px = dx * shape.parallaxFactor;
        const py = dy * shape.parallaxFactor;
        el.style.setProperty("--px", `${px}px`);
        el.style.setProperty("--py", `${py}px`);
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [shapes]);

  // Background base color per mode
  const bgBase = mode === "explore"
    ? "#050810"
    : mode === "mood"
    ? "#0D0508"
    : "#080808";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: bgBase }}
    >
      {shapes.map((shape, i) => (
        <div
          key={shape.id}
          ref={(el) => { shapeRefs.current[i] = el; }}
          style={{
            position: "absolute",
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            marginLeft: `-${shape.size / 2}px`,
            marginTop: `-${shape.size / 2}px`,
            background: shape.color,
            borderRadius: getBorderRadius(shape.type),
            filter: `blur(${shape.blur}px)`,
            opacity: shape.opacity,
            mixBlendMode: "screen",
            willChange: "transform",
            animation: `drift-${i} ${shape.driftDuration}s ${shape.driftDelay}s ease-in-out infinite`,
            // CSS var for parallax offset (applied on top of animation)
            transform: `translate(var(--px, 0px), var(--py, 0px))`,
          } as React.CSSProperties}
        />
      ))}

      {/* Subtle vignette overlay to keep edges dark */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />
    </div>
  );
}
