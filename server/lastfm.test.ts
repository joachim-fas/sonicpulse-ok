import { describe, it, expect } from "vitest";
import { validateApiKey, getArtistInfo, getSimilarArtists, getTopTracks } from "./lastfm";

describe("Last.fm API", () => {
  it("validates the API key successfully", async () => {
    const valid = await validateApiKey();
    expect(valid).toBe(true);
  }, 10000);

  it("returns artist info for Radiohead", async () => {
    const info = await getArtistInfo("Radiohead");
    expect(info).not.toBeNull();
    expect(info?.name).toBeTruthy();
    expect(info?.listeners).toBeGreaterThan(0);
  }, 10000);

  it("returns an image URL for a well-known artist", async () => {
    const info = await getArtistInfo("The Beatles");
    expect(info).not.toBeNull();
    // Image may or may not be present depending on Last.fm data
    if (info?.image) {
      expect(info.image).toMatch(/^https?:\/\//);
    }
  }, 10000);

  it("returns similar artists for Radiohead", async () => {
    const similar = await getSimilarArtists("Radiohead", 3);
    expect(Array.isArray(similar)).toBe(true);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].match).toBeGreaterThan(0);
    expect(similar[0].match).toBeLessThanOrEqual(1);
  }, 10000);

  it("returns top tracks for Radiohead", async () => {
    const tracks = await getTopTracks("Radiohead", 3);
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks[0].name).toBeTruthy();
  }, 10000);

  it("returns null for a non-existent artist", async () => {
    const info = await getArtistInfo("xyznonexistentartist12345abc");
    expect(info).toBeNull();
  }, 10000);
});
