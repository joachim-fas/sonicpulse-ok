# SonicPulse – "Liquid Orb" Alternative Theme Concept

## Kernidee
Ein organisches, lebendiges Hintergrund-System aus weichen, stark geblurrten Formen, die sich 
langsam bewegen und auf Maus/Touch reagieren. Jeder Seitenaufruf zeigt eine andere Komposition.
Karten bekommen Glasmorphismus. Das Gesamtgefühl: wie durch Milchglas auf flüssiges Licht zu schauen.

---

## Shape Library (8 Grundformen, zufällig kombiniert)

Jede Form wird als SVG-Blob oder CSS-clip-path realisiert:

1. **Sphere** – perfekte Kugel (radial-gradient)
2. **Elongated Blob** – gestreckter Tropfen (border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%)
3. **Kidney** – Nierenform (border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%)
4. **Teardrop** – Tränenform (border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%)
5. **Amoeba** – unregelmäßige Amöbe (SVG path, animiert)
6. **Torus Slice** – Ring-Ausschnitt (CSS clip-path ellipse)
7. **Crescent** – Halbmond (zwei überlagerte Kreise, einer subtrahiert)
8. **Plasma** – sehr unregelmäßig, 6-Punkt-Blob (SVG animierter path)

Pro Aufruf werden **5–7 Formen** zufällig aus der Library gewählt, mit zufälliger:
- Größe (200px–600px)
- Position (leicht außerhalb des Viewports erlaubt)
- Rotation (0°–360°)
- Blur-Intensität (60px–120px)
- Opacity (0.4–0.8)
- Animations-Geschwindigkeit (8s–25s)

---

## Farbpaletten pro Mode

### Explore Mode – "Cosmic Deep"
Primärfarben: Cyan (#00D4FF), Electric Blue (#0066FF), Teal (#00B4A0)
Akzente: Violet (#8B5CF6), Mint (#34D399)
Hintergrund-Base: #050810 (sehr tiefes Dunkelblau)
Stimmung: Entdeckung, Weite, Kälte des Weltraums

### Mood Mode – "Emotional Heat"  
Primärfarben: Rose (#FF2D78), Coral (#FF6B35), Magenta (#E040FB)
Akzente: Amber (#FBBF24), Soft Pink (#FFB3C6)
Hintergrund-Base: #0D0508 (sehr tiefes Dunkelrot)
Stimmung: Emotion, Wärme, Intimität

### Landing Page – "Neutral Pulse"
Primärfarben: Cyan + Rose (beide Modes angedeutet)
Hintergrund-Base: #080808

---

## Animation-System

### Drift Animation (immer aktiv)
Jede Form hat eine eigene, leicht unterschiedliche Drift-Animation:
- Langsame Translation (±30–80px) auf X und Y
- Leichte Rotation (±15°)
- Pulsierendes Scale (0.9–1.1)
- Alle Animationen: ease-in-out, infinite, verschiedene Durationen (8–25s)
- Kein Synchronisieren – jede Form läuft auf eigenem Timing

### Mouse/Touch Parallax (reaktiv)
- Jede Form hat einen eigenen Parallax-Faktor (0.02–0.08)
- Tiefere Formen (größer, mehr blur) = langsamere Reaktion (Tiefeneffekt)
- Vordere Formen (kleiner, weniger blur) = schnellere Reaktion
- Smooth interpolation: lerp(current, target, 0.05) per Frame
- Touch: gleiche Logik, letzter Touch-Punkt als Referenz

### Interaction Response
- Mouse-Move: sanfte Parallax-Verschiebung aller Formen
- Click/Tap: kurzer "Pulse" – alle Formen skalieren kurz auf 1.05 und zurück
- Scroll: leichte vertikale Verschiebung (Parallax-Tiefe)

---

## Glassmorphismus Karten (im Liquid Orb Theme)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

Karten-Bilder: leicht erhöhte Sättigung (+20%), damit sie gegen den bunten Hintergrund bestehen.
Text: immer weiß (auch im Light Mode des Liquid Orb Themes, da der Hintergrund immer dunkel ist).

---

## Typography im Liquid Orb Theme

Gleiche Schriften wie Standard-Theme, aber:
- Überschriften: leicht erhöhtes letter-spacing (+0.02em)
- Labels: `text-shadow: 0 0 20px currentColor` für Glow-Effekt
- Akzent-Texte (Mode-Labels, Badges): Glow in Mode-Farbe

---

## Technische Umsetzung

### Komponente: `OrganicBackground.tsx`
- Reines CSS + SVG, kein Canvas (bessere Performance, keine Abhängigkeiten)
- `useRef` für Mouse-Position, `requestAnimationFrame` für Parallax-Loop
- `useMemo` für die zufällige Shape-Selektion (einmal pro Mount)
- `useReducedMotion()` Hook: bei aktiviertem reduced-motion nur statische Formen

### State Management
- `isLiquidTheme: boolean` – neuer State in Home.tsx
- Gespeichert in `localStorage` (persistiert zwischen Besuchen)
- Toggle-Button: Wellen-Icon (🌊) neben dem Sun/Moon-Button

### Performance
- Alle Animationen: CSS `transform` und `opacity` only (GPU-beschleunigt)
- Blur: `will-change: transform` auf jedem Shape-Element
- Max. 7 Shapes gleichzeitig sichtbar

---

## Mode-spezifische Shape-Varianten

### Explore Mode Shapes (Cosmic/Kalt)
Bevorzugte Formen: Sphere, Torus Slice, Elongated Blob
Bewegung: langsamer, ruhiger (Drift 12–25s)
Anordnung: eher am Rand, Mitte frei für Content

### Mood Mode Shapes (Emotional/Warm)
Bevorzugte Formen: Kidney, Amoeba, Plasma, Teardrop
Bewegung: etwas schneller, lebendiger (Drift 8–18s)
Anordnung: mehr im Zentrum, überlappend, intensiver

---

## Konsistenz-Regeln (Look & Feel)

1. Hintergrund ist immer dunkel (kein Light Mode im Liquid Orb Theme)
2. Alle Formen haben immer blur ≥ 60px – nie scharfe Kanten sichtbar
3. Farbpalette pro Mode ist fix – nur Formen und Positionen variieren
4. Glassmorphismus-Karten sind immer gleich (nur Akzentfarbe variiert)
5. Animationen sind immer smooth (ease-in-out, nie linear/bounce)
6. Parallax-Reaktion ist immer subtil (max ±40px Verschiebung)
