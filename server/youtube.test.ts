/**
 * Tests für die YouTube-Validierungslogik
 * Stellt sicher dass falsche Treffer (z.B. Jessie Reyez "COFFIN" für Band "C.O.F.F.I.N")
 * korrekt herausgefiltert werden.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Wir testen die interne Logik indirekt über die exportierte Funktion
// und mocken callDataApi

vi.mock("./_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

import { searchYouTubeVideoId } from "./youtube";
import { callDataApi } from "./_core/dataApi";

const mockCallDataApi = vi.mocked(callDataApi);

describe("searchYouTubeVideoId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt null zurück wenn keine Ergebnisse vorhanden", async () => {
    mockCallDataApi.mockResolvedValue({ contents: [] });
    const result = await searchYouTubeVideoId("UnknownBand");
    expect(result).toBeNull();
  });

  it("gibt null zurück wenn Ergebnis nicht zur Band passt (Jessie Reyez COFFIN für C.O.F.F.I.N)", async () => {
    // Simuliert den Bug: Jessie Reyez - COFFIN erscheint für Suche nach C.O.F.F.I.N
    mockCallDataApi.mockResolvedValue({
      contents: [
        {
          type: "video",
          video: {
            videoId: "wrong-video-id",
            title: "Jessie Reyez - COFFIN (Official Video)",
            channelTitle: "Jessie Reyez",
          },
        },
      ],
    });
    const result = await searchYouTubeVideoId("C.O.F.F.I.N");
    expect(result).toBeNull();
  });

  it("gibt Video-ID zurück wenn Channel-Name mit Bandnamen übereinstimmt", async () => {
    mockCallDataApi.mockResolvedValue({
      contents: [
        {
          type: "video",
          video: {
            videoId: "correct-video-id",
            title: "C.O.F.F.I.N - Deathwish (Official Music Video)",
            channelTitle: "COFFIN",
          },
        },
      ],
    });
    const result = await searchYouTubeVideoId("C.O.F.F.I.N");
    expect(result).toBe("correct-video-id");
  });

  it("gibt Video-ID zurück wenn Titel mit Bandnamen beginnt", async () => {
    mockCallDataApi.mockResolvedValue({
      contents: [
        {
          type: "video",
          video: {
            videoId: "correct-video-id",
            title: "Radiohead - Creep (Official Video)",
            channelTitle: "Radiohead",
          },
        },
      ],
    });
    const result = await searchYouTubeVideoId("Radiohead");
    expect(result).toBe("correct-video-id");
  });

  it("überspringt falschen Treffer und gibt nächsten validen zurück", async () => {
    mockCallDataApi
      .mockResolvedValueOnce({
        contents: [
          {
            type: "video",
            video: {
              videoId: "wrong-video-id",
              title: "Jessie Reyez - COFFIN (Official Video)",
              channelTitle: "Jessie Reyez",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        contents: [
          {
            type: "video",
            video: {
              videoId: "correct-video-id",
              title: "C.O.F.F.I.N - Live at Wacken",
              channelTitle: "COFFIN Official",
            },
          },
        ],
      });
    const result = await searchYouTubeVideoId("C.O.F.F.I.N");
    expect(result).toBe("correct-video-id");
  });

  it("gibt Video-ID zurück wenn Track-Titel angegeben und Treffer valide", async () => {
    mockCallDataApi.mockResolvedValue({
      contents: [
        {
          type: "video",
          video: {
            videoId: "track-video-id",
            title: "The Bronx - Heart Attack American (Official Video)",
            channelTitle: "The Bronx",
          },
        },
      ],
    });
    const result = await searchYouTubeVideoId("The Bronx", "Heart Attack American");
    expect(result).toBe("track-video-id");
  });

  it("gibt null zurück wenn API-Fehler auftritt und alle Queries scheitern", async () => {
    mockCallDataApi.mockRejectedValue(new Error("API error"));
    const result = await searchYouTubeVideoId("SomeBand");
    expect(result).toBeNull();
  });

  it("ignoriert non-video Einträge", async () => {
    mockCallDataApi.mockResolvedValue({
      contents: [
        { type: "playlist", video: undefined },
        { type: "channel", video: undefined },
        {
          type: "video",
          video: {
            videoId: "correct-video-id",
            title: "Nirvana - Smells Like Teen Spirit (Official Music Video)",
            channelTitle: "Nirvana",
          },
        },
      ],
    });
    const result = await searchYouTubeVideoId("Nirvana");
    expect(result).toBe("correct-video-id");
  });
});
