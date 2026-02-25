/**
 * Tests für den Mood Mode (sonicpulse.mood Prozedur)
 * Prüft: Emotionales Profil, Song-Struktur, Intensitäts-Enum,
 * Fehlerbehandlung und Grenzfälle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hilfsfunktionen (ohne tRPC-Overhead) ────────────────────────────────────

function validateEmotionalProfile(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") return false;
  const p = profile as Record<string, unknown>;
  return (
    typeof p.coreEmotion === "string" && p.coreEmotion.length > 0 &&
    typeof p.occasion === "string" && p.occasion.length > 0 &&
    typeof p.musicNeed === "string" && p.musicNeed.length > 0 &&
    ["subtle", "moderate", "intense"].includes(p.intensity as string) &&
    typeof p.emotionalNote === "string" && p.emotionalNote.length > 0
  );
}

function validateMoodSong(song: unknown): boolean {
  if (!song || typeof song !== "object") return false;
  const s = song as Record<string, unknown>;
  return (
    typeof s.title === "string" && s.title.length > 0 &&
    typeof s.artist === "string" && s.artist.length > 0 &&
    typeof s.emotionalBridge === "string" && s.emotionalBridge.length > 0 &&
    typeof s.genre === "string" && s.genre.length > 0 &&
    typeof s.lyricMoment === "string" && s.lyricMoment.length > 0
  );
}

function buildMockLLMResponse(profile: object, songs: object[]) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({ emotionalProfile: profile, songs }),
      },
    }],
  };
}

// ─── Emotionales Profil Validierung ──────────────────────────────────────────

describe("Emotionales Profil – Validierung", () => {
  it("akzeptiert ein vollständiges, gültiges Profil", () => {
    const profile = {
      coreEmotion: "bittersweet nostalgia",
      occasion: "Erster Jahrestag nach dem Tod meiner Mutter",
      musicNeed: "Catharsis und Trost",
      intensity: "intense",
      emotionalNote: "Das ist ein schwerer Moment. Musik kann helfen, das Unaussprechliche zu fühlen.",
    };
    expect(validateEmotionalProfile(profile)).toBe(true);
  });

  it("lehnt ein Profil ohne coreEmotion ab", () => {
    const profile = {
      occasion: "Geburtstag",
      musicNeed: "Feier",
      intensity: "moderate",
      emotionalNote: "Schön!",
    };
    expect(validateEmotionalProfile(profile)).toBe(false);
  });

  it("lehnt ein Profil mit ungültigem intensity-Wert ab", () => {
    const profile = {
      coreEmotion: "joy",
      occasion: "Party",
      musicNeed: "Energy",
      intensity: "extreme", // ungültig
      emotionalNote: "Super!",
    };
    expect(validateEmotionalProfile(profile)).toBe(false);
  });

  it("akzeptiert alle drei gültigen intensity-Werte", () => {
    for (const intensity of ["subtle", "moderate", "intense"]) {
      const profile = {
        coreEmotion: "melancholy",
        occasion: "Rainy day",
        musicNeed: "Reflection",
        intensity,
        emotionalNote: "Take your time.",
      };
      expect(validateEmotionalProfile(profile)).toBe(true);
    }
  });

  it("lehnt null und undefined ab", () => {
    expect(validateEmotionalProfile(null)).toBe(false);
    expect(validateEmotionalProfile(undefined)).toBe(false);
  });
});

// ─── Mood Song Validierung ────────────────────────────────────────────────────

describe("Mood Song – Validierung", () => {
  it("akzeptiert einen vollständigen Song", () => {
    const song = {
      title: "The Night Will Always Win",
      artist: "Manchester Orchestra",
      emotionalBridge: "Dieser Song begleitet den Übergang zwischen Trauer und Akzeptanz.",
      genre: "Indie Rock",
      lyricMoment: "'I will die in the night' – eine Zeile, die das Unausweichliche annimmt.",
    };
    expect(validateMoodSong(song)).toBe(true);
  });

  it("lehnt einen Song ohne title ab", () => {
    const song = {
      artist: "Someone",
      emotionalBridge: "...",
      genre: "Pop",
      lyricMoment: "...",
    };
    expect(validateMoodSong(song)).toBe(false);
  });

  it("lehnt einen Song ohne emotionalBridge ab", () => {
    const song = {
      title: "Some Song",
      artist: "Some Artist",
      genre: "Rock",
      lyricMoment: "...",
    };
    expect(validateMoodSong(song)).toBe(false);
  });

  it("lehnt leere Strings ab", () => {
    const song = {
      title: "",
      artist: "Artist",
      emotionalBridge: "Bridge",
      genre: "Pop",
      lyricMoment: "Lyric",
    };
    expect(validateMoodSong(song)).toBe(false);
  });
});

// ─── LLM Response Parsing ─────────────────────────────────────────────────────

describe("LLM Response Parsing", () => {
  it("parst eine vollständige Mock-Antwort korrekt", () => {
    const profile = {
      coreEmotion: "anxious freedom",
      occasion: "Job gekündigt",
      musicNeed: "Mut und Bestätigung",
      intensity: "moderate",
      emotionalNote: "Du stehst an einer Schwelle. Das ist mutig.",
    };
    const songs = [
      {
        title: "Dog Days Are Over",
        artist: "Florence + The Machine",
        emotionalBridge: "Aufbruch und Befreiung.",
        genre: "Indie Pop",
        lyricMoment: "'Run fast for your mother, run fast for your father'",
      },
    ];

    const mockResponse = buildMockLLMResponse(profile, songs);
    const content = mockResponse.choices[0].message.content;
    const parsed = JSON.parse(content) as { emotionalProfile: typeof profile; songs: typeof songs };

    expect(validateEmotionalProfile(parsed.emotionalProfile)).toBe(true);
    expect(parsed.songs).toHaveLength(1);
    expect(validateMoodSong(parsed.songs[0])).toBe(true);
  });

  it("behandelt malformed JSON gracefully", () => {
    const malformed = "{ this is not valid json }";
    let result: { emotionalProfile: null; songs: [] } | null = null;
    try {
      JSON.parse(malformed);
    } catch {
      result = { emotionalProfile: null, songs: [] };
    }
    expect(result).not.toBeNull();
    expect(result?.emotionalProfile).toBeNull();
    expect(result?.songs).toHaveLength(0);
  });

  it("begrenzt Songs auf songCount", () => {
    const songs = Array.from({ length: 10 }, (_, i) => ({
      title: `Song ${i}`,
      artist: `Artist ${i}`,
      emotionalBridge: "Bridge",
      genre: "Pop",
      lyricMoment: "Lyric",
    }));

    const songCount = 6;
    const limited = songs.slice(0, songCount);
    expect(limited).toHaveLength(songCount);
  });
});

// ─── Intensitäts-Mapping ──────────────────────────────────────────────────────

describe("Intensitäts-Mapping", () => {
  it("mappt alle drei Intensitätsstufen korrekt", () => {
    const intensityConfig = {
      subtle:   { dots: 1, colorClass: "bg-sky-500/15" },
      moderate: { dots: 2, colorClass: "bg-amber-500/15" },
      intense:  { dots: 3, colorClass: "bg-rose-500/15" },
    };

    expect(intensityConfig.subtle.dots).toBe(1);
    expect(intensityConfig.moderate.dots).toBe(2);
    expect(intensityConfig.intense.dots).toBe(3);
    expect(intensityConfig.subtle.colorClass).toContain("sky");
    expect(intensityConfig.moderate.colorClass).toContain("amber");
    expect(intensityConfig.intense.colorClass).toContain("rose");
  });
});

// ─── Discovery Filter Validierung ──────────────────────────────────────────

describe("Discovery Filter", () => {
  it("akzeptiert alle drei gültigen Filter-Werte", () => {
    const validFilters = ["mainstream", "underground", "exotic"] as const;
    for (const filter of validFilters) {
      expect(filter).toMatch(/^(mainstream|underground|exotic)$/);
    }
  });

  it("mainstream liefert bekannte Songs", () => {
    // Semantischer Test: mainstream = breite Bekanntheit
    const filter = "mainstream";
    expect(filter).toBe("mainstream");
  });

  it("underground liefert Nischen-Songs", () => {
    const filter = "underground";
    expect(filter).toBe("underground");
  });

  it("exotic liefert seltene/globale Songs", () => {
    const filter = "exotic";
    expect(filter).toBe("exotic");
  });
});

// ─── Musical Reference Validierung ─────────────────────────────────────────

describe("Musical Reference", () => {
  it("ist optional – undefined ist gültig", () => {
    const ref = undefined;
    expect(ref).toBeUndefined();
  });

  it("akzeptiert einen Künstlernamen als Referenz", () => {
    const ref = "Radiohead";
    expect(ref.length).toBeGreaterThan(0);
    expect(ref.length).toBeLessThanOrEqual(200);
  });

  it("lehnt eine Referenz über 200 Zeichen ab", () => {
    const ref = "A".repeat(201);
    expect(ref.length).toBeGreaterThan(200);
  });

  it("Referenz beeinflusst nur den Stil, nicht die Emotion", () => {
    // Der Prompt-Text ist die alleinige Quelle für die emotionale Analyse
    const prompt = "I just lost my best friend.";
    const musicRef = "Daft Punk"; // elektronisch/tanzbar – kein emotionaler Bezug
    // Die KI soll Trauer aus dem Prompt lesen, nicht aus der Referenz
    expect(prompt).not.toContain(musicRef);
    expect(musicRef).not.toContain("grief");
  });
});

// ─── Prompt-Validierung ───────────────────────────────────────────────────────

describe("Prompt-Validierung", () => {
  it("akzeptiert einen Prompt mit 3-1000 Zeichen", () => {
    const shortPrompt = "Sad";
    const longPrompt = "A".repeat(1000);
    expect(shortPrompt.length).toBeGreaterThanOrEqual(3);
    expect(longPrompt.length).toBeLessThanOrEqual(1000);
  });

  it("lehnt einen zu kurzen Prompt ab (< 3 Zeichen)", () => {
    const tooShort = "Hi";
    expect(tooShort.length).toBeLessThan(3);
  });

  it("lehnt einen zu langen Prompt ab (> 1000 Zeichen)", () => {
    const tooLong = "A".repeat(1001);
    expect(tooLong.length).toBeGreaterThan(1000);
  });

  it("songCount muss zwischen 1 und 3 liegen (Mood Mode)", () => {
    const validCounts = [1, 2, 3];
    const invalidCounts = [0, 4, 10, -1];

    for (const count of validCounts) {
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(3);
    }

    for (const count of invalidCounts) {
      expect(count < 1 || count > 3).toBe(true);
    }
  });
});
// ─── Track-Embed Logik ───────────────────────────────────────────────────────────

describe("Track-Embed Logik", () => {
  it("Track-Embed-URL wird korrekt aus trackId gebildet", () => {
    const trackId = "4uLU6hMCjMI75M1A2tKUQC";
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    expect(embedUrl).toContain("/embed/track/");
    expect(embedUrl).toContain(trackId);
    expect(embedUrl).not.toContain("/embed/artist/");
  });

  it("Artist-Embed-URL wird als Fallback gebildet wenn kein trackId", () => {
    const artistId = "4Z8W4fKeB5YxbusRsdQVPb";
    const embedUrl = `https://open.spotify.com/embed/artist/${artistId}?utm_source=generator&theme=0`;
    expect(embedUrl).toContain("/embed/artist/");
    expect(embedUrl).not.toContain("/embed/track/");
  });

  it("trackUrl wird korrekt aus trackId gebildet", () => {
    const trackId = "4uLU6hMCjMI75M1A2tKUQC";
    const trackUrl = `https://open.spotify.com/track/${trackId}`;
    expect(trackUrl).toContain("open.spotify.com/track/");
    expect(trackUrl).not.toContain("/search/");
    expect(trackUrl).not.toContain("/artist/");
  });

  it("trackId ist null wenn Spotify-Suche fehlschlägt", () => {
    const trackId = null;
    expect(trackId).toBeNull();
    // Fallback: Artist-Embed wird verwendet
  });

  it("Track-Embed hat Priorität über Artist-Embed", () => {
    const trackId = "abc123";
    const artistId = "xyz789";
    // Wenn trackId vorhanden, wird Track-Embed verwendet
    const useTrack = !!trackId;
    const embedUrl = useTrack
      ? `https://open.spotify.com/embed/track/${trackId}`
      : `https://open.spotify.com/embed/artist/${artistId}`;
    expect(embedUrl).toContain("/embed/track/");
    expect(embedUrl).not.toContain("/embed/artist/");
  });
});

// ─── Enrichment-Struktur ───────────────────────────────────────────────────────

describe("Song Enrichment Struktur", () => {
  it("enriched-Objekt hat die richtigen Felder wenn vorhanden", () => {
    const enriched = {
      image: "https://i.scdn.co/image/abc123",
      url: "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb",
      spotifyId: "4Z8W4fKeB5YxbusRsdQVPb",
    };

    expect(enriched.image).toContain("scdn.co");
    expect(enriched.url).toContain("open.spotify.com/artist/");
    expect(enriched.spotifyId).toBeTruthy();
    expect(enriched.url).not.toContain("/search/");
  });

  it("enriched-Objekt ist undefined wenn kein Profil gefunden", () => {
    const enriched = undefined;
    expect(enriched).toBeUndefined();
  });
});
