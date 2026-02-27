import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { resolveArtist, resolveMultipleArtists } from "../artistService";
import { getSpotifyToken } from "../spotify";

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
    }))
    .mutation(async ({ input }) => {
      const artistList = input.artists.filter((a) => a.trim()).join(", ");
      if (!artistList) return { recommendations: [] };

      const discoveryText = {
        mainstream: "popular, established, and mainstream",
        underground: "relatively unknown, underground, and niche",
        exotics: "highly exotic, unusual, and unique artists from around the world, but still fitting the vibe",
      }[input.discoveryLevel];

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a music expert. Respond only with valid JSON. No explanations.",
          },
          {
            role: "user",
            content: `Based on these artists: ${artistList}, suggest 5 new bands or artists I might like.
The user prefers ${discoveryText} artists.
Respond with a JSON object containing an "items" array of objects with keys: artist, reason, genre, similarTo.`,
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

      const recommendations = rawRecs.map((rec, i) => {
        const profile = profiles[i];
        return {
          artist:    rec.artist,
          reason:    rec.reason,
          genre:     rec.genre,
          similarTo: rec.similarTo,
          enriched: profile
            ? { image: profile.image_url, url: profile.direct_link, previewUrl: null }
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
    }))
    .mutation(async ({ input }) => {
      const llmResponse = await invokeLLM({
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

Then recommend exactly ${input.songCount} song${input.songCount === 1 ? "" : "s"} that are emotionally aligned with this state${input.musicReference ? ` and musically inspired by the style of "${input.musicReference}"` : ""}.
For each song, explain WHY it resonates with this specific emotional moment – not just the genre, but the emotional journey the song takes the listener on.

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

      // Alle Künstler mit echten Spotify-IDs anreichern
      const profiles = await resolveMultipleArtists(rawSongs.map((s) => s.artist));

      // Spotify Track-IDs via Client Credentials (kein User-Login nötig)
      let spotifyToken: string | null = null;
      try { spotifyToken = await getSpotifyToken(); } catch { /* ignore */ }

      async function searchTrackId(artist: string, title: string): Promise<string | null> {
        if (!spotifyToken) return null;
        try {
          const q = encodeURIComponent(`artist:${artist} track:${title}`);
          const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${spotifyToken}` },
          });
          if (!res.ok) return null;
          const data = await res.json() as { tracks: { items: Array<{ id: string }> } };
          return data.tracks?.items?.[0]?.id ?? null;
        } catch { return null; }
      }

      // Track-IDs parallel suchen
      const trackIds = await Promise.all(
        rawSongs.map((s) => searchTrackId(s.artist, s.title))
      );

      const songs = rawSongs.map((song, i) => {
        const profile = profiles[i];
        const trackId = trackIds[i];
        return {
          title:           song.title,
          artist:          song.artist,
          emotionalBridge: song.emotionalBridge,
          genre:           song.genre,
          lyricMoment:     song.lyricMoment,
          trackId:         trackId ?? null,          // Spotify Track-ID für Track-Embed
          trackUrl:        trackId ? `https://open.spotify.com/track/${trackId}` : null,
          enriched: profile
            ? {
                image:     profile.image_url,
                url:       profile.direct_link,
                spotifyId: profile.spotify_id,
              }
            : undefined,
        };
      });

      return { emotionalProfile: rawProfile, songs };
    }),
});
