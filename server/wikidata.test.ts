/**
 * Tests für Wikidata Artist-Lookup (P1902 Spotify Artist ID)
 * v2: Prüft bis zu 5 Kandidaten, bevorzugt Musik-Kandidaten
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchWikidataArtist } from "./wikidata";

// ─── Mock-Daten ────────────────────────────────────────────────────────────────

const MOCK_SEARCH_SINGLE = {
  search: [{ id: "Q44190", label: "Radiohead", description: "English rock band" }],
};

const MOCK_SEARCH_MULTI = {
  search: [
    { id: "Q11111", label: "Amyl", description: "given name" },
    { id: "Q22222", label: "Amyl and the Sniffers", description: "Australian punk band" },
    { id: "Q33333", label: "Amyl nitrite", description: "chemical compound" },
  ],
};

const MOCK_SEARCH_FIRST_NO_SPOTIFY = {
  search: [
    { id: "Q00001", label: "Goat Girl", description: "film" },
    { id: "Q00002", label: "Goat Girl", description: "British band" },
  ],
};

const MOCK_ENTITY_RADIOHEAD = {
  entities: {
    Q44190: {
      claims: {
        P1902: [{ mainsnak: { datavalue: { value: "4Z8W4fKeB5YxbusRsdQVPb" } } }],
      },
    },
  },
};

const MOCK_ENTITY_NO_SPOTIFY_Q99999 = {
  entities: {
    Q99999: { claims: {} },
  },
};

const MOCK_ENTITY_AMYL = {
  entities: {
    Q22222: {
      claims: {
        P1902: [{ mainsnak: { datavalue: { value: "6Aa17I1KqDT8QXJkm5YQHF" } } }],
      },
    },
  },
};

const MOCK_ENTITY_GOAT_GIRL = {
  entities: {
    Q00002: {
      claims: {
        P1902: [{ mainsnak: { datavalue: { value: "7uIbLdzzSEqnX0Pkrb56cR" } } }],
      },
    },
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("searchWikidataArtist – Grundfunktionen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("gibt echte Spotify-ID und Direct-Link zurück", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", async () => {
      callCount++;
      if (callCount === 1) return { ok: true, json: async () => MOCK_SEARCH_SINGLE } as Response;
      return { ok: true, json: async () => MOCK_ENTITY_RADIOHEAD } as Response;
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
      if (callCount === 1) return { ok: true, json: async () => MOCK_SEARCH_SINGLE } as Response;
      return { ok: true, json: async () => MOCK_ENTITY_RADIOHEAD } as Response;
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

  it("gibt null zurück wenn keine P1902-Claim vorhanden (einzelner Kandidat)", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, json: async () => ({ search: [{ id: "Q99999", label: "Unknown Band", description: "unknown" }] }) } as Response;
      }
      return { ok: true, json: async () => MOCK_ENTITY_NO_SPOTIFY_Q99999 } as Response;
    });
    const result = await searchWikidataArtist("Unknown Band");
    expect(result).toBeNull();
  });

  it("wirft Fehler bei HTTP-Fehler der Suche", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response));
    await expect(searchWikidataArtist("Radiohead")).rejects.toThrow("503");
  });
});

describe("searchWikidataArtist – Multi-Kandidaten-Logik (v2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("findet Spotify-ID beim zweiten Kandidaten wenn erster keinen hat", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("wbsearchentities")) {
        return { ok: true, json: async () => MOCK_SEARCH_FIRST_NO_SPOTIFY } as Response;
      }
      if (url.includes("ids=Q00001")) {
        return { ok: true, json: async () => ({ entities: { Q00001: { claims: {} } } }) } as Response;
      }
      if (url.includes("ids=Q00002")) {
        return { ok: true, json: async () => MOCK_ENTITY_GOAT_GIRL } as Response;
      }
      return { ok: true, json: async () => ({ entities: {} }) } as Response;
    });

    const result = await searchWikidataArtist("Goat Girl");
    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBe("7uIbLdzzSEqnX0Pkrb56cR");
    expect(result!.direct_link).toBe("https://open.spotify.com/artist/7uIbLdzzSEqnX0Pkrb56cR");
  });

  it("priorisiert Musik-Kandidaten (Band-Beschreibung) über andere Kandidaten", async () => {
    const checkedIds: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("wbsearchentities")) {
        return { ok: true, json: async () => MOCK_SEARCH_MULTI } as Response;
      }
      if (url.includes("ids=Q22222")) {
        checkedIds.push("Q22222");
        return { ok: true, json: async () => MOCK_ENTITY_AMYL } as Response;
      }
      if (url.includes("ids=Q11111")) {
        checkedIds.push("Q11111");
        return { ok: true, json: async () => ({ entities: { Q11111: { claims: {} } } }) } as Response;
      }
      return { ok: true, json: async () => ({ entities: {} }) } as Response;
    });

    const result = await searchWikidataArtist("Amyl and the Sniffers");
    expect(result).not.toBeNull();
    expect(result!.spotify_id).toBe("6Aa17I1KqDT8QXJkm5YQHF");
    // Q22222 (Musik-Kandidat "punk band") sollte zuerst geprüft worden sein
    expect(checkedIds[0]).toBe("Q22222");
  });

  it("gibt null zurück wenn kein Kandidat eine Spotify-ID hat", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("wbsearchentities")) {
        return { ok: true, json: async () => MOCK_SEARCH_MULTI } as Response;
      }
      return { ok: true, json: async () => ({
        entities: {
          Q11111: { claims: {} },
          Q22222: { claims: {} },
          Q33333: { claims: {} },
        }
      }) } as Response;
    });

    const result = await searchWikidataArtist("Amyl");
    expect(result).toBeNull();
  });
});
