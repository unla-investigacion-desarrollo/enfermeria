import { describe, expect, it } from "vitest";
import {
  checkpointForStep,
  clampPhaseIndex,
  clampStepToPhase,
  dailyCheckpoint,
  getReadingPlan,
  phaseIndexForStep,
} from "@/lib/techniques/reading-plan";

const SLUG = "via-periferica-adulto";

describe("getReadingPlan", () => {
  it("arma cinco fases consecutivas que cubren los 29 pasos", () => {
    const plan = getReadingPlan(SLUG, 29);

    expect(plan.specific).toBe(true);
    expect(plan.phases).toHaveLength(5);
    expect(plan.totalSteps).toBe(29);
    expect(plan.phases[0]?.from).toBe(0);
    expect(plan.phases.at(-1)?.to).toBe(28);

    for (let index = 1; index < plan.phases.length; index += 1) {
      expect(plan.phases[index]?.from).toBe(plan.phases[index - 1]!.to + 1);
    }
  });

  it("cuenta los checkpoints de todas las fases", () => {
    const plan = getReadingPlan(SLUG, 29);
    const total = plan.phases.reduce((sum, phase) => sum + phase.checkpoints.length, 0);

    expect(plan.checkpointCount).toBe(7);
    expect(total).toBe(plan.checkpointCount);
  });

  it("usa un plan genérico para otras técnicas", () => {
    const plan = getReadingPlan("otra-tecnica", 6);

    expect(plan.specific).toBe(false);
    expect(plan.phases).toHaveLength(1);
    expect(plan.phases[0]).toMatchObject({ from: 0, to: 5 });
    expect(plan.checkpointCount).toBe(0);
  });

  it("acota las fases y los checkpoints si hay menos pasos", () => {
    const plan = getReadingPlan(SLUG, 15);

    expect(plan.totalSteps).toBe(15);
    expect(plan.phases.at(-1)?.to).toBe(14);
    expect(plan.checkpointCount).toBe(2);
    expect(plan.phases.flatMap((phase) => phase.checkpoints.map((item) => item.id))).toEqual([
      "purga",
      "zonas-contraindicadas",
    ]);
  });

  it("nunca deja un plan sin fases", () => {
    const plan = getReadingPlan(SLUG, 0);

    expect(plan.phases.length).toBeGreaterThanOrEqual(1);
    expect(plan.totalSteps).toBe(1);
  });
});

describe("clampPhaseIndex", () => {
  const plan = getReadingPlan(SLUG, 29);

  it("acota al rango de fases", () => {
    expect(clampPhaseIndex(plan, -3)).toBe(0);
    expect(clampPhaseIndex(plan, 99)).toBe(plan.phases.length - 1);
    expect(clampPhaseIndex(plan, 2.9)).toBe(2);
  });

  it("cae en la primera fase con valores inválidos", () => {
    expect(clampPhaseIndex(plan, Number.NaN)).toBe(0);
    expect(clampPhaseIndex(plan, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("clampStepToPhase", () => {
  const plan = getReadingPlan(SLUG, 29);
  const phase = plan.phases[2]!;

  it("mantiene el paso dentro de la fase indicada", () => {
    expect(clampStepToPhase(plan, 2, phase.from - 5)).toBe(phase.from);
    expect(clampStepToPhase(plan, 2, phase.to + 5)).toBe(phase.to);
    expect(clampStepToPhase(plan, 2, phase.from + 2)).toBe(phase.from + 2);
  });

  it("usa el inicio de la fase con valores inválidos", () => {
    expect(clampStepToPhase(plan, 2, Number.NaN)).toBe(phase.from);
  });
});

describe("phaseIndexForStep", () => {
  const plan = getReadingPlan(SLUG, 29);

  it("encuentra la fase de cada paso", () => {
    for (const [index, phase] of plan.phases.entries()) {
      expect(phaseIndexForStep(plan, phase.from)).toBe(index);
      expect(phaseIndexForStep(plan, phase.to)).toBe(index);
    }
  });

  it("cae en la última fase si el paso está fuera del plan", () => {
    expect(phaseIndexForStep(plan, 999)).toBe(plan.phases.length - 1);
  });
});

describe("checkpointForStep", () => {
  const plan = getReadingPlan(SLUG, 29);
  const preparation = plan.phases[0]!;

  it("devuelve el checkpoint que corresponde al paso", () => {
    expect(checkpointForStep(preparation, 7)?.id).toBe("purga");
    expect(checkpointForStep(preparation, 6)).toBeNull();
  });
});

describe("dailyCheckpoint", () => {
  const plan = getReadingPlan(SLUG, 29);

  it("es estable para la misma fecha", () => {
    const first = dailyCheckpoint(plan, "2026-10-25");
    const second = dailyCheckpoint(plan, "2026-10-25");

    expect(first).not.toBeNull();
    expect(second?.checkpoint.id).toBe(first?.checkpoint.id);
  });

  it("recorre todos los checkpoints en fechas distintas", () => {
    const ids = new Set(
      ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map(
        (date) => dailyCheckpoint(plan, date)?.checkpoint.id,
      ),
    );

    expect(ids.size).toBeGreaterThan(1);
  });

  it("devuelve null cuando no hay checkpoints", () => {
    expect(dailyCheckpoint(getReadingPlan("otra-tecnica", 3), "2026-10-25")).toBeNull();
  });
});
