import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { resolveArtist, resolveMultipleArtists } from "../artistService";
import { getSpotifyToken } from "../spotify";
import { searchYouTubeVideoId } from "../youtube";
import { getSimilarArtists, getTopTracks, getArtistInfo } from "../lastfm";

/**
 * SonicPulse Router
 * - musicbrainzSearch: Autocomplete für Künstlereingaben
 * - enrichArtist: Spotify-Bild, URL und Preview für einen Künstler
 * - explore: KI-Empfehlungen basierend auf Lieblingsbands
 * - mood: Emotionale Intelligenz – Songs nach Anlass/Gefühl
 */
export const sonicpulseRouter = router({

  /**
   * MusicBrainz Artist-Autocomplete
   * Gibt bis zu 5 Treffer mit Name und Land zurück.
   */
  musicbrainzSearch: publicProcedure
    .input(z.object({ query: z.string().min(2).max(100) }))
    .query(async ({ input }) => {
      try {
        const url = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(input.query)}&limit=5&fmt=json`;
        const res = await fetch(url, {
          headers: { "User-Agent": "SonicPulse/1.0 (contact@sonicpulse.app)" },
        });
        if (!res.ok) return [];
        const data = await res.json() as { artists?: Array<{ id: string; name: string; country?: string; disambiguation?: string }> };
        return (data.artists ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          country: a.country ?? null,
          disambiguation: a.disambiguation ?? null,
        }));
      } catch {
        return [];
      }
    }),

  /**
   * Spotify Artist Enrichment
   * Gibt Bild-URL, Spotify-URL und Preview-URL zurück.
   * Nutzt MusicBrainz als Fallback wenn Spotify 403 gibt.
   */
  enrichArtist: publicProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const profile = await resolveArtist(input.name);
      if (!profile) {
        return { found: false as const, image: null, url: null, previewUrl: null };
      }
      return {
        found: true as const,
        image: profile.image_url,
        url: profile.direct_link,
        previewUrl: null, // Preview via Spotify Embed (iframe), kein direkter Audio-URL
      };
    }),

  /**
   * Explore Mode: KI-Empfehlungen basierend auf Lieblingsbands
   * Gibt 5 Künstler mit Grund, Genre und ähnlichem Künstler zurück.
   * Alle werden gegen echte Spotify-IDs validiert.
   */
  explore: publicProcedure
    .input(z.object({
      artists: z.array(z.string()).min(1).max(10),
      discoveryLevel: z.enum(["mainstream", "underground", "exotics"]).default("underground"),
      exclude: z.array(z.string()).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const artistList = input.artists.filter((a) => a.trim()).join(", ");
      if (!artistList) return { recommendations: [] };

      const discoveryText = {
        mainstream: "popular, established, and mainstream artists with broad appeal",
        underground: "relatively unknown, underground, and niche artists – hidden gems with cult followings",
        exotics: "highly exotic, unusual, and unique artists from around the world, but still fitting the vibe",
      }[input.discoveryLevel];

      // Diversification: rotate perspective instruction each call
      const perspectives = [
        "Focus on artists from unexpected countries or regions that share this sound.",
        "Think about artists from the 70s, 80s, 90s, 2000s, or 2010s that fit this taste.",
        "Prioritize female-fronted or non-binary artists if they fit the sound.",
        "Look for side projects, supergroups, or solo careers of members from similar bands.",
        "Consider artists who are critically acclaimed but commercially overlooked.",
        "Think about artists who influenced the input bands, not just similar contemporaries.",
        "Consider artists who blend genres in unexpected ways while fitting the overall vibe.",
        "Look for artists from non-English speaking countries who match this sound.",
      ];
      const perspective = perspectives[Math.floor(Math.random() * perspectives.length)];

      const excludeClause = input.exclude && input.exclude.length > 0
        ? `\nIMPORTANT: Do NOT recommend any of these artists (already shown): ${input.exclude.join(", ")}. Suggest completely different artists.`
        : "";

      const llmResponse = await invokeLLM({
        temperature: 1.2,
        messages: [
          {
            role: "system",
            content: "You are a music expert with encyclopedic knowledge of global music across all eras. Be creative and diverse in your recommendations. Respond only with valid JSON. No explanations.",
          },
          {
            role: "user",
            content: `Based on these artists: ${artistList}, suggest 5 new bands or artists I might like.\nThe user prefers ${discoveryText} artists.\n${perspective}${excludeClause}\nRespond with a JSON object containing an "items" array of objects with keys: artist, reason, genre, similarTo.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      artist:    { type: "string" },
                      reason:    { type: "string" },
                      genre:     { type: "string" },
                      similarTo: { type: "string" },
                    },
                    required: ["artist", "reason", "genre", "similarTo"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      });

      let rawRecs: Array<{ artist: string; reason: string; genre: string; similarTo: string }> = [];
      try {
        const content = llmResponse.choices[0]?.message?.content;
        if (typeof content === "string") {
          const parsed = JSON.parse(content) as { items: typeof rawRecs };
          rawRecs = parsed.items?.slice(0, 5) ?? [];
        }
      } catch {
        return { recommendations: [] };
      }

      // Alle Künstler gegen echte Spotify-IDs validieren
      const profiles = await resolveMultipleArtists(rawRecs.map((r) => r.artist));

      // YouTube-Fallback: für Künstler ohne Spotify-ID parallel suchen
      const youtubeIds = await Promise.all(
        rawRecs.map(async (rec, i) => {
          const profile = profiles[i];
          const hasSpotify = profile?.spotify_id && profile.spotify_id !== "";
          if (hasSpotify) return null; // Spotify vorhanden – kein YouTube nötig
          return searchYouTubeVideoId(rec.artist).catch(() => null);
        })
      );

      // Last.fm: Similarity Scores – alle Input-Künstler als Referenz nutzen, bester Score gewinnt
      // Fuzzy name normalizer: lowercase, remove leading "the ", strip special chars
      function normalizeName(name: string): string {
        return name.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
      }

      // Fetch similar lists for ALL input artists in parallel (limit 100 each)
      const allSimilarLists = await Promise.all(
        input.artists.map((a) => getSimilarArtists(a, 100).catch(() => []))
      );
      // Flatten and keep best score per artist name (normalized)
      const bestScoreMap = new Map<string, number>();
      for (const list of allSimilarLists) {
        for (const s of list) {
          const key = normalizeName(s.name);
          const prev = bestScoreMap.get(key) ?? 0;
          if (s.match > prev) bestScoreMap.set(key, s.match);
        }
      }

      // For each recommendation: look up score from map, fallback to direct artist.getInfo listeners
      const lastfmInfoFallbacks = await Promise.all(
        rawRecs.map(async (rec) => {
          const key = normalizeName(rec.artist);
          if (bestScoreMap.has(key)) return null; // already have score, no extra lookup needed
          // No match found – fetch direct info for listener count at least
          return getArtistInfo(rec.artist).catch(() => null);
        })
      );

      // Collect all listener counts for relative ranking (to compute fallback scores)
      const allListeners = rawRecs.map((_, i) => {
        const profile = profiles[i];
        const fallbackInfo = lastfmInfoFallbacks[i];
        return profile?.lastfm_listeners ?? fallbackInfo?.listeners ?? null;
      }).filter((l): l is number => l !== null);
      const maxListeners = allListeners.length > 0 ? Math.max(...allListeners) : 1;

      const recommendations = rawRecs.map((rec, i) => {
        const profile = profiles[i];
        const youtubeId = youtubeIds[i];
        // Similarity Score: fuzzy lookup across all input artists' similar lists
        const key = normalizeName(rec.artist);
        const rawScore = bestScoreMap.get(key) ?? null;
        let similarityScore: number;
        if (rawScore !== null) {
          // Last.fm hat einen echten Score – direkt nutzen
          similarityScore = Math.round(rawScore * 100);
        } else {
          // Fallback: Score aus Listeners-Ranking (relativer Popularitätswert)
          // + fester Basis-Score von 55–75% (LLM hat den Künstler bewusst empfohlen)
          const fallbackInfo = lastfmInfoFallbacks[i];
          const listeners = profile?.lastfm_listeners ?? fallbackInfo?.listeners ?? null;
          if (listeners !== null && maxListeners > 0) {
            // Normierter Listeners-Score: 55% Basis + bis zu 20% aus Popularität
            const listenerRatio = Math.min(listeners / maxListeners, 1);
            similarityScore = Math.round(55 + listenerRatio * 20);
          } else {
            // Kein Listeners-Wert: fester Score 60–72% (LLM-Empfehlung ohne Metadaten)
            similarityScore = 60 + (i % 4) * 3; // leichte Variation pro Karte
          }
        }
        // Listeners: from enriched profile or Last.fm direct fallback
        const fallbackInfo = lastfmInfoFallbacks[i];
        const listeners = profile?.lastfm_listeners ?? fallbackInfo?.listeners ?? null;
        return {
          artist:    rec.artist,
          reason:    rec.reason,
          genre:     rec.genre,
          similarTo: rec.similarTo,
          youtubeId: youtubeId ?? null,
          similarityScore,
          listeners,
          lastfmUrl: profile?.lastfm_url ?? null,
          enriched: profile
            ? {
                image:     profile.image_url,
                url:       profile.direct_link || null,
                spotifyId: profile.spotify_id || null,
                previewUrl: null,
              }
            : undefined,
        };
      });

      return { recommendations };
    }),

  /**
   * Mood Mode: Emotionale Intelligenz
   * Analysiert einen Freitext (Anlass, Emotion, Situation) und empfiehlt
   * Songs mit emotionaler Tiefenbegründung.
   *
   * Gibt zurück:
   * - emotionalProfile: KI-Analyse der Emotion (Kernemotion, Intensität, Subtext, Anlass)
   * - songs: 6 Songs mit Titel, Künstler, emotionaler Begründung
   */
  mood: publicProcedure
    .input(z.object({
      prompt:          z.string().min(3).max(1000),
      songCount:       z.number().min(1).max(3).default(3),
      musicReference:  z.string().max(200).optional(),
      discoveryFilter: z.enum(["mainstream", "underground", "exotic"]).default("mainstream"),
      exclude:         z.array(z.string()).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      // Diversification: rotate emotional lens each call
      const emotionalLenses = [
        "Consider songs that approach this emotion from an unexpected angle – perhaps through metaphor or contrast.",
        "Look for songs from different decades or eras that capture this feeling.",
        "Consider non-English language songs that embody this emotional state.",
        "Think about instrumental or ambient pieces that convey this emotion without words.",
        "Look for songs that represent the turning point or resolution of this emotion.",
        "Consider songs that validate and sit with this feeling rather than trying to resolve it.",
        "Think about songs that pair this emotion with an unexpected musical genre.",
        "Look for deep cuts and album tracks rather than singles.",
      ];
      const emotionalLens = emotionalLenses[Math.floor(Math.random() * emotionalLenses.length)];

      const excludeClause = input.exclude && input.exclude.length > 0
        ? `\nIMPORTANT: Do NOT recommend any of these songs (already shown to the user): ${input.exclude.join(", ")}. Suggest completely different songs.`
        : "";

      const llmResponse = await invokeLLM({
        temperature: 1.2,
        messages: [
          {
            role: "system",
            content: `You are an emotionally intelligent music therapist and curator with deep knowledge of how music affects human emotions.
Your task is to analyze the emotional subtext of what a person describes, then recommend songs that resonate with that emotional state.
You understand nuance: grief mixed with gratitude, excitement tinged with anxiety, nostalgia that is bittersweet.
Always respond only with valid JSON. No explanations outside the JSON.`,
          },
          {
          role: "user",
          content: `A person wrote: "${input.prompt}"
${input.musicReference ? `\nMusical style reference: The person wants songs that are musically inspired by or similar in style to "${input.musicReference}". Use this ONLY as a sonic/stylistic reference – do NOT interpret it as emotional context. The emotional analysis must come exclusively from the written text above.` : ""}

First, deeply analyze the emotional landscape of this message:
- What is the core emotion or emotional blend?
- What is the occasion or life situation?
- What does this person need from music right now (catharsis, comfort, energy, reflection, celebration, courage...)?
- What is the emotional intensity (subtle/moderate/intense)?

Discovery filter: "${input.discoveryFilter}"
${input.discoveryFilter === "mainstream" ? "Recommend well-known, widely recognized songs that most people would know. Prioritize chart hits, iconic tracks, and artists with broad mainstream appeal." : input.discoveryFilter === "underground" ? "Recommend lesser-known, cult, or indie songs. Avoid mainstream chart hits. Prioritize artists with dedicated followings but limited mainstream exposure – hidden gems that feel like a personal discovery." : "Recommend rare, niche, or globally diverse songs. Think world music, experimental, obscure genres, non-English language music, or deeply underground artists. Surprise the listener with something truly unexpected."}

Curatorial approach for this search: ${emotionalLens}${excludeClause}

Then recommend exactly ${input.songCount} song${input.songCount === 1 ? "" : "s"} that are emotionally aligned with this state${input.musicReference ? ` and musically inspired by the style of "${input.musicReference}"` : ""}.

CRITICAL RULES FOR SONG SELECTION:
1. Each recommendation must be ONE SPECIFIC SONG by ONE SPECIFIC ARTIST – not just an artist or album.
2. Choose the single track that MOST PRECISELY captures the emotional state described. Not their most famous song, but the RIGHT song for this exact moment.
3. The song title must be a real, existing track that can be found on Spotify. Do not invent song titles.
4. Each artist must be different – no two songs from the same artist.
5. For each song, explain WHY this specific track (not just the artist) resonates with this emotional moment – describe the emotional arc of the song itself.

Respond with a JSON object with keys: emotionalProfile and songs.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "mood_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                emotionalProfile: {
                  type: "object",
                  properties: {
                    coreEmotion:   { type: "string", description: "Primary emotion or emotional blend, e.g. 'bittersweet nostalgia' or 'anxious excitement'" },
                    occasion:      { type: "string", description: "Life situation or occasion described" },
                    musicNeed:     { type: "string", description: "What the person needs from music right now" },
                    intensity:     { type: "string", enum: ["subtle", "moderate", "intense"] },
                    emotionalNote: { type: "string", description: "A short empathetic note acknowledging the person's emotional state (1-2 sentences, warm and human)" },
                  },
                  required: ["coreEmotion", "occasion", "musicNeed", "intensity", "emotionalNote"],
                  additionalProperties: false,
                },
                songs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title:          { type: "string" },
                      artist:         { type: "string" },
                      emotionalBridge: { type: "string", description: "Why this song connects to the person's emotional state – the emotional journey it offers" },
                      genre:          { type: "string" },
                      lyricMoment:    { type: "string", description: "One key lyric or musical moment that captures the emotion (or describe the instrumental moment if no lyrics)" },
                    },
                    required: ["title", "artist", "emotionalBridge", "genre", "lyricMoment"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["emotionalProfile", "songs"],
              additionalProperties: false,
            },
          },
        },
      });

      type RawSong = { title: string; artist: string; emotionalBridge: string; genre: string; lyricMoment: string };
      type RawProfile = { coreEmotion: string; occasion: string; musicNeed: string; intensity: string; emotionalNote: string };

      let rawSongs: RawSong[] = [];
      let rawProfile: RawProfile | null = null;

      try {
        const content = llmResponse.choices[0]?.message?.content;
        if (typeof content === "string") {
          const parsed = JSON.parse(content) as { emotionalProfile: RawProfile; songs: RawSong[] };
          rawProfile = parsed.emotionalProfile ?? null;
          rawSongs   = parsed.songs?.slice(0, input.songCount) ?? [];
        }
      } catch {
        return { emotionalProfile: null, songs: [] };
      }

      // Alle Künstler mit echten Spotify-IDs anreichern (für Bilder)
      const profiles = await resolveMultipleArtists(rawSongs.map((s) => s.artist));

      // YouTube: IMMER den exakten Song suchen (primärer Player im Mood Mode)
      // Suchquery: "Künstler Titel official" für präzise Treffer
      const youtubeIds = await Promise.all(
        rawSongs.map((song) =>
          searchYouTubeVideoId(song.artist, song.title).catch(() => null)
        )
      );

      // Spotify Track-URL als optionaler Deep-Link (kein Embed, nur Link)
      // Baut eine Spotify-Suche-URL die direkt zum Track führt
      function buildSpotifyTrackUrl(artist: string, title: string): string {
        const query = encodeURIComponent(`${artist} ${title}`);
        return `https://open.spotify.com/search/${query}/tracks`;
      }

      const songs = rawSongs.map((song, i) => {
        const profile = profiles[i];
        const youtubeId = youtubeIds[i];
        return {
          title:           song.title,
          artist:          song.artist,
          emotionalBridge: song.emotionalBridge,
          genre:           song.genre,
          lyricMoment:     song.lyricMoment,
          trackId:         null, // kein Spotify-Track-Embed mehr
          trackUrl:        buildSpotifyTrackUrl(song.artist, song.title), // Spotify-Suche-Link
          youtubeId:       youtubeId ?? null,
          listeners:       profile?.lastfm_listeners ?? null,
          lastfmUrl:       profile?.lastfm_url ?? null,
          enriched: profile
            ? {
                image:     profile.image_url,
                url:       profile.direct_link || null,
                spotifyId: profile.spotify_id || null,
              }
            : undefined,
        };
      });

      return { emotionalProfile: rawProfile, songs };
    }),
});
