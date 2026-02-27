import { useEffect, useRef } from "react";

// ─── Farbpaletten inspiriert von den Referenzbildern ────────────────────────
// Explore: Violet/Mint (Bild 1) + Blau/Cyan Shapes (Bilder 11, 12)
// Mood: Pink/Orange/Teal Mesh (Bild 7) + Magenta/Orange Shapes (Bilder 9, 13)
// Landing: Soft Glow (Bild 6, 11) in Grün/Blau

type GrainMode = "explore" | "mood" | "landing";

interface MeshColor {
  stops: string[]; // CSS gradient color stops
}

interface HalftoneShape {
  x: number;       // 0–1 normalized
  y: number;
  r: number;       // radius in px
  color: string;
  opacity: number;
  vx: number;      // velocity
  vy: number;
  pulsePhase: number;
  pulseSpeed: number;
}

const PALETTES: Record<GrainMode, { mesh: string[]; shapes: string[]; bg: string }> = {
  explore: {
    // Violet → Mint → Teal (Bild 1 + Bild 12)
    mesh: ["#7B2FBE", "#00E5CC", "#3B82F6", "#00C9A7", "#6366F1"],
    shapes: ["#3B82F6", "#06B6D4", "#00E5CC", "#6366F1", "#0EA5E9"],
    bg: "#5B21B6",
  },
  mood: {
    // Hot Pink → Orange → Teal (Bild 7 + Bild 9 + Bild 13)
    mesh: ["#FF2D78", "#FF6B00", "#00BFA5", "#FF4081", "#E91E63"],
    shapes: ["#FF2D78", "#FF6B00", "#E91E63", "#FF4081", "#F97316"],
    bg: "#C2185B",
  },
  landing: {
    // Soft Glow: Neon-Grün + Blau/Lavendel (Bild 6 + Bild 11)
    mesh: ["#00FF88", "#3B82F6", "#A855F7", "#00E5CC", "#22D3EE"],
    shapes: ["#00FF88", "#22D3EE", "#A855F7", "#3B82F6", "#00BFA5"],
    bg: "#1E40AF",
  },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function GrainBackground({
  mode = "landing",
  shapeCount = 3,
}: {
  mode?: GrainMode;
  shapeCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<HalftoneShape[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const mouseTargetRef = useRef({ x: 0.5, y: 0.5 });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const prevModeRef = useRef<GrainMode>(mode);
  const blendRef = useRef(0); // 0 = old mode, 1 = new mode

  // ─── Init shapes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const palette = PALETTES[mode];
    shapesRef.current = Array.from({ length: shapeCount }, (_, i) => ({
      x: 0.15 + (i / shapeCount) * 0.7 + (Math.random() - 0.5) * 0.2,
      y: 0.15 + Math.random() * 0.7,
      r: 180 + Math.random() * 220,
      color: palette.shapes[i % palette.shapes.length],
      opacity: 0.75 + Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00012,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.003 + Math.random() * 0.004,
    }));
  }, [mode, shapeCount]);

  // ─── Mode transition ──────────────────────────────────────────────────────
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      blendRef.current = 0;
    }
  }, [mode]);

  // ─── Mouse/Touch tracking ─────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseTargetRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      mouseTargetRef.current = {
        x: t.clientX / window.innerWidth,
        y: t.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // ─── Grain canvas (static, generated once) ───────────────────────────────
  useEffect(() => {
    const gc = grainCanvasRef.current;
    if (!gc) return;
    const w = 512;
    const h = 512;
    gc.width = w;
    gc.height = h;
    const ctx = gc.getContext("2d")!;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = Math.random() * 38; // very subtle: 0–15% opacity
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // ─── Main render loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      timeRef.current += 1;
      const t = timeRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Smooth mouse
      mouseRef.current.x = lerp(mouseRef.current.x, mouseTargetRef.current.x, 0.025);
      mouseRef.current.y = lerp(mouseRef.current.y, mouseTargetRef.current.y, 0.025);

      // Blend towards 1
      blendRef.current = Math.min(1, blendRef.current + 0.012);

      const palette = PALETTES[mode];

      // ── 1. Mesh Gradient Background ──────────────────────────────────────
      // Animierter Mesh-Gradient: mehrere radiale Gradienten die sich langsam bewegen
      // Inspiriert von Bild 1 (Violet/Mint), Bild 5 (Aurora), Bild 7 (Pink/Teal)

      const meshColors = palette.mesh;
      const bgRgb = hexToRgb(palette.bg);
      ctx.fillStyle = `rgb(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]})`;
      ctx.fillRect(0, 0, W, H);

      // Animierte Mesh-Punkte (langsam, fließend)
      const meshPoints = [
        {
          x: (0.3 + Math.sin(t * 0.003) * 0.2 + mouseRef.current.x * 0.15) * W,
          y: (0.2 + Math.cos(t * 0.004) * 0.15) * H,
          color: meshColors[0],
          r: W * 0.7,
        },
        {
          x: (0.7 + Math.cos(t * 0.0025) * 0.2 + mouseRef.current.x * -0.1) * W,
          y: (0.3 + Math.sin(t * 0.003) * 0.2) * H,
          color: meshColors[1],
          r: W * 0.65,
        },
        {
          x: (0.5 + Math.sin(t * 0.0035 + 1) * 0.25) * W,
          y: (0.7 + Math.cos(t * 0.003) * 0.2 + mouseRef.current.y * 0.1) * H,
          color: meshColors[2],
          r: W * 0.6,
        },
        {
          x: (0.15 + Math.cos(t * 0.002) * 0.1) * W,
          y: (0.6 + Math.sin(t * 0.004 + 2) * 0.2) * H,
          color: meshColors[3],
          r: W * 0.5,
        },
        {
          x: (0.85 + Math.sin(t * 0.003 + 3) * 0.1) * W,
          y: (0.8 + Math.cos(t * 0.0025) * 0.15) * H,
          color: meshColors[4 % meshColors.length],
          r: W * 0.45,
        },
      ];

      // Zeichne jeden Mesh-Punkt als radialen Gradienten mit multiply/screen blending
      ctx.globalCompositeOperation = "screen";
      for (const mp of meshPoints) {
        const [r, g, b] = hexToRgb(mp.color);
        const grad = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, mp.r);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.65)`);
        grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.3)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";

      // ── 2. Halftone/Grain Shapes ──────────────────────────────────────────
      // Organische Formen mit Halftone-Textur (wie Bilder 2, 3, 9, 10, 11, 12, 13)
      for (const shape of shapesRef.current) {
        // Bewege Shape
        shape.x += shape.vx;
        shape.y += shape.vy;
        // Bounce
        if (shape.x < 0.05 || shape.x > 0.95) shape.vx *= -1;
        if (shape.y < 0.05 || shape.y > 0.95) shape.vy *= -1;

        // Puls
        shape.pulsePhase += shape.pulseSpeed;
        const pulseFactor = 1 + Math.sin(shape.pulsePhase) * 0.12;
        const r = shape.r * pulseFactor;

        const cx = shape.x * W;
        const cy = shape.y * H;
        const [sr, sg, sb] = hexToRgb(shape.color);

        // Halftone-Effekt: Viele kleine Kreise die einen größeren Kreis formen
        // Inspiriert von den Referenzbildern (Bild 2, 3, 9, 10, 11, 12, 13)
        const dotSpacing = 6; // Abstand zwischen Dots
        const cols = Math.ceil((r * 2) / dotSpacing);
        const rows = Math.ceil((r * 2) / dotSpacing);

        ctx.save();
        // Weicher Spray-Schatten um die Form (wie Bild 10 – roter Spray)
        const sprayGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.6);
        sprayGrad.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, 0.25)`);
        sprayGrad.addColorStop(1, `rgba(${sr}, ${sg}, ${sb}, 0)`);
        ctx.fillStyle = sprayGrad;
        ctx.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);

        // Halftone dots
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const dx = (col - cols / 2) * dotSpacing;
            const dy = (row - rows / 2) * dotSpacing;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > r) continue;

            // Dot-Größe: größer in der Mitte, kleiner am Rand (wie echtes Halftone)
            const normalizedDist = dist / r;
            const dotSize = dotSpacing * 0.38 * (1 - normalizedDist * 0.6);
            if (dotSize < 0.5) continue;

            // Opacity: hoch in der Mitte, niedrig am Rand
            const dotOpacity = shape.opacity * (1 - normalizedDist * 0.7);

            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${dotOpacity})`;
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // ── 3. Mouse-Reaktiver Glow ───────────────────────────────────────────
      // Kleiner, heller Glow-Punkt der dem Cursor folgt
      const mx = mouseRef.current.x * W;
      const my = mouseRef.current.y * H;
      const glowColor = mode === "mood" ? "#FF2D78" : mode === "explore" ? "#00E5CC" : "#00FF88";
      const [gr, gg, gb] = hexToRgb(glowColor);
      const mouseGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 180);
      mouseGrad.addColorStop(0, `rgba(${gr}, ${gg}, ${gb}, 0.18)`);
      mouseGrad.addColorStop(1, `rgba(${gr}, ${gg}, ${gb}, 0)`);
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, W, H);

      // ── 4. Grain Overlay ──────────────────────────────────────────────────
      // Statisches Grain-Canvas wird als Textur über alles gelegt
      const gc = grainCanvasRef.current;
      if (gc) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.globalCompositeOperation = "overlay";
        // Tile das Grain-Canvas
        const pattern = ctx.createPattern(gc, "repeat");
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <>
      {/* Grain-Textur Canvas (unsichtbar, wird als Pattern genutzt) */}
      <canvas ref={grainCanvasRef} style={{ display: "none" }} />
      {/* Haupt-Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
}
