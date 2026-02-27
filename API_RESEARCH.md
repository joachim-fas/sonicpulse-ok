# API Research für SonicPulse

## Gefundene APIs und Bewertung

### 1. Last.fm API – SEHR WERTVOLL ⭐⭐⭐⭐⭐
- **artist.getSimilar**: Gibt ähnliche Künstler mit Similarity-Score zurück → kann die LLM-Empfehlungen validieren oder ergänzen
- **artist.getInfo**: Biografie, Tags, Listener-Count, Playcount, Bild-URLs
- **artist.getTopTracks**: Top-Songs eines Künstlers → für Mood-Mode nutzbar
- **track.getSimilar**: Ähnliche Songs zu einem gegebenen Track
- **Kostenlos**: Ja, nur API-Key nötig (kostenlos registrieren)
- **Bild-Qualität**: Mittel (userserve-ak.last.fm), aber besser als nichts
- **Für SonicPulse**: Kann als primärer Bild-Fallback dienen (statt Discogs), und ähnliche Künstler können die LLM-Empfehlungen validieren

### 2. TheAudioDB API – WERTVOLL ⭐⭐⭐⭐
- **search.php?s={artist}**: Suche nach Künstler → gibt Biografie, Genre, Herkunftsland, Bild-URLs zurück
- **Bilder**: Artist Thumb, Artist Fanart, Artist Banner, Artist Logo – hochwertige Bilder!
- **Kostenlos**: Test-Key "2" für Entwicklung, $8/Monat für Produktion
- **Für SonicPulse**: Hochwertige Künstlerbilder als primärer Fallback (besser als Discogs für Künstlerfotos)

### 3. Shazam Core API (RapidAPI) – INTERESSANT ⭐⭐⭐
- Song-Erkennung, Artist-Daten, Charts
- Kostenpflichtig (RapidAPI), aber Free-Tier vorhanden
- Für SonicPulse weniger relevant

### 4. SONOTELLER AI (RapidAPI) – INTERESSANT FÜR ZUKUNFT ⭐⭐⭐
- Audio-Analyse: Genre, Mood, Instrumente, BPM, Key
- Könnte für "Mood-basierte Analyse" genutzt werden
- Kostenpflichtig

### 5. Billboard API (RapidAPI) – INTERESSANT ⭐⭐⭐
- Billboard Hot 100, Artist 100, etc.
- Könnte für "Trending Artists" Feature genutzt werden

## Konkrete Verbesserungen für SonicPulse

### Priorität 1: Last.fm als Bild-Fallback (kostenlos, sofort umsetzbar)
- Aktuell: Discogs-Bild-Fallback (Release-Cover, nicht immer Künstlerfotos)
- Neu: Last.fm `artist.getInfo` liefert direkte Künstlerbilder
- Vorteil: Bessere Bildqualität, höhere Trefferquote bei underground-Bands

### Priorität 2: TheAudioDB für hochwertige Künstlerbilder ($8/Monat)
- Fanart-Bilder, Artist-Thumbs in hoher Qualität
- Besonders für die Karten-Bilder sehr wertvoll

### Priorität 3: Last.fm `artist.getSimilar` als Validierung
- LLM empfiehlt Künstler → Last.fm bestätigt Ähnlichkeit
- Könnte Similarity-Score auf den Karten anzeigen

### Priorität 4: Last.fm `artist.getTopTracks` für Mood-Mode
- Statt nur Künstler-Embed: Top-Track direkt einbetten
- Verbessert die Relevanz der Empfehlungen
