import { describe, expect, it } from "vitest";
import {
  readingFirstRefKey,
  readingVersionRefKey,
  videoRefKey,
  XP,
} from "@/lib/gamification/xp";
import { readingState } from "@/lib/techniques/reading";
import { matchesQuery, normalizeSearch } from "@/lib/techniques/search";

describe("readingState", () => {
  it("marca sin leer cuando no hay lecturas", () => {
    expect(readingState(null, 1)).toBe("unread");
    expect(readingState(undefined, 1)).toBe("unread");
  });

  it("marca leída cuando la última lectura es la versión actual", () => {
    expect(readingState(3, 3)).toBe("read");
    expect(readingState(4, 3)).toBe("read");
  });

  it("marca nueva versión cuando la lectura quedó atrás", () => {
    expect(readingState(2, 3)).toBe("outdated");
  });
});

describe("búsqueda de técnicas", () => {
  it("ignora mayúsculas y acentos", () => {
    expect(normalizeSearch("  VÍA Periférica ")).toBe("via periferica");
    expect(matchesQuery("Colocación de vía periférica", "VIA")).toBe(true);
    expect(matchesQuery("Colocación de vía periférica", "colocacion venosa")).toBe(false);
  });

  it("exige que aparezcan todas las palabras", () => {
    expect(matchesQuery("Colocación de vía periférica en adulto", "via adulto")).toBe(true);
    expect(matchesQuery("Colocación de vía periférica en adulto", "via pediatrico")).toBe(false);
  });

  it("una búsqueda vacía muestra todo", () => {
    expect(matchesQuery("Cualquier técnica", "   ")).toBe(true);
  });
});

describe("claves de XP", () => {
  it("usa los formatos acordados en el plan", () => {
    expect(readingFirstRefKey("tec1")).toBe("READING_FIRST:tec1");
    expect(readingVersionRefKey("tec1", 2)).toBe("READING_VERSION:tec1:2");
    expect(videoRefKey("vid1")).toBe("VIDEO:vid1");
  });

  it("mantiene los valores de XP del plan", () => {
    expect(XP.READING_FIRST).toBe(100);
    expect(XP.READING_VERSION).toBe(30);
    expect(XP.VIDEO).toBe(20);
  });
});
