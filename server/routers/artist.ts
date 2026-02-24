import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { searchSpotifyArtist, searchMultipleArtists } from "../spotify";
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
   * Sucht einen Künstler auf Spotify und cached das Ergebnis.
   * Gibt null zurück wenn kein Treffer gefunden wird (kein kaputter Link).
   */
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const { query } = input;

      // 1. Cache prüfen
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
        };
      }

      // 2. Spotify API aufrufen
      const result = await searchSpotifyArtist(query);

      if (!result) {
        await logSearch(query, 0);
        return { found: false as const, artist: null, fromCache: false };
      }

      // 3. In DB cachen
      await upsertArtist({
        spotifyId: result.spotify_id,
        displayName: result.display_name,
        spotifyName: result.spotify_name,
        directLink: result.direct_link,
        imageUrl: result.image_url,
        genres: JSON.stringify(result.genres),
        followers: result.followers,
        popularity: result.popularity,
      });

      await logSearch(query, 1);

      return {
        found: true as const,
        artist: {
          spotifyId: result.spotify_id,
          displayName: result.display_name,
          spotifyName: result.spotify_name,
          directLink: result.direct_link,
          imageUrl: result.image_url,
          genres: result.genres,
          followers: result.followers,
          popularity: result.popularity,
          discogsId: null,
          discogsBio: null,
        },
        fromCache: false,
      };
    }),

  /**
   * Holt Discogs-Daten für einen Künstler und aktualisiert den Cache.
   */
  discogs: publicProcedure
    .input(z.object({ artistName: z.string().min(1), spotifyId: z.string().optional() }))
    .query(async ({ input }) => {
      const data = await searchDiscogsArtist(input.artistName);

      if (!data) return { found: false as const, data: null };

      // Cache aktualisieren falls Spotify-ID bekannt
      if (input.spotifyId) {
        const existing = await getArtistBySpotifyId(input.spotifyId);
        if (existing) {
          await upsertArtist({
            ...existing,
            genres: existing.genres ?? "[]",
            discogsId: data.discogs_id,
            discogsBio: data.profile.slice(0, 2000),
          });
        }
      }

      return { found: true as const, data };
    }),

  /**
   * KI-generierte Künstlerempfehlungen basierend auf einem Referenz-Künstler.
   * Validiert alle Empfehlungen gegen Spotify.
   */
  recommendations: publicProcedure
    .input(
      z.object({
        artistName: z.string().min(1),
        genres: z.array(z.string()).optional(),
        mood: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { artistName, genres = [], mood } = input;

      // LLM nach ähnlichen Künstlern fragen
      const genreContext = genres.length > 0 ? `Genres: ${genres.join(", ")}` : "";
      const moodContext = mood ? `Stimmung: ${mood}` : "";

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
        const content = typeof rawContent === 'string' ? rawContent : null;
        if (content) {
          const parsed = JSON.parse(content) as { artists: string[] };
          recommendedNames = parsed.artists?.slice(0, 6) ?? [];
        }
      } catch {
        console.warn("LLM-Antwort konnte nicht geparst werden");
        return { recommendations: [] };
      }

      // Alle Empfehlungen gegen Spotify validieren
      const spotifyResults = await searchMultipleArtists(recommendedNames);

      const validated = spotifyResults
        .map((result, i) => {
          if (!result) {
            // Fallback: Kein Link, nur Name (kein kaputter Link)
            return {
              found: false as const,
              display_name: recommendedNames[i] ?? "",
              spotify_name: null,
              spotify_id: null,
              direct_link: null,
              image_url: null,
              genres: [] as string[],
            };
          }
          return {
            found: true as const,
            display_name: result.display_name,
            spotify_name: result.spotify_name,
            spotify_id: result.spotify_id,
            direct_link: result.direct_link,
            image_url: result.image_url,
            genres: result.genres,
          };
        })
        .filter((r) => r.display_name);

      // Gefundene Künstler cachen
      await Promise.all(
        validated
          .filter((r) => r.found && r.spotify_id)
          .map((r) =>
            upsertArtist({
              spotifyId: r.spotify_id!,
              displayName: r.display_name,
              spotifyName: r.spotify_name!,
              directLink: r.direct_link!,
              imageUrl: r.image_url,
              genres: JSON.stringify(r.genres),
            })
          )
      );

      return { recommendations: validated };
    }),

  /**
   * Gibt zuletzt gesuchte/gecachte Künstler zurück (für die Startseite).
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
