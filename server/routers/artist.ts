import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { resolveArtist, resolveMultipleArtists } from "../artistService";
import { searchDiscogsArtist } from "../discogs";
import {
  getArtistBySpotifyId,
  upsertArtist,
  searchCachedArtists,
  getRecentArtists,
  logSearch,
} from "../db";

export const artistRouter = router({
  /**
   * Sucht einen Künstler und gibt ein validiertes Profil mit echter Spotify-ID zurück.
   *
   * GARANTIE: directLink ist immer open.spotify.com/artist/{ID} oder null.
   * NIEMALS: open.spotify.com/search/...
   */
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const { query } = input;

      // 1. Datenbank-Cache prüfen (bereits aufgelöste IDs)
      const cached = await searchCachedArtists(query);
      if (cached.length > 0) {
        await logSearch(query, cached.length);
        return {
          found: true as const,
          artist: {
            ...cached[0],
            genres: cached[0].genres ? JSON.parse(cached[0].genres) : [],
          },
          fromCache: true,
          source: "cache" as const,
        };
      }

      // 2. Echte Artist-ID beschaffen (Spotify → MusicBrainz Fallback)
      const profile = await resolveArtist(query);

      if (!profile) {
        await logSearch(query, 0);
        return { found: false as const, artist: null, fromCache: false, source: null };
      }

      // 3. In DB cachen für zukünftige Anfragen
      await upsertArtist({
        spotifyId:   profile.spotify_id,
        displayName: profile.display_name,
        spotifyName: profile.spotify_name,
        directLink:  profile.direct_link,
        imageUrl:    profile.image_url,
        genres:      JSON.stringify(profile.genres),
        followers:   profile.followers ?? 0,
        popularity:  profile.popularity ?? 0,
      });

      await logSearch(query, 1);

      return {
        found:     true as const,
        fromCache: false,
        source:    profile.source,
        artist: {
          spotifyId:   profile.spotify_id,
          displayName: profile.display_name,
          spotifyName: profile.spotify_name,
          directLink:  profile.direct_link,
          imageUrl:    profile.image_url,
          genres:      profile.genres,
          followers:   profile.followers,
          popularity:  profile.popularity,
          discogsId:   null,
          discogsBio:  null,
        },
      };
    }),

  /**
   * Holt Discogs-Daten für einen Künstler.
   */
  discogs: publicProcedure
    .input(z.object({ artistName: z.string().min(1), spotifyId: z.string().optional() }))
    .query(async ({ input }) => {
      const data = await searchDiscogsArtist(input.artistName);

      if (!data) return { found: false as const, data: null };

      if (input.spotifyId) {
        const existing = await getArtistBySpotifyId(input.spotifyId);
        if (existing) {
          await upsertArtist({
            ...existing,
            genres:     existing.genres ?? "[]",
            discogsId:  data.discogs_id,
            discogsBio: data.profile.slice(0, 2000),
          });
        }
      }

      return { found: true as const, data };
    }),

  /**
   * KI-generierte Künstlerempfehlungen – alle mit echter Spotify-ID validiert.
   *
   * GARANTIE: Jeder Eintrag mit found=true hat eine echte spotify_id und
   *           einen direct_link der Form open.spotify.com/artist/{ID}.
   *           Einträge ohne ID haben found=false und KEINEN Link.
   */
  recommendations: publicProcedure
    .input(
      z.object({
        artistName: z.string().min(1),
        genres:     z.array(z.string()).optional(),
        mood:       z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { artistName, genres = [], mood } = input;

      // LLM nach ähnlichen Künstlernamen fragen
      const genreContext = genres.length > 0 ? `Genres: ${genres.join(", ")}` : "";
      const moodContext  = mood ? `Stimmung: ${mood}` : "";

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Du bist ein Musikexperte. Antworte ausschließlich mit einem validen JSON-Array von Künstlernamen. Keine Erklärungen, nur JSON.",
          },
          {
            role: "user",
            content: `Nenne mir 6 Künstler, die ähnlich wie "${artistName}" klingen. ${genreContext} ${moodContext}
Antworte NUR mit einem JSON-Array, z.B.: ["Künstler 1", "Künstler 2", "Künstler 3", "Künstler 4", "Künstler 5", "Künstler 6"]`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "artist_recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                artists: {
                  type: "array",
                  items: { type: "string" },
                  description: "Liste von 6 ähnlichen Künstlernamen",
                },
              },
              required: ["artists"],
              additionalProperties: false,
            },
          },
        },
      });

      let recommendedNames: string[] = [];
      try {
        const rawContent = llmResponse.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : null;
        if (content) {
          const parsed = JSON.parse(content) as { artists: string[] };
          recommendedNames = parsed.artists?.slice(0, 6) ?? [];
        }
      } catch {
        console.warn("LLM-Antwort konnte nicht geparst werden");
        return { recommendations: [] };
      }

      // Alle Empfehlungen gegen echte Spotify-IDs validieren (Spotify → MusicBrainz)
      const profiles = await resolveMultipleArtists(recommendedNames);

      const validated = profiles.map((profile, i) => {
        if (!profile) {
          // Kein Treffer → neutraler Eintrag OHNE Link
          return {
            found:        false as const,
            display_name: recommendedNames[i] ?? "",
            spotify_name: null,
            spotify_id:   null,
            direct_link:  null, // KEIN /search/-Link
            image_url:    null,
            genres:       [] as string[],
            source:       null,
          };
        }
        return {
          found:        true as const,
          display_name: profile.display_name,
          spotify_name: profile.spotify_name,
          spotify_id:   profile.spotify_id,
          direct_link:  profile.direct_link, // Immer open.spotify.com/artist/{ID}
          image_url:    profile.image_url,
          genres:       profile.genres,
          source:       profile.source,
        };
      });

      // Gefundene Künstler cachen
      await Promise.all(
        validated
          .filter((r) => r.found && r.spotify_id)
          .map((r) =>
            upsertArtist({
              spotifyId:   r.spotify_id!,
              displayName: r.display_name,
              spotifyName: r.spotify_name!,
              directLink:  r.direct_link!,
              imageUrl:    r.image_url,
              genres:      JSON.stringify(r.genres),
            })
          )
      );

      return { recommendations: validated };
    }),

  /**
   * Gibt zuletzt gesuchte/gecachte Künstler zurück.
   */
  recent: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional() }))
    .query(async ({ input }) => {
      const artists = await getRecentArtists(input.limit ?? 8);
      return artists.map((a) => ({
        ...a,
        genres: a.genres ? JSON.parse(a.genres) : [],
      }));
    }),
});
