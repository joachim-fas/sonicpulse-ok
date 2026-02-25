import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { resolveArtist, resolveMultipleArtists } from "../artistService";

/**
 * SonicPulse Router
 * - musicbrainzSearch: Autocomplete für Künstlereingaben
 * - enrichArtist: Spotify-Bild, URL und Preview für einen Künstler
 * - enrichTrack: Spotify-Daten für einen Track (Party Mode)
 * - explore: KI-Empfehlungen basierend auf Lieblingsbands
 * - party: KI-generierte Party-Playlist
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
   * Spotify Track Enrichment (für Party Mode)
   * Sucht einen Track über MusicBrainz/Spotify und gibt Metadaten zurück.
   */
  enrichTrack: publicProcedure
    .input(z.object({ title: z.string(), artist: z.string() }))
    .query(async ({ input }) => {
      // Artist-Profil beschaffen um Spotify-URL zu erhalten
      const profile = await resolveArtist(input.artist);
      if (!profile) {
        return { found: false as const, image: null, url: null, previewUrl: null, uri: null };
      }
      return {
        found: true as const,
        image: profile.image_url,
        url: profile.direct_link,
        previewUrl: null,
        uri: `spotify:artist:${profile.spotify_id}`,
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
   * Party Mode: KI-generierte Playlist
   * Gibt {partyLength} Tracks mit Titel, Künstler und Grund zurück.
   * Jeder Track wird mit Spotify-Daten angereichert.
   */
  party: publicProcedure
    .input(z.object({
      artists:     z.array(z.string()).min(1).max(15),
      energy:      z.enum(["chill", "medium", "high"]).default("high"),
      trackCount:  z.number().min(5).max(20).default(10),
    }))
    .mutation(async ({ input }) => {
      const artistList = input.artists.filter((a) => a.trim()).join(", ");
      if (!artistList) return { tracks: [] };

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a music expert and DJ. Respond only with valid JSON. No explanations.",
          },
          {
            role: "user",
            content: `Generate a ${input.energy} energy party playlist based on these artists: ${artistList}.
Suggest ${input.trackCount} tracks that would fit well together in a party setting with ${input.energy} energy.
CRITICAL RULES:
1. Each track MUST be from a different artist.
2. Do not repeat any artist in the playlist.
3. Each artist should appear exactly once.
Respond with a JSON object containing a "tracks" array with keys: title, artist, reason.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "party_playlist",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tracks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title:  { type: "string" },
                      artist: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["title", "artist", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["tracks"],
              additionalProperties: false,
            },
          },
        },
      });

      let rawTracks: Array<{ title: string; artist: string; reason: string }> = [];
      try {
        const content = llmResponse.choices[0]?.message?.content;
        if (typeof content === "string") {
          const parsed = JSON.parse(content) as { tracks: typeof rawTracks };
          rawTracks = parsed.tracks?.slice(0, input.trackCount) ?? [];
        }
      } catch {
        return { tracks: [] };
      }

      // Alle Künstler anreichern
      const profiles = await resolveMultipleArtists(rawTracks.map((t) => t.artist));

      const tracks = rawTracks.map((track, i) => {
        const profile = profiles[i];
        return {
          title:  track.title,
          artist: track.artist,
          reason: track.reason,
          enriched: profile
            ? {
                image:      profile.image_url,
                url:        profile.direct_link,
                previewUrl: null,
                uri:        `spotify:artist:${profile.spotify_id}`,
              }
            : undefined,
        };
      });

      return { tracks };
    }),
});
