/** Utilidades puras del juego "Ordená los pasos". */

export type StepLike = { id: string };

export type OrderBlock = {
  blockStart: number;
  correctIds: string[];
  shuffledIds: string[];
};

export const DEFAULT_BLOCK_SIZE = 8;

export function normalizeBlockSize(value: unknown): number {
  const numeric = typeof value === "number" ? Math.floor(value) : DEFAULT_BLOCK_SIZE;
  if (!Number.isFinite(numeric)) return DEFAULT_BLOCK_SIZE;
  return Math.min(20, Math.max(2, numeric));
}

/** Lee `config.blockSize` de una actividad sin confiar en su forma. */
export function blockSizeFromConfig(config: unknown): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return normalizeBlockSize((config as { blockSize?: unknown }).blockSize);
  }
  return normalizeBlockSize(undefined);
}

function shuffleIds(ids: string[], random: () => number): string[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.min(index, Math.floor(random() * (index + 1)));
    const current = result[index];
    const replacement = result[target];
    if (current === undefined || replacement === undefined) continue;
    result[index] = replacement;
    result[target] = current;
  }
  return result;
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Ids del bloque correcto, a partir de la posición inicial elegida. */
export function blockStepIds(
  steps: StepLike[],
  blockStart: number,
  blockSize: number,
): string[] | null {
  const size = Math.min(normalizeBlockSize(blockSize), steps.length);
  if (!Number.isInteger(blockStart) || blockStart < 0 || blockStart + size > steps.length) {
    return null;
  }
  return steps.slice(blockStart, blockStart + size).map((step) => step.id);
}

/**
 * Elige un bloque consecutivo al azar y devuelve sus ids mezclados. La mezcla
 * nunca queda igual al orden correcto: se reintenta y, como último recurso, se
 * intercambian los dos primeros pasos.
 */
export function buildOrderStepsBlock(
  steps: StepLike[],
  blockSize: number,
  random: () => number = Math.random,
): OrderBlock {
  const size = Math.min(normalizeBlockSize(blockSize), steps.length);
  if (size === 0) return { blockStart: 0, correctIds: [], shuffledIds: [] };

  const maxStart = steps.length - size;
  const blockStart = Math.min(maxStart, Math.max(0, Math.floor(random() * (maxStart + 1))));
  const correctIds = steps.slice(blockStart, blockStart + size).map((step) => step.id);

  let shuffledIds = shuffleIds(correctIds, random);
  for (let attempt = 0; attempt < 20 && sameOrder(shuffledIds, correctIds); attempt += 1) {
    shuffledIds = shuffleIds(correctIds, random);
  }

  if (sameOrder(shuffledIds, correctIds) && correctIds.length > 1) {
    const [first, second] = correctIds;
    if (first !== undefined && second !== undefined) {
      shuffledIds = [...correctIds];
      shuffledIds[0] = second;
      shuffledIds[1] = first;
    }
  }

  return { blockStart, correctIds, shuffledIds };
}

export function isValidProposedOrder(
  proposedIds: string[],
  correctIds: string[],
): boolean {
  if (proposedIds.length !== correctIds.length) return false;
  if (new Set(proposedIds).size !== proposedIds.length) return false;
  const correct = new Set(correctIds);
  return proposedIds.every((id) => correct.has(id));
}

/** Longitud de la subsecuencia creciente más larga (patience sorting). */
export function lisLength(values: number[]): number {
  const tails: number[] = [];

  for (const value of values) {
    let low = 0;
    let high = tails.length;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = tails[middle];
      if (candidate !== undefined && candidate < value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    tails[low] = value;
  }

  return tails.length;
}

/**
 * Puntaje = LIS del orden propuesto respecto del correcto / n * 100,
 * redondeado. Un orden perfecto da 100.
 */
export function scoreOrder(proposedIds: string[], correctIds: string[]): number {
  if (proposedIds.length === 0 || proposedIds.length !== correctIds.length) return 0;

  const correctIndex = new Map(correctIds.map((id, index) => [id, index]));
  const sequence: number[] = [];

  for (const id of proposedIds) {
    const value = correctIndex.get(id);
    if (value === undefined) return 0;
    sequence.push(value);
  }

  return Math.round((lisLength(sequence) / sequence.length) * 100);
}
