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
