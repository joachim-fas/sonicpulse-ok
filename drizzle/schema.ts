import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Cache für validierte Spotify-Künstler */
export const artists = mysqlTable("artists", {
  id: int("id").autoincrement().primaryKey(),
  /** Spotify Artist ID (z.B. 4gzpq5YpGjS9uS06r8Iu0S) */
  spotifyId: varchar("spotifyId", { length: 64 }).notNull().unique(),
  /** Angezeigter Suchbegriff des Nutzers */
  displayName: varchar("displayName", { length: 255 }).notNull(),
  /** Offizieller Name auf Spotify */
  spotifyName: varchar("spotifyName", { length: 255 }).notNull(),
  /** Deep-Link zur Spotify-App */
  directLink: varchar("directLink", { length: 512 }).notNull(),
  /** URL zum Profilbild */
  imageUrl: text("imageUrl"),
  /** Genres als JSON-Array */
  genres: text("genres"),
  /** Follower-Anzahl */
  followers: int("followers"),
  /** Popularitätswert 0–100 */
  popularity: int("popularity"),
  /** Discogs Artist ID (optional) */
  discogsId: varchar("discogsId", { length: 64 }),
  /** Discogs-Biografie (optional) */
  discogsBio: text("discogsBio"),
  /** Zeitstempel der letzten Aktualisierung */
  cachedAt: timestamp("cachedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Artist = typeof artists.$inferSelect;
export type InsertArtist = typeof artists.$inferInsert;

/** Suchverlauf der Nutzer */
export const searchHistory = mysqlTable("search_history", {
  id: int("id").autoincrement().primaryKey(),
  query: varchar("query", { length: 255 }).notNull(),
  resultCount: int("resultCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
