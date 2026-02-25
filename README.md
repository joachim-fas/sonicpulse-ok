# SonicPulse

> **Your sound, reimagined.** — An AI-powered music discovery app with three distinct modes: artist exploration, party playlist generation, and emotionally intelligent song recommendations.

SonicPulse combines the Spotify Web API, MusicBrainz, Wikidata, and a large language model to deliver personalized music experiences. Users can explore new artists, generate party playlists, or describe a moment in plain language and receive songs that match their emotional state — with direct Spotify pre-listening and one-click playlist creation.

---

## Features

| Mode | Description |
|---|---|
| **Explore Mode** | Enter up to 5 artists and receive AI-curated recommendations with discovery filter (mainstream / underground / exotic) |
| **Party Mode** | Generate high-energy playlists based on your favorite artists, energy level, and desired track count |
| **Mood Mode** | Describe a moment or emotion in free text — the AI analyzes the emotional subtext and recommends 3 songs with an emotional bridge and lyric moment |

**Cross-cutting features:**
- Spotify OAuth 2.0 (Authorization Code Flow with PKCE) — connect your account to save any generated playlist directly to Spotify
- MusicBrainz Autocomplete on all artist input fields
- Spotify Track Embed (pre-listening) directly in Mood Mode song cards
- Artist enrichment via Spotify API → MusicBrainz → Wikidata (cascading fallback)
- Musical Reference option in Mood Mode (sonic style only, not emotional context)
- Discovery Filter in all modes: mainstream / underground / exotic

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Framer Motion, shadcn/ui |
| Backend | Node.js, Express 4, tRPC 11 |
| Database | MySQL / TiDB (via Drizzle ORM) |
| Auth | Manus OAuth (session cookies + JWT) |
| AI | LLM via Manus Forge API (structured JSON responses) |
| Music APIs | Spotify Web API, MusicBrainz, Wikidata |
| Testing | Vitest (79 tests) |
| Build | Vite 6, TypeScript 5 |

---

## Project Structure

```
client/
  src/
    pages/Home.tsx          ← Main app (all three modes)
    components/
      SpotifyEmbedCard.tsx  ← Artist & track embed player
      DashboardLayout.tsx   ← Reusable dashboard shell
    lib/trpc.ts             ← tRPC client binding
drizzle/
  schema.ts                 ← Database schema (users, spotify_sessions)
server/
  routers/
    sonicpulse.ts           ← explore / party / mood procedures
    spotifyAuth.ts          ← Spotify OAuth tRPC procedures
  artistService.ts          ← Cascading artist enrichment
  spotify.ts                ← Spotify API client
  musicbrainz.ts            ← MusicBrainz API client
  wikidata.ts               ← Wikidata fallback
  artistImage.ts            ← Artist image resolution
  spotifyPlaylist.ts        ← PKCE flow + playlist creation
  spotifyOAuthRoutes.ts     ← Express OAuth callback route
  *.test.ts                 ← Vitest test suites
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- MySQL / TiDB database
- Spotify Developer App ([create one here](https://developer.spotify.com/dashboard))

### Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

```env
# Database
DATABASE_URL=mysql://user:password@host:port/dbname

# Auth (Manus OAuth)
JWT_SECRET=your-jwt-secret
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# Spotify
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Manus Forge API (LLM + Storage)
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-server-side-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im

# App identity
OWNER_OPEN_ID=your-open-id
OWNER_NAME=your-name
VITE_APP_TITLE=SonicPulse
```

### Spotify Dashboard Setup

In your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add the following Redirect URI under **Edit Settings**:

```
http://localhost:3000/api/spotify/callback
```

For production, replace `http://localhost:3000` with your deployed domain.

> **Note:** In Development Mode, Spotify limits access to 25 whitelisted users. Add tester email addresses under **User Management** in the dashboard.

### Installation & Development

```bash
# Install dependencies
pnpm install

# Generate and apply database migrations
pnpm drizzle-kit generate
# Then apply the generated SQL via your database client or the Manus webdev_execute_sql tool

# Start the development server
pnpm dev
```

The app runs on `http://localhost:3000`.

### Running Tests

```bash
pnpm test
```

All 79 tests should pass. Test files are located in `server/*.test.ts`.

### Building for Production

```bash
pnpm build
pnpm start
```

---

## Architecture Notes

**Cascading Artist Enrichment:** When resolving an artist, the app first queries the Spotify Search API. If unavailable (rate limit or missing credentials), it falls back to MusicBrainz, then to Wikidata. This ensures artist images and profile links are available even without a valid Spotify token.

**Spotify OAuth PKCE Flow:** The app implements the Authorization Code Flow with PKCE entirely server-side. The session is stored in the database (`spotify_sessions` table) and identified by a UUID stored in the browser's `sessionStorage`. No tokens are ever exposed to the frontend.

**LLM Structured Output:** All AI calls use JSON Schema response format to guarantee type-safe, parseable responses. The mood analysis returns a strict schema with `emotionalProfile` and `songs` fields.

**tRPC End-to-End Types:** All procedures are defined in `server/routers/` and consumed via `trpc.*.useQuery/useMutation` hooks on the frontend. No REST routes, no manual type sharing.

---

## License

This project is provided for educational and experimental purposes. It is not affiliated with, endorsed by, or sponsored by Spotify AB. All music metadata and artist images are the property of their respective rights holders.

The Spotify name and logo are trademarks of Spotify AB. Usage of the Spotify Web API is subject to the [Spotify Developer Terms of Service](https://developer.spotify.com/terms).
