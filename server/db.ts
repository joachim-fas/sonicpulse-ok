import { eq, desc, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, artists, searchHistory, InsertArtist, Artist } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Artist Cache helpers ─────────────────────────────────────────────────────

export async function getArtistBySpotifyId(spotifyId: string): Promise<Artist | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(artists).where(eq(artists.spotifyId, spotifyId)).limit(1);
  return result[0] ?? null;
}

export async function upsertArtist(data: InsertArtist): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(artists).values(data).onDuplicateKeyUpdate({
    set: {
      displayName: data.displayName,
      spotifyName: data.spotifyName,
      directLink: data.directLink,
      imageUrl: data.imageUrl,
      genres: data.genres,
      followers: data.followers,
      popularity: data.popularity,
      discogsId: data.discogsId,
      discogsBio: data.discogsBio,
      cachedAt: new Date(),
    },
  });
}

export async function searchCachedArtists(query: string): Promise<Artist[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(artists)
    .where(
      or(
        like(artists.spotifyName, `%${query}%`),
        like(artists.displayName, `%${query}%`)
      )
    )
    .limit(5);
}

export async function getRecentArtists(limit = 10): Promise<Artist[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(artists).orderBy(desc(artists.cachedAt)).limit(limit);
}

export async function logSearch(query: string, resultCount: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchHistory).values({ query, resultCount });
}
