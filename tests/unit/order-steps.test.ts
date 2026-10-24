import { describe, expect, it } from "vitest";
import {
  blockStepIds,
  buildOrderStepsBlock,
  isValidProposedOrder,
  lisLength,
  normalizeBlockSize,
  scoreOrder,
} from "@/lib/games/order-steps";

const steps = Array.from({ length: 29 }, (_, index) => ({ id: `step-${index + 1}` }));
const correctBlock = steps.slice(0, 8).map((step) => step.id);

describe("lisLength", () => {
  it("calcula subsecuencias conocidas", () => {
    expect(lisLength([10, 9, 2, 5, 3, 7, 101, 18])).toBe(4);
    expect(lisLength([1, 2, 3, 4])).toBe(4);
    expect(lisLength([4, 3, 2, 1])).toBe(1);
    expect(lisLength([2, 1, 4, 3])).toBe(2);
    expect(lisLength([])).toBe(0);
  });
});

describe("scoreOrder", () => {
  it("da 100 con el orden correcto", () => {
    expect(scoreOrder(correctBlock, correctBlock)).toBe(100);
  });

  it("calcula el puntaje con LIS y redondeo", () => {
    const swapped = [...correctBlock];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(scoreOrder(swapped, correctBlock)).toBe(88);

    const reversed = [...correctBlock].reverse();
    expect(scoreOrder(reversed, correctBlock)).toBe(13);

    const sixOfEight = [
      correctBlock[0]!,
      correctBlock[1]!,
      correctBlock[2]!,
      correctBlock[3]!,
      correctBlock[4]!,
      correctBlock[7]!,
      correctBlock[6]!,
      correctBlock[5]!,
    ];
    expect(scoreOrder(sixOfEight, correctBlock)).toBe(75);
  });

  it("rechaza ids ajenos o cantidades distintas", () => {
    expect(scoreOrder(["otro"], correctBlock)).toBe(0);
    expect(scoreOrder(correctBlock.slice(0, 5), correctBlock)).toBe(0);
  });
});

describe("buildOrderStepsBlock", () => {
  it("elige ocho pasos consecutivos y los mezcla", () => {
    for (let start = 0; start < 22; start += 1) {
      const block = buildOrderStepsBlock(steps, 8, () => start / 22);
      expect(block.correctIds).toHaveLength(8);
      expect(new Set(block.shuffledIds)).toEqual(new Set(block.correctIds));
      expect(block.shuffledIds).not.toEqual(block.correctIds);
      expect(block.blockStart).toBeGreaterThanOrEqual(0);
      expect(block.blockStart + 8).toBeLessThanOrEqual(steps.length);
    }
  });

  it("nunca devuelve la identidad aunque el azar sea degenerado", () => {
    const block = buildOrderStepsBlock(steps, 8, () => 0);
    expect(block.blockStart).toBe(0);
    expect(block.shuffledIds).not.toEqual(block.correctIds);
    expect(new Set(block.shuffledIds)).toEqual(new Set(block.correctIds));
  });

  it("usa todos los pasos si hay menos que el tamaño del bloque", () => {
    const short = steps.slice(0, 3);
    const block = buildOrderStepsBlock(short, 8, () => 0);
    expect(block.correctIds).toEqual(short.map((step) => step.id));
    expect(block.shuffledIds).toHaveLength(3);
  });

  it("valida el bloque contra la base", () => {
    expect(blockStepIds(steps, 0, 8)).toEqual(correctBlock);
    expect(blockStepIds(steps, 21, 8)).toHaveLength(8);
    expect(blockStepIds(steps, 22, 8)).toBeNull();
    expect(blockStepIds(steps, -1, 8)).toBeNull();
  });
});

describe("isValidProposedOrder", () => {
  it("acepta una permutación exacta del bloque", () => {
    expect(isValidProposedOrder([...correctBlock].reverse(), correctBlock)).toBe(true);
  });

  it("rechaza duplicados, faltantes y ajenos", () => {
    expect(isValidProposedOrder([...correctBlock.slice(0, 7), "step-99"], correctBlock)).toBe(
      false,
    );
    expect(isValidProposedOrder([...correctBlock.slice(0, 7), correctBlock[0]!], correctBlock)).toBe(
      false,
    );
    expect(isValidProposedOrder(correctBlock.slice(0, 7), correctBlock)).toBe(false);
  });
});

describe("normalizeBlockSize", () => {
  it("usa 8 por defecto y acota valores inválidos", () => {
    expect(normalizeBlockSize(undefined)).toBe(8);
    expect(normalizeBlockSize("10")).toBe(8);
    expect(normalizeBlockSize(0)).toBe(2);
    expect(normalizeBlockSize(50)).toBe(20);
    expect(normalizeBlockSize(8.9)).toBe(8);
  });
});
