import { describe, expect, it } from "vitest";
import { evaluateBadgeRules, type BadgeRuleInput } from "@/lib/gamification/badges";
import { getLevel, LEVELS } from "@/lib/gamification/levels";
import { masteredRefKey, XP } from "@/lib/gamification/xp";

describe("getLevel", () => {
  it("arranca en Ingresante sin XP", () => {
    const info = getLevel(0);
    expect(info.level).toBe(1);
    expect(info.name).toBe("Ingresante");
    expect(info.nextLevel?.name).toBe("Practicante");
    expect(info.xpToNext).toBe(150);
    expect(info.progressPercent).toBe(0);
  });

  it("calcula el avance dentro del nivel", () => {
    const info = getLevel(149);
    expect(info.level).toBe(1);
    expect(info.xpToNext).toBe(1);
    expect(info.progressPercent).toBe(99);
  });

  it("sube de nivel en los umbrales del plan", () => {
    expect(getLevel(150).level).toBe(2);
    expect(getLevel(400).level).toBe(3);
    expect(getLevel(800).level).toBe(4);
    expect(getLevel(1500).level).toBe(5);
  });

  it("mantiene el nivel máximo", () => {
    const info = getLevel(2200);
    expect(info.level).toBe(5);
    expect(info.name).toBe("Referente");
    expect(info.nextLevel).toBeNull();
    expect(info.xpToNext).toBe(0);
    expect(info.progressPercent).toBe(100);
  });

  it("no rompe con XP negativo o decimal", () => {
    expect(getLevel(-50).xp).toBe(0);
    expect(getLevel(150.9).level).toBe(2);
  });

  it("define los cinco niveles del manual", () => {
    expect(LEVELS.map((level) => level.name)).toEqual([
      "Ingresante",
      "Practicante",
      "Asistente",
      "Avanzado/a",
      "Referente",
    ]);
  });
});

function rules(overrides: Partial<BadgeRuleInput> = {}): BadgeRuleInput {
  return {
    readingCounts: new Map(),
    passedOrder: new Set(),
    passedTrivia: new Set(),
    perfectOrder: new Set(),
    perfectTrivia: new Set(),
    techniques: [{ id: "tec1", slug: "via-periferica", title: "Vía periférica" }],
    ...overrides,
  };
}

describe("evaluateBadgeRules", () => {
  it("otorga la insignia de primera lectura", () => {
    const codes = evaluateBadgeRules(rules({ readingCounts: new Map([["tec1", 1]]) }));
    expect(codes).toContain("FIRST_READING");
    expect(codes).not.toContain("REVIEWER");
  });

  it("otorga REVIEWER a las tres lecturas de la misma técnica", () => {
    const codes = evaluateBadgeRules(rules({ readingCounts: new Map([["tec1", 3]]) }));
    expect(codes).toContain("REVIEWER");
  });

  it("otorga las insignias de 100% en los juegos", () => {
    const codes = evaluateBadgeRules(
      rules({ perfectOrder: new Set(["tec1"]), perfectTrivia: new Set(["tec1"]) }),
    );
    expect(codes).toContain("ORDERED_MIND");
    expect(codes).toContain("TRIVIA_STAR");
  });

  it("otorga MASTER solo con lectura y los dos juegos aprobados", () => {
    const complete = evaluateBadgeRules(
      rules({
        readingCounts: new Map([["tec1", 1]]),
        passedOrder: new Set(["tec1"]),
        passedTrivia: new Set(["tec1"]),
      }),
    );
    expect(complete).toContain("MASTER_via-periferica");

    const withoutReading = evaluateBadgeRules(
      rules({
        passedOrder: new Set(["tec1"]),
        passedTrivia: new Set(["tec1"]),
      }),
    );
    expect(withoutReading).not.toContain("MASTER_via-periferica");
  });

  it("no inventa insignias sin actividad", () => {
    expect(evaluateBadgeRules(rules())).toEqual([]);
  });
});

describe("XP de técnica dominada", () => {
  it("usa la refKey y el monto del plan", () => {
    expect(XP.MASTERED).toBe(200);
    expect(masteredRefKey("tec1")).toBe("MASTERED:tec1");
  });
});
