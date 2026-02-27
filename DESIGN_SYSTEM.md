# SonicPulse Design System

## Grundprinzip
Jede UI-Entscheidung leitet sich aus zwei Dimensionen ab:
1. **Mode**: `explore` (Cyan/Teal) oder `mood` (Rose/Pink)
2. **Theme**: `dark` oder `light`

Niemals harte Farben ohne diese zwei Dimensionen. Kein Mix aus beiden.

---

## Farbpalette

### Explore Mode – Akzentfarbe: Cyan/Teal
| Verwendung | Dark | Light |
|---|---|---|
| Primär-Gradient (Button, aktive Pill) | `from-cyan-500 to-teal-500` | `from-cyan-600 to-teal-600` |
| Sekundär (Underground Pill) | `bg-cyan-600` | `bg-cyan-700` |
| Tertiär (Exotics Pill) | `from-teal-500 to-emerald-500` | `from-teal-600 to-emerald-600` |
| Akzent-Text | `text-cyan-400` | `text-cyan-600` |
| Akzent-Border | `border-cyan-500/30` | `border-cyan-500/40` |
| Akzent-Glow | `shadow-cyan-500/20` | `shadow-cyan-600/20` |

### Mood Mode – Akzentfarbe: Rose/Pink
| Verwendung | Dark | Light |
|---|---|---|
| Primär-Gradient (Button, aktive Pill) | `from-rose-500 to-pink-500` | `from-rose-600 to-pink-600` |
| Sekundär (Underground Pill) | `bg-rose-600` | `bg-rose-700` |
| Tertiär (Exotic Pill) | `from-violet-500 to-fuchsia-500` | `from-violet-600 to-fuchsia-600` |
| Akzent-Text | `text-rose-400` | `text-rose-600` |
| Akzent-Border | `border-rose-500/30` | `border-rose-500/40` |
| Akzent-Glow | `shadow-rose-500/20` | `shadow-rose-600/20` |

---

## Neutrale Farben (mode-unabhängig)

### Dark Theme
| Token | Wert | Verwendung |
|---|---|---|
| `bg-page` | `bg-zinc-950` | Seiten-Hintergrund |
| `bg-card` | `bg-zinc-900/40` | Karten, Panels |
| `bg-card-hover` | `bg-zinc-900/60` | Hover-Zustand |
| `bg-input` | `bg-zinc-950` | Input-Felder |
| `bg-pill-track` | `bg-black/50` | Pill-Container |
| `border-subtle` | `border-white/8` | Subtile Borders |
| `border-card` | `border-white/10` | Karten-Border |
| `text-primary` | `text-white` | Haupttext |
| `text-secondary` | `text-white/70` | Sekundärtext |
| `text-muted` | `text-white/40` | Labels, Hints |
| `text-placeholder` | `text-white/25` | Placeholder |

### Light Theme
| Token | Wert | Verwendung |
|---|---|---|
| `bg-page` | `bg-zinc-50` | Seiten-Hintergrund |
| `bg-card` | `bg-white` | Karten, Panels |
| `bg-card-hover` | `bg-zinc-50` | Hover-Zustand |
| `bg-input` | `bg-white` | Input-Felder |
| `bg-pill-track` | `bg-zinc-100` | Pill-Container |
| `border-subtle` | `border-zinc-200` | Subtile Borders |
| `border-card` | `border-zinc-200` | Karten-Border |
| `text-primary` | `text-zinc-900` | Haupttext |
| `text-secondary` | `text-zinc-600` | Sekundärtext |
| `text-muted` | `text-zinc-400` | Labels, Hints |
| `text-placeholder` | `text-zinc-300` | Placeholder |

---

## Komponenten-Regeln

### Navbar
- Dark: `bg-black/80 backdrop-blur border-b border-white/8`
- Light: `bg-white/90 backdrop-blur border-b border-zinc-200`
- Logo: immer `text-white` auf dunklem Hintergrund-Pill mit Mode-Akzent
- Mode-Switcher: aktiver Tab hat Mode-Akzent-Gradient + `text-white`; inaktiver Tab: neutral muted
- Theme-Toggle: Icon `Sun`/`Moon`, neutral muted, hover primary

### Mode-Switcher (Explore/Mood Tab)
- Container: `bg-black/30 rounded-full p-1` (dark) / `bg-zinc-100 rounded-full p-1` (light)
- Aktiver Tab: `bg-gradient-to-r {mode-primary-gradient} text-white shadow-lg`
- Inaktiver Tab: `text-muted hover:text-secondary`

### Input-Card (Discovery Filter + CTA)
- Container: `bg-card border-card rounded-[28px] p-5 md:p-6`
- Discovery Label: `text-[8px] uppercase tracking-widest text-muted`
- Pill-Track: `bg-pill-track border-subtle rounded-full p-1`
- Aktive Pill: Mode-Gradient (Mainstream = primär, Underground = sekundär, Exotics/Exotic = tertiär)
- Inaktive Pill: `text-muted hover:text-primary`
- CTA-Button: `bg-gradient-to-r {mode-primary-gradient} text-white rounded-full px-8 py-3 font-medium text-xs uppercase tracking-widest hover:opacity-90 active:scale-95`

### ArtistInput (Explore)
- Container: `bg-input border border-card-border rounded-2xl`
- Dark: `bg-zinc-950 border-white/10 text-white placeholder:text-white/25`
- Light: `bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-300`
- Focus: `focus:border-{mode-accent}/50 focus:ring-1 focus:ring-{mode-accent}/20`
- Dropdown: gleiche Hintergrundfarbe wie Input, `border-card-border`

### Textarea (Mood)
- Dark: `bg-zinc-950 border-rose-500/20 text-white/90 placeholder:text-white/25 focus:border-rose-400/50`
- Light: `bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-300 focus:border-rose-300`

### Ergebniskarten (Explore + Mood – IDENTISCH außer Akzentfarbe)
- Container: `bg-card border-card rounded-[24px] overflow-hidden`
- Bild-Bereich: 16:10 Aspect-Ratio, `object-cover`, Overlay `bg-gradient-to-t from-black/80 via-black/20 to-transparent`
- Kein Bild: `bg-gradient-to-br from-zinc-800 to-zinc-900` (dark) / `from-zinc-100 to-zinc-200` (light) + zentriertes Icon
- Künstlername im Overlay: `text-white font-bold` (IMMER weiß, da Overlay immer dunkel)
- Genre-Badge im Overlay: `bg-black/60 text-white/90 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full`
- Card-Body: `p-4 space-y-3`
- Beschreibungstext: `text-secondary text-sm leading-relaxed line-clamp-3`
- "Similar to"-Label: `text-muted text-[9px] uppercase tracking-widest`
- Tags: `bg-card border-subtle text-muted text-[9px] rounded-full px-2 py-0.5`
- Player-Toggle: Mode-Akzent (SpotifyEmbedCard/YouTubeEmbedCard bereits korrekt)

### Emotional Profile Card (Mood)
- Dark: `bg-zinc-900/40 border-rose-500/20`
- Light: `bg-rose-50 border-rose-200`
- Titel: `text-rose-{400|600}` je nach Theme
- Lyric: `text-secondary italic`

### Navbar Spotify-Logout-Button
- Dark: `bg-zinc-800 text-white/70 hover:bg-zinc-700`
- Light: `bg-zinc-100 text-zinc-600 hover:bg-zinc-200`

### Footer
- Dark: `text-white/20`
- Light: `text-zinc-400`

---

## Typografie
- Überschriften: `font-bold` oder `font-semibold`
- Labels/Badges: `text-[8px] md:text-[9px] uppercase tracking-widest font-medium`
- Body: `text-sm font-light leading-relaxed`
- Buttons: `text-xs uppercase tracking-widest font-medium`

---

## Abstände & Radien
- Seiten-Padding: `px-4 md:px-6`
- Karten-Radius: `rounded-[24px]`
- Input-Card-Radius: `rounded-[28px]`
- Input-Radius: `rounded-2xl`
- Pill-Radius: `rounded-full`
- Button-Radius: `rounded-full`
- Karten-Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`
