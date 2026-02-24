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
