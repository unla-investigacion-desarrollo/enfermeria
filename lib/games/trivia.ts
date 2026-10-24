/**
 * Lógica pura de la trivia. La selección de preguntas y el orden de las
 * opciones se derivan de una semilla, para que el servidor pueda reconstruir
 * la misma vista sin guardar estado entre el render y el envío.
 *
 * La respuesta correcta y la explicación nunca se envían antes de responder:
 * el cliente solo recibe el enunciado y las opciones mezcladas.
 */

export const DEFAULT_QUESTION_COUNT = 10;
export const MAX_QUESTION_COUNT = 50;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export type TriviaQuestionData = {
  id: string;
  prompt: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  reviewed: boolean;
};

/** Lo que ve el estudiante antes de responder. */
export type TriviaItem = {
  id: string;
  prompt: string;
  options: string[];
  reviewed: boolean;
};

/** Pregunta corregida que se muestra después de enviar la trivia. */
export type TriviaReviewItem = TriviaItem & {
  chosenIdx: number;
  correctIdx: number;
  explanation: string;
};

export function normalizeQuestionCount(value: unknown): number {
  const numeric = typeof value === "number" ? Math.floor(value) : DEFAULT_QUESTION_COUNT;
  if (!Number.isFinite(numeric)) return DEFAULT_QUESTION_COUNT;
  return Math.min(MAX_QUESTION_COUNT, Math.max(1, numeric));
}

/** Lee `config.questionCount` de una actividad sin confiar en su forma. */
export function questionCountFromConfig(config: unknown): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return normalizeQuestionCount((config as { questionCount?: unknown }).questionCount);
  }
  return normalizeQuestionCount(undefined);
}

/** Valida las opciones guardadas como JSON en la base. */
export function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((option): option is string => typeof option === "string" && option.trim().length > 0)
    .slice(0, MAX_OPTIONS);
}

/** FNV-1a: hash estable y sin dependencias para sembrar el PRNG. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** PRNG determinista (mulberry32) a partir de una semilla de texto. */
export function createRandom(seed: string): () => number {
  let state = hashString(seed) | 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sobre una copia, con el azar recibido. */
export function shuffleWith<T>(items: T[], random: () => number): T[] {
  const result = [...items];
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

/**
 * Elige las preguntas de la ronda. Se ordena por id antes de mezclar para que
 * el resultado no dependa del orden en que la base devolvió las filas.
 */
export function selectTriviaQuestions<T extends { id: string }>(
  questions: T[],
  count: number,
  seed: string,
): T[] {
  const ordered = [...questions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const shuffled = shuffleWith(ordered, createRandom(`select:${seed}`));
  return shuffled.slice(0, Math.min(normalizeQuestionCount(count), shuffled.length));
}

/**
 * Orden de las opciones para una pregunta. Cada pregunta mezcla distinto
 * aunque comparta la semilla de la ronda.
 */
export function optionOrder(
  questionId: string,
  optionCount: number,
  seed: string,
): number[] {
  const indices = Array.from({ length: Math.max(0, optionCount) }, (_, index) => index);
  return shuffleWith(indices, createRandom(`options:${seed}:${questionId}`));
}

/** Posición de la opción correcta dentro de la vista mezclada. */
export function shuffledCorrectIdx(question: TriviaQuestionData, seed: string): number {
  const order = optionOrder(question.id, question.options.length, seed);
  return order.indexOf(question.correctIdx);
}

function assertCorrectShape(question: TriviaQuestionData): void {
  if (question.correctIdx < 0 || question.correctIdx >= question.options.length) {
    throw new Error(`La pregunta ${question.id} tiene un índice correcto inválido.`);
  }
}

/** Construye la vista pública de una pregunta (sin respuesta ni explicación). */
export function buildTriviaItem(question: TriviaQuestionData, seed: string): TriviaItem {
  assertCorrectShape(question);
  const order = optionOrder(question.id, question.options.length, seed);

  return {
    id: question.id,
    prompt: question.prompt,
    options: order.map((index) => question.options[index] ?? ""),
    reviewed: question.reviewed,
  };
}

/** Puntaje entero 0–100, redondeado, sobre la cantidad de preguntas. */
export function scoreTrivia(correctCount: number, total: number): number {
  if (total <= 0) return 0;
  const safeCorrect = Math.min(total, Math.max(0, correctCount));
  return Math.round((safeCorrect / total) * 100);
}

export type TriviaAnswerInput = { questionId: string; chosenIdx: number };

export type TriviaCorrection = {
  item: TriviaReviewItem;
  correct: boolean;
};

/**
 * Corrige las respuestas enviadas contra las preguntas de la base. El índice
 * elegido por el estudiante está en el espacio mezclado que vio en pantalla.
 */
export function correctTrivia(
  questions: TriviaQuestionData[],
  answers: TriviaAnswerInput[],
  seed: string,
): TriviaCorrection[] {
  const answerById = new Map(answers.map((answer) => [answer.questionId, answer.chosenIdx]));

  return questions.map((question) => {
    const item = buildTriviaItem(question, seed);
    const chosenIdx = answerById.get(question.id) ?? -1;
    const correctIdx = shuffledCorrectIdx(question, seed);

    return {
      item: {
        ...item,
        chosenIdx,
        correctIdx,
        explanation: question.explanation,
      },
      correct: chosenIdx === correctIdx && correctIdx >= 0,
    };
  });
}
