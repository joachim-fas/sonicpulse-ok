/**
 * Tests für Wikidata Artist-Lookup (P1902 Spotify Artist ID)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchWikidataArtist } from "./wikidata";

// Wikidata-Antwort für Radiohead (Q44190)
const MOCK_SEARCH_RESPONSE = {
  search: [{ id: "Q44190", label: "Radiohead" }],
};

const MOCK_ENTITY_RESPONSE = {
  entities: {
    Q44190: {
      claims: {
        P1902: [
          {
            mainsnak: {
              datavalue: { value: "4Z8W4fKeB5YxbusRsdQVPb" },
            },
          },
        ],
      },
      labels: {
        en: { value: "Radiohead" },
      },
    },
  },
};

const MOCK_ENTITY_NO_SPOTIFY = {
  entities: {
    Q99999: {
      claims: {},
      labels: { en: { value: "Unknown Band" } },
    },
  },
};

describe("searchWikidataArtist", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("gibt echte Spotify-ID und Direct-Link zurück", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, json: async () => MOCK_SEARCH_RESPONSE } as Response;
      }
      return { ok: true, json: async () => MOCK_ENTITY_RESPONSE } as Response;
    });

    const result = await searchWikidataArtist("Radiohead");

    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBe("4Z8W4fKeB5YxbusRsdQVPb");
    expect(result!.direct_link).toBe("https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb");
    expect(result!.name).toBe("Radiohead");
    expect(result!.qid).toBe("Q44190");
  });

  it("direct_link enthält NIEMALS /search/", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", async () => {
      callCount++;
      if (callCount === 1) return { ok: true, json: async () => MOCK_SEARCH_RESPONSE } as Response;
      return { ok: true, json: async () => MOCK_ENTITY_RESPONSE } as Response;
    });

    const result = await searchWikidataArtist("Radiohead");
    expect(result!.direct_link).not.toContain("/search/");
    expect(result!.direct_link).toMatch(/^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+$/);
  });

  it("gibt null zurück wenn kein Suchergebnis", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ search: [] }),
    } as Response));

    const result = await searchWikidataArtist("xyznonexistentband123");
    expect(result).toBeNull();
  });

  it("gibt null zurück wenn keine P1902-Claim vorhanden", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, json: async () => ({ search: [{ id: "Q99999", label: "Unknown Band" }] }) } as Response;
      }
      return { ok: true, json: async () => MOCK_ENTITY_NO_SPOTIFY } as Response;
    });

    const result = await searchWikidataArtist("Unknown Band");
    expect(result).toBeNull();
  });

  it("wirft Fehler bei HTTP-Fehler", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response));

    await expect(searchWikidataArtist("Radiohead")).rejects.toThrow("503");
  });
});
