# Spotify Artist Enrichment App – TODO

## Phase 1: Setup
- [x] Projekt initialisiert
- [x] Secrets setzen (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, DISCOGS_TOKEN)
- [x] Datenbankschema: artists-Cache-Tabelle anlegen
- [x] Migration ausführen

## Phase 2: Backend
- [x] Spotify Token-Caching (getSpotifyToken Hilfsfunktion)
- [x] Spotify Search API Integration (searchArtist)
- [x] Discogs Artist API Integration (getDiscogsArtist)
- [x] LLM-basierte Künstlerempfehlungen (getAIRecommendations)
- [x] tRPC Router: artist.search Prozedur
- [x] tRPC Router: artist.recommendations Prozedur
- [x] tRPC Router: artist.discogs Prozedur
- [x] tRPC Router: artist.cached (gespeicherte Künstler abrufen)

## Phase 3: Frontend
- [x] Globales Styling (Dark Theme, Spotify-Grün, elegante Typografie)
- [x] Mobile-First Layout in App.tsx
- [x] Suchfeld mit Debounce
- [x] ArtistCard Komponente (Bild, Name, Deep-Link, Genres)
- [x] KI-Empfehlungen Sektion
- [x] Discogs-Daten Sektion (Diskografie, Biografie)
- [x] Fehlerbehandlung & Fallbacks (keine kaputten Links)
- [x] Loading-States und Skeleton-Animationen

## Phase 4: Qualität
- [x] Vitest-Tests für Spotify-Logik
- [x] Vitest-Tests für tRPC-Router
- [x] Checkpoint erstellen

## Bugfixes
- [x] Spotify invalid_client Fehler beheben (Client Secret korrigiert auf echten Hex-Wert aus Spotify Dashboard)

## Pre-Listening Feature
- [x] Backend: Spotify Top-Tracks Endpunkt (GET /artists/{id}/top-tracks)
- [x] Backend: tRPC-Prozedur artist.topTrack
- [x] Frontend: AudioPlayer-Komponente mit Play/Pause, Fortschrittsbalken, Track-Info
- [x] Frontend: Integration in ArtistCard unterhalb der Hauptinfos
- [x] Fallback wenn kein Preview verfügbar (Hinweis statt kaputter Button)

## Pre-Listening Neuimplementierung
- [ ] Diagnose: Preview-URL von Spotify API live testen
- [ ] AudioPlayer komplett neu schreiben (robuste Audio-Logik)
- [ ] CORS/Autoplay-Probleme behandeln
- [ ] Live-Test mit echtem Künstler

## Spotify Embed Pre-Listening
- [x] AudioPlayer.tsx durch SpotifyEmbed.tsx ersetzen (iframe-basiert, kein API-Token nötig)
- [x] Embed in Home.tsx einbinden
- [x] Visuell elegant in Dark Theme integrieren

## MusicBrainz Fallback (Spotify 403 Fix)
- [x] Diagnose: Spotify 403 Fehlerursache bestimmen (Development Mode / Quota)
- [x] MusicBrainz-Fallback implementieren (liefert Spotify-ID ohne API-Token)
- [x] SpotifyEmbed-Komponente mit robustem iframe-Rendering (display:none → block nach onLoad)
- [x] Vitest-Tests für MusicBrainz-Fallback (5 Tests bestanden)
- [x] Alle 14 Tests bestanden (Spotify + MusicBrainz + Auth)

## Echte Artist-IDs (kein Search-Link)
- [x] Backend: MusicBrainz als primäre ID-Quelle (kein Spotify-Search-Fallback mehr)
- [x] Backend: Spotify API nur wenn Token vorhanden und kein 403
- [x] Backend: Wenn keine ID gefunden → null zurückgeben, kein Link konstruieren
- [x] Frontend: Alle Links prüfen – kein open.spotify.com/search/ erlaubt
- [x] Frontend: KI-Empfehlungen über MusicBrainz validieren
- [x] Frontend: Fallback-UI wenn keine ID gefunden (neutraler Text, kein Link)
- [x] Tests aktualisieren (23 Tests bestanden)

## SonicPulse Rebuild
- [x] Backend: MusicBrainz Artist-Suche Endpunkt (/api/musicbrainz/search)
- [x] Backend: Spotify Artist-Enrichment Endpunkt (Bild, URL, Preview)
- [x] Backend: Spotify Track-Enrichment Endpunkt (für Party Mode)
- [x] Backend: tRPC Prozeduren für Explore und Party Mode
- [x] Frontend: Landing Page mit animiertem Hintergrund (Explore/Party Auswahl)
- [x] Frontend: Explore Mode (3 Band-Inputs, Discovery-Level, KI-Empfehlungen)
- [x] Frontend: Party Mode (Künstler-Inputs, Energy-Level, Track-Slider, Playlist)
- [x] Frontend: MusicBrainz Autocomplete-Dropdown
- [x] Frontend: Recommendations Grid mit Bild, Genre, Reason, Spotify-Link
- [x] Frontend: Party Playlist mit Track-Karten und Audio-Preview
- [x] Frontend: Spotify-Status-Indikator in Navbar
- [x] Frontend: Info-Modals (Privacy, Terms, Spotify API)
- [x] Frontend: Footer mit Links
- [x] canvas-confetti installiert

## Web Playback SDK
- [ ] Backend: OAuth Authorization Code Flow mit PKCE (getAuthUrl, exchangeToken, refreshToken)
- [ ] Backend: Spotify Player API – play track by URI (PUT /me/player/play)
- [ ] Frontend: SpotifyAuthButton – Login-Flow starten
- [ ] Frontend: SpotifyPlayer-Komponente mit Web Playback SDK (sdk.scdn.co/spotify-player.js)
- [ ] Frontend: Play/Pause, Seek, Volume Controls
- [ ] Frontend: Track-Info (Titel, Album-Cover, Künstler)
- [ ] Integration in SonicPulse Artist-Karten
- [ ] Redirect URI im Spotify Dashboard eintragen

## Spotify Embed (Option 1 – kein Login/Premium)
- [x] SpotifyEmbedCard-Komponente: aufklappbarer iframe mit artist_id
- [x] Integration in Explore Recommendation-Karten
- [x] Integration in Party-Karten
- [x] Elegante Aufklapp-Animation mit framer-motion
- [x] Fallback wenn keine spotify_id vorhanden

## Bereinigung: OAuth/SDK entfernen
- [x] Backend: spotifyAuth.ts entfernen
- [x] Backend: spotifyOAuthRoutes.ts entfernen
- [x] Backend: OAuth-Routen aus server/_core/index.ts entfernen
- [x] Frontend: SpotifyPlayerContext.tsx entfernen
- [x] Frontend: useSpotifyPlayer.ts entfernen
- [x] Frontend: SpotifyPlayer.tsx entfernen
- [x] Frontend: Connect-Button und ArtistPlayButton aus Home.tsx entfernen
- [x] Frontend: SpotifyPlayerProvider aus App.tsx entfernen

## Künstlerbilder
- [x] Diagnose: Warum fehlen Bilder (image_url = null bei MusicBrainz/Wikidata)
- [x] Bild-Fallback-Kette: Discogs als Fallback wenn Spotify 403 gibt
- [x] Bilder in Explore-Karten anzeigen
- [x] Bilder in Party-Karten anzeigen

## Party Mode Playlist-Link
- [x] Spotify Deep-Link auf jeder Track-Karte im Party Mode einbauen
- [x] Link führt direkt zum Künstler-Profil (open.spotify.com/artist/{id})
- [x] Fallback: kein Link wenn keine spotify_id vorhanden

## Party Mode – Zusammengefasste Playlist öffnen
- [ ] Spotify Track-IDs für alle Songs in der Playlist beschaffen (via MusicBrainz/Wikidata)
- [ ] "Playlist auf Spotify öffnen"-Button über der Trackliste
- [ ] Fallback: Playlist als Text kopieren wenn keine Track-IDs verfügbar

## Spotify Playlist-Generierung (OAuth)
- [x] Backend: OAuth Authorization Code Flow mit Scope playlist-modify-public
- [x] Backend: /api/spotify/auth Route (Login-Redirect)
- [x] Backend: /api/spotify/callback Route (Token-Austausch)
- [x] Backend: tRPC Prozedur spotify.createPlaylist (Track-Suche + Playlist erstellen)
- [x] Frontend: "Mit Spotify verbinden"-Button im Party Mode
- [x] Frontend: "Playlist auf Spotify erstellen"-Button nach Playlist-Generierung
- [x] Frontend: Erfolgs-Feedback mit Link zur erstellten Playlist
- [x] Frontend: Logout-Möglichkeit

## Mood Mode (Emotionale Intelligenz)
- [x] Backend: tRPC-Prozedur sonicpulse.mood – Freitext-Analyse mit emotionaler KI
- [x] Backend: Emotionale Tiefenanalyse (Anlass, Kernemotion, Intensität, Subtext)
- [x] Backend: Song-Empfehlungen mit emotionaler Begründung (warum dieser Song für diesen Moment)
- [x] Backend: Artist-Enrichment für Mood-Songs (Spotify-ID, Bild, Embed)
- [x] Frontend: Mood Mode als dritter Tab in der Navbar
- [x] Frontend: Freitext-Eingabe mit Placeholder-Beispielen (Anlass/Emotion)
- [x] Frontend: Emotionsprofil-Karte (KI-Analyse des Textes visualisieren)
- [x] Frontend: Song-Karten mit emotionaler Begründung und SpotifyEmbedCard
- [x] Frontend: "Als Playlist speichern"-Button (Spotify OAuth)
- [x] Frontend: Mood-Intensitäts-Indikator (visuell)

## Language & Consistency Polish
- [x] UI: Alle deutschen Texte auf Englisch umstellen (Buttons, Labels, Placeholders, Modals)
- [x] UI: Mode-übergreifende Funktionen konsistent machen (Spotify Connect, Save Playlist, Success Modal)
- [x] Mood Mode: Song-Anzahl auf 3 reduzieren (Default + Max)
- [x] Mood Mode: Musikalische Referenz-Option hinzufügen (Artist/Band als Stilreferenz, nicht inhaltlich)
- [x] Backend: mood-Prozedur um optionales musicReference-Feld erweitern

## Mood Mode – Pre-Listening
- [x] Backend: Spotify Track-ID für jeden Mood-Song ermitteln (searchSpotifyTrack)
- [x] Backend: Track-Embed-URL in mood-Antwort zurückgeben (spotify:track:{id})
- [x] Frontend: SpotifyEmbedCard auf Track-Embed umstellen (track statt artist)
- [x] Frontend: Compact Track-Embed direkt unter jedem Song-Card im Mood Mode
- [x] Frontend: Fallback wenn kein Track gefunden (Artist-Embed als Backup)

## Mood Mode – Pre-Listening direkt integriert
- [x] Track-Embed direkt in Song-Card sichtbar (kein Toggle, defaultOpen=true oder inline iframe)
- [x] Embed lädt automatisch beim Erscheinen der Song-Cards

## Mood Mode – UX Redesign & Discovery Filter
- [x] Backend: discoveryFilter (mainstream/underground/exotic) in mood-Prozedur
- [x] Frontend: Mood Mode UX vereinfachen – klarer Input-Flow, weniger Schritte
- [x] Frontend: Discovery-Filter als 3 Toggle-Buttons (mainstream / underground / exotic)
- [x] Frontend: Musical Reference als optionaler Collapse statt immer sichtbar
- [x] Frontend: Emotional Profile kompakter darstellen
- [x] Frontend: Song-Cards schlanker – weniger Text, mehr Musik

## Party Mode – Clean Playlist View
- [x] Party Mode: Alle Spotify-Connect/Save-Elemente entfernen (FloatingSaveButton, SpotifySaveSection)
- [x] Party Mode: Nur kuratierte Playlist anzeigen, kein OAuth-Flow

## Party Mode – Pre-Listening
- [x] Backend: party-Prozedur um trackId/trackUrl erweitern (searchSpotifyTrack)
- [x] Frontend: Track-Embed direkt unter jede Party-Track-Card (80px iframe, kein Toggle)
- [x] Frontend: Fallback auf Artist-Embed wenn kein Track gefunden

## Party Mode entfernen
- [x] Backend: party-Prozedur aus sonicpulse.ts entfernen
- [x] Frontend: Party Mode Tab aus Navigation entfernen
- [x] Frontend: Party Mode State-Variablen entfernen (partyArtists, partyLength, partyEnergy, partyPlaylist, etc.)
- [x] Frontend: Party Mode UI-Bereich aus Home.tsx entfernen
- [x] Frontend: mode-Typ auf "explore" | "mood" reduzieren
- [x] Tests: Party-bezogene Tests entfernen oder anpassen

## Explore Mode – ArtistInput Autocomplete Fix
- [x] Bug: Auswahl aus Dropdown funktioniert nicht konstant (Race Condition / onBlur schließt vor onClick)
- [x] Fix: e.preventDefault() auf Dropdown-Item verhindert Input-Blur
- [x] Fix: mouseDownOnDropdown-Guard verhindert vorzeitiges Schließen
- [x] Fix: AbortController für ausstehende Fetch-Requests beim Tippen
- [x] Fix: Dropdown-State nach Auswahl korrekt zurücksetzen

## Loading State Redesign
- [x] Animierter Ladebalken mit witzigen Musik-Nachrichten (statt Skeleton-Flächen)
- [x] Explore Mode: eigene Nachrichten-Sequenz
- [x] Mood Mode: eigene Nachrichten-Sequenz
- [x] Ladebalken-Komponente mit Framer Motion

## Pre-Listening Bug
- [ ] Pre-Listening Embed funktioniert nicht mehr (Explore + Mood Mode)
- [ ] Ursache identifizieren und beheben

## UI Polish – Feb 27
- [ ] Button-Layout: Discovery-Filter und Submit-Button in eine saubere Zeile / untereinander
- [x] Reasoning-Texte: mehr Variation, keine Wiederholungen, beide Modi erweitern
- [ ] Auto-Scroll: beim Start der Suche zum Reasoning-Bereich scrollen (mobile-first)
- [ ] Auto-Scroll: nach Abschluss zum ersten Ergebnis scrollen
- [ ] Hintergrundanimation: weicher, mehr Dynamik, keine harten Sprünge

## Empfehlungs-Diversifizierung
- [ ] Backend: Temperature auf 1.1 erhöhen (mehr Kreativität)
- [ ] Backend: Zufalls-Perspektiven-Element im Prompt (wechselnde Anweisung)
- [ ] Backend: exclude-Parameter in explore-Prozedur (Blacklist bereits gesehener Künstler)
- [ ] Backend: exclude-Parameter in mood-Prozedur (Blacklist bereits gesehener Songs)
- [ ] Frontend: Zuletzt gezeigte Künstler/Songs in sessionStorage speichern
- [ ] Frontend: Bei neuer Suche Blacklist an Backend übergeben

## Liquid Orb Theme
- [x] OrganicBackground-Komponente mit 8 Shape-Typen und Mouse/Touch-Parallax
- [x] Explore Mode: Cosmic Deep Palette (Cyan/Blue/Teal) – kalte, kosmische Shapes
- [x] Mood Mode: Emotional Heat Palette (Rose/Coral/Magenta) – warme, organische Shapes
- [x] Landing: Mixed Palette (beide Modi kombiniert)
- [x] Glassmorphism-Styles: liquid-card, liquid-nav, liquid-input, liquid-pill
- [x] Text-Glow-Klassen: liquid-glow-cyan, liquid-glow-rose
- [x] Toggle-Button (Wellen-Icon) in Navbar neben Light/Dark-Toggle
- [x] Theme-Präferenz in localStorage persistieren
- [x] Alle UI-Elemente (Karten, Inputs, Nav, Filter, Buttons) im Liquid-Modus angepasst
- [x] Explore und Mood bleiben bewusst unterschiedlich (Farbe, Shapes, Rhythmus)

## Aura Theme (drittes visuelles Konzept)
- [x] AuraBackground-Komponente: Canvas-Metaballs, heller Hintergrund, Neon-Blobs
- [x] Explore Mode Aura: Acid-Palette (Violett, Cyan, Neon-Blau, Grün, Lavendel)
- [x] Mood Mode Aura: Heat-Palette (Magenta, Hot Pink, Orange, Koralle, Rot)
- [x] Landing: Mixed Palette (beide Modi kombiniert)
- [x] Mouse/Touch: Blobs folgen dem Cursor mit Federdynamik (Spring Physics)
- [x] SVG Goo-Filter: Metaball-Verschmelzung via feTurbulence + feColorMatrix
- [x] Puls-Animation: Blobs atmen (sinusförmige Radius-Änderung)
- [x] Noise-Overlay: Papier-Textur für organisches Gefühl
- [x] Aura-Karten: weißer Glasmorphismus, dunkle Typografie, farbige Akzente
- [x] Toggle-Button: Metaball-Icon (zwei verschmelzende Kreise) in der Navbar
- [x] Theme-Persistenz in localStorage
- [x] Themes gegenseitig exklusiv (Aura deaktiviert Liquid und umgekehrt)

## Kontrast & Lesbarkeit Fix
- [ ] Light Mode: weißer Text auf weißem Hintergrund eliminieren (Karten-Overlay, Genre-Badges, Buttons)
- [ ] Light Mode: ArtistInput-Felder auf hellen Hintergrund umstellen
- [ ] Light Mode: SpotifyEmbedCard / YouTubeEmbedCard für hellen Hintergrund
- [ ] Dark Mode: zu niedrige Kontrastverhältnisse (white/10, white/20) auf mindestens white/50 erhöhen
- [ ] Dark Mode: Genre-Badges, Footer-Links, Discovery-Labels besser lesbar machen

## Grain Gradient Theme (viertes visuelles Konzept)
- [x] GrainBackground-Komponente: Canvas-Mesh-Gradient + animierte Halftone-Shapes + Grain-Overlay
- [x] Explore Mode: Violett/Blau Mesh + Cyan-Halftone-Shapes
- [x] Mood Mode: Pink/Magenta/Rot Mesh + Rose-Halftone-Shapes
- [x] Landing: Grün/Blau/Lavendel Soft-Glow Mesh-Gradient
- [x] Mouse/Touch: Mesh-Gradient verschiebt sich mit dem Cursor (Parallax)
- [x] Grain-Overlay: Canvas-Noise-Pattern über dem gesamten Hintergrund
- [x] Halftone-Shapes: Organische Formen mit Dot-Textur (wie Referenzbilder)
- [x] Typografie: Weiß auf farbigem Hintergrund, thin/light, weites Tracking
- [x] Ghost-Karten: Transparente Karten mit weißem Rand (kein weißes Glas)
- [x] Ghost-Inputs: bg-white/10, border-white/20 für alle Textfelder
- [x] Ghost-Textarea im Mood-Modus
- [x] Nav: Semi-transparent mit Blur, weiße Schrift
- [x] Toggle-Button: Grain-Icon (Halftone-Punkte) in der Navbar
- [x] Theme-Persistenz in localStorage
- [x] Themes gegenseitig exklusiv (Toggle-Bug gefixt)
- [x] bg-black auf Haupt-Container damit Canvas sichtbar ist
- [x] Alle 85 Tests bestehen

## v3 Design-System (finales Design)
- [ ] Liquid Orb Theme komplett entfernen (OrganicBackground, LiquidWaveIcon, alle isLiquidTheme-Refs)
- [ ] Aura Theme komplett entfernen (AuraBackground, AuraIcon, alle isAuraTheme-Refs)
- [ ] v3 Design-Tokens in index.css: Violett/Pink/Blau/Neon-Green, Dark/Light Variablen
- [ ] Clash Display + Satoshi + DM Serif Display Fonts in index.html einbinden
- [ ] Blob-Hintergrund (CSS-Animationen, 7 Blobs, Pulse-Rings, Wave-Lines, Grain)
- [ ] Home.tsx: Glassmorphismus-Karten, neue Typografie, Buttons, Inputs
- [ ] Navbar: v3-Stil (Glasmorphismus, Clash Display Logo, Theme-Toggle)
- [x] Design-Customizer-Seite (/design) mit Live-Playground
- [ ] Playground: Animation-Typ (Blobs/Waves/Particles/Rings/Aurora/Mesh)
- [ ] Playground: Farbschema (Violet/Rose/Ocean/Sunset/Mono/Neon)
- [ ] Playground: Hintergrundfarbe (10 Optionen)
- [ ] Playground: Speed/Intensity/Blur Slider
- [ ] Playground: Einstellungen in localStorage persistieren
- [x] Route /design in App.tsx registrieren

## v3 Design-System (finales Design, Feb 28)
- [x] Liquid Orb und Aura Themes vollständig entfernt (Komponenten, State, CSS)
- [x] v3 CSS-Design-Tokens: --sp-violet, --sp-pink-hot, --sp-blue-sky, --sp-bg
- [x] Blob-System: 7 animierte CSS-Blobs pro Palette (Landing/Explore/Mood)
- [x] Mouse-Tracking: Lerp-basiertes Parallax, Touch-Pulse-Effekte
- [x] Grain-Overlay, Pulse-Rings, Wave-Lines
- [x] sp-card, sp-btn-primary, sp-btn-mood, sp-btn-ghost, sp-input, sp-nav, sp-display, sp-accent
- [x] Accent-Gradient: Violett → Pink → Blau
- [x] Design Customizer Seite (/design) – öffentlich zugänglich
- [x] Live-Preview mit Landing/Explore/Mood-Tabs
- [x] Blob-Farb-Picker für alle drei Paletten
- [x] Slider: Blur, Intensity, Blob-Count, Mouse-Reaktivität
- [x] Toggles: Grain, Pulse-Rings, Wave-Lines
- [x] Card-Einstellungen: Blur, Opacity, Border, Radius
- [x] Accent-Gradient-Picker mit Live-Vorschau
- [x] Export JSON + Reset-Funktion
- [x] Auto-Save in localStorage
- [x] Alle 85 Tests bestehen

## v3-Design auf alle Seiten anwenden
- [ ] Dashboard Explore-Controls: Inputs, Buttons, Filter-Pills auf v3-Klassen
- [ ] Dashboard Mood-Controls: Textarea, Buttons, Discovery-Slider auf v3-Klassen
- [ ] MusicLoadingBar: v3-Styling (feature-card, gradient-text, tag-*)
- [ ] ArtistInput-Komponente: form-input Klasse, v3-Farben
- [ ] Artist Result Cards: feature-card, tag-violet/pink/blue, btn-icon
- [ ] Mood Song Cards: feature-card, v3-Typografie, tag-*
- [ ] Design Customizer (/design): komplettes v3-Redesign

## Qualitätsfixes (kritisch)
- [x] Bug: "Not on Spotify" Badge erscheint obwohl Artist auf Spotify ist (leerer String vs. null)
- [x] Bug: YouTube-Fallback zeigt falsches Video (Jessie Reyez "COFFIN" für Band "C.O.F.F.I.N")
- [x] Fix: "Not on Spotify" nur anzeigen wenn weder spotifyId noch url vorhanden
- [x] Fix: YouTube-Validierung - 3 strenge Regeln (Channel enthält Bandname, Bandname enthält Channel, Titel beginnt mit Bandname)
- [x] Fix: YouTube-Suche mit Anführungszeichen für exakte Treffer (erste Query)
- [x] Fix: Mehrere Fallback-Queries in Prioritätsreihenfolge
- [x] Tests: 7 neue YouTube-Validierungstests (inkl. C.O.F.F.I.N Regression-Test)
- [x] Alle 93 Tests bestehen

## Spotify-Erkennung Qualitätsfixes
- [ ] Spotify-Suche: Sonderzeichen-Normalisierung (C.O.F.F.I.N, A.F.I, P!nk)
- [ ] Spotify-Suche: Fuzzy-Matching wenn exakte Suche kein Ergebnis liefert
- [ ] MusicBrainz: Mehrere Query-Varianten (mit/ohne Sonderzeichen)
- [ ] Wikidata: Verbesserte SPARQL-Query für Sonderzeichen-Namen
- [ ] Logging: Detaillierte Logs welche Stufe für welchen Künstler greift

## Robuste Spotify-Auflösung für ALLE Künstler (Priorität)
- [x] MusicBrainz: Retry auf 1 reduzieren (ECONNRESET = sofort weiter, kein Retry)
- [x] Wikidata: 5 Kandidaten prüfen statt nur 1, Musik-Priorisierung (wikidata.ts verbessert)
- [x] Wikidata: Retry auf 2 reduzieren (schneller)
- [x] Neue Stufe 4: Spotify-Suche-Link als Fallback (source="search", direct_link = Suche-URL)
- [x] Frontend: Für Künstler mit source="search" Badge "Auf Spotify suchen" anzeigen
- [x] Frontend: Spotify-Suche-Link öffnet Spotify-Suche im Browser/App
- [x] Tests: Neue Tests für verbesserte Wikidata-Suche (5 Kandidaten)
- [x] Tests: Tests für Spotify-Suche-Fallback

## Explore Mode: Nur Spotify-bestätigte Künstler (Feb 28)
- [x] Backend: Explore Mode filtert Künstler ohne echte Spotify-ID heraus (spotify_id muss vorhanden sein)
- [x] Backend: Wenn weniger als 5 Spotify-bestätigte Künstler gefunden, LLM erneut befragen (bis zu 2 Runden)
- [x] Backend: Wikidata-Suche mit normalisiertem Namen (ohne Sonderzeichen) als zusätzlicher Fallback
- [x] Backend: Autocomplete-Suche auf Last.fm umstellen (MusicBrainz blockiert)
- [x] Frontend: "Search on Spotify" Badge nur noch als absoluter Fallback (sollte kaum noch erscheinen)
