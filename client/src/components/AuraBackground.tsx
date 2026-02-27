import { useEffect, useRef, useMemo } from "react";

// ─── Konzept: "Aura" ─────────────────────────────────────────────────────────
// Inspiriert von hochsaturierten Farbblob-Kunstwerken (Referenzbild):
// - Heller/neutraler Hintergrund (#F5F5F0 / #FAFAF8)
// - Neon-gesättigte Blobs mit starkem Glow
// - Metaball-Verschmelzung via SVG feTurbulence + feColorMatrix (Goo-Filter)
// - Blobs folgen dem Cursor mit Feder-Physik (spring dynamics)
// - Touch: mehrere Blobs reagieren auf Touch-Punkte
// - Explore: Acid-Palette (Neon-Gelb, Cyan, Blau, Grün)
// - Mood: Heat-Palette (Magenta, Orange, Koralle, Rot)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Paletten ────────────────────────────────────────────────────────────────
const EXPLORE_PALETTE = [
  { h: 280, s: 100, l: 60 },  // Neon-Violett
  { h: 190, s: 100, l: 55 },  // Cyan
  { h: 230, s: 100, l: 60 },  // Neon-Blau
  { h: 160, s: 100, l: 50 },  // Neon-Grün
  { h: 200, s: 100, l: 65 },  // Hellblau
  { h: 260, s: 90,  l: 65 },  // Lavendel-Neon
];

const MOOD_PALETTE = [
  { h: 320, s: 100, l: 55 },  // Neon-Magenta
  { h: 350, s: 100, l: 60 },  // Hot Pink
  { h: 15,  s: 100, l: 58 },  // Neon-Orange
  { h: 340, s: 90,  l: 65 },  // Koralle
  { h: 0,   s: 100, l: 60 },  // Neon-Rot
  { h: 280, s: 100, l: 60 },  // Lila-Pink
];

const LANDING_PALETTE = [
  { h: 320, s: 100, l: 55 },  // Magenta
  { h: 190, s: 100, l: 55 },  // Cyan
  { h: 15,  s: 100, l: 58 },  // Orange
  { h: 230, s: 100, l: 60 },  // Blau
  { h: 160, s: 100, l: 50 },  // Grün
];

// ─── Blob-Physik ──────────────────────────────────────────────────────────────
interface Blob {
  // Aktuelle Position (gerendert)
  x: number;
  y: number;
  // Zielposition (Drift-Animation)
  targetX: number;
  targetY: number;
  // Geschwindigkeit (Feder-Physik)
  vx: number;
  vy: number;
  // Eigenschaften
  radius: number;
  color: { h: number; s: number; l: number };
  alpha: number;
  // Drift-Waypoints
  driftPoints: { x: number; y: number }[];
  driftIdx: number;
  driftTimer: number;
  driftInterval: number;
  // Mouse-Attraktion
  attractionStrength: number;
  // Puls-Animation
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmp: number;
}

function createBlobs(
  mode: "explore" | "mood" | "landing",
  count: number,
  w: number,
  h: number
): Blob[] {
  const palette = mode === "explore" ? EXPLORE_PALETTE : mode === "mood" ? MOOD_PALETTE : LANDING_PALETTE;
  const blobs: Blob[] = [];

  for (let i = 0; i < count; i++) {
    const colorBase = palette[i % palette.length];
    // Leichte Hue-Variation pro Blob
    const color = {
      h: (colorBase.h + (Math.random() - 0.5) * 30 + 360) % 360,
      s: colorBase.s,
      l: colorBase.l + (Math.random() - 0.5) * 10,
    };

    const x = w * (0.1 + Math.random() * 0.8);
    const y = h * (0.1 + Math.random() * 0.8);

    // Drift-Waypoints: 5 zufällige Punkte im Canvas
    const driftPoints = Array.from({ length: 5 }, () => ({
      x: w * (0.05 + Math.random() * 0.9),
      y: h * (0.05 + Math.random() * 0.9),
    }));

    blobs.push({
      x, y,
      targetX: x,
      targetY: y,
      vx: 0,
      vy: 0,
      radius: (mode === "mood" ? 120 : 100) + Math.random() * 160,
      color,
      alpha: 0.75 + Math.random() * 0.20,
      driftPoints,
      driftIdx: 0,
      driftTimer: 0,
      driftInterval: (mode === "mood" ? 2500 : 3500) + Math.random() * 3000,
      attractionStrength: 0.15 + Math.random() * 0.25,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.012,
      pulseAmp: 0.06 + Math.random() * 0.08,
    });
  }

  return blobs;
}

// ─── Komponente ───────────────────────────────────────────────────────────────
interface AuraBackgroundProps {
  mode: "explore" | "mood" | "landing";
  blobCount?: number;
}

export function AuraBackground({ mode, blobCount = 5 }: AuraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<Blob[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const filterId = `aura-goo-${mode}`;

  // Blobs einmalig beim Mount erstellen
  const initialMode = useMemo(() => mode, []); // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Blobs neu erstellen wenn Canvas-Größe sich ändert
      blobsRef.current = createBlobs(mode, blobCount, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mode, blobCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Mouse/Touch Tracking ──────────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      mouseRef.current = { x: t.clientX, y: t.clientY, active: true };
    };
    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    // ── Animation Loop ────────────────────────────────────────────────────
    const SPRING_STIFFNESS = 0.04;
    const SPRING_DAMPING   = 0.82;
    const MOUSE_RADIUS     = 280;

    const tick = (time: number) => {
      const dt = Math.min(time - lastTimeRef.current, 50); // cap at 50ms
      lastTimeRef.current = time;

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const blobs = blobsRef.current;
      const mouse = mouseRef.current;

      for (const blob of blobs) {
        // ── Drift-Ziel aktualisieren ──────────────────────────────────────
        blob.driftTimer += dt;
        if (blob.driftTimer >= blob.driftInterval) {
          blob.driftTimer = 0;
          blob.driftIdx = (blob.driftIdx + 1) % blob.driftPoints.length;
        }
        const drift = blob.driftPoints[blob.driftIdx];

        // ── Mouse-Attraktion ──────────────────────────────────────────────
        let tx = drift.x;
        let ty = drift.y;

        if (mouse.active) {
          const dx = mouse.x - blob.x;
          const dy = mouse.y - blob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS) {
            const influence = (1 - dist / MOUSE_RADIUS) * blob.attractionStrength;
            tx = drift.x * (1 - influence) + mouse.x * influence;
            ty = drift.y * (1 - influence) + mouse.y * influence;
          }
        }

        // ── Feder-Physik ──────────────────────────────────────────────────
        const ax = (tx - blob.x) * SPRING_STIFFNESS;
        const ay = (ty - blob.y) * SPRING_STIFFNESS;
        blob.vx = (blob.vx + ax) * SPRING_DAMPING;
        blob.vy = (blob.vy + ay) * SPRING_DAMPING;
        blob.x += blob.vx;
        blob.y += blob.vy;

        // ── Puls-Radius ───────────────────────────────────────────────────
        blob.pulsePhase += blob.pulseSpeed;
        const pulsedRadius = blob.radius * (1 + Math.sin(blob.pulsePhase) * blob.pulseAmp);

        // ── Blob zeichnen (radialer Gradient) ─────────────────────────────
        const { h, s, l } = blob.color;
        const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, pulsedRadius);
        grad.addColorStop(0,   `hsla(${h}, ${s}%, ${l}%, ${blob.alpha})`);
        grad.addColorStop(0.4, `hsla(${h}, ${s}%, ${l + 5}%, ${blob.alpha * 0.7})`);
        grad.addColorStop(0.75,`hsla(${h}, ${s}%, ${l + 10}%, ${blob.alpha * 0.25})`);
        grad.addColorStop(1,   `hsla(${h}, ${s}%, ${l + 15}%, 0)`);

        ctx.save();
        ctx.filter = `url(#${filterId})`;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, pulsedRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mode, filterId]);

  // Hintergrundfarbe je nach Modus
  const bgColor = mode === "explore"
    ? "#F0F4F8"   // Kühles Off-White mit Blau-Stich
    : mode === "mood"
    ? "#F8F0F4"   // Warmes Off-White mit Rosa-Stich
    : "#F5F5F0";  // Neutrales Warm-White

  return (
    <>
      {/* SVG Goo-Filter: erzeugt Metaball-Verschmelzung */}
      <svg
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            {/* Weichzeichnen → Schwellenwert → Metaball-Effekt */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 22 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000"
        style={{ backgroundColor: bgColor }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Leichtes Noise-Overlay für Papier-Textur */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
          }}
        />

        {/* Subtile Vignette an den Rändern */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 50%, rgba(200,200,200,0.15) 100%)",
          }}
        />
      </div>
    </>
  );
}
