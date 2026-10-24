import type { PrismaClient, TriviaQuestion } from "@prisma/client";

/**
 * Preguntas ficticias solo para e2e. No son contenido clínico: verifican el
 * flujo de la trivia mientras el banco del Apéndice B está pendiente.
 */
export const FIXTURE_PREFIX = "[e2e]";
export const FIXTURE_COUNT = 10;

export const TECHNIQUE_SLUG = "via-periferica-adulto";

export type TriviaFixtures = {
  questions: TriviaQuestion[];
  restore: () => Promise<void>;
};

export async function createTriviaFixtures(prisma: PrismaClient): Promise<TriviaFixtures> {
  const technique = await prisma.technique.findUniqueOrThrow({
    where: { slug: TECHNIQUE_SLUG },
    select: { id: true },
  });

  // Si hubiera preguntas reales cargadas, se desactivan durante la corrida y
  // se restauran al final, para que la ronda sea determinista.
  const previousActive = await prisma.triviaQuestion.findMany({
    where: {
      techniqueId: technique.id,
      active: true,
      NOT: { prompt: { startsWith: FIXTURE_PREFIX } },
    },
    select: { id: true },
  });

  if (previousActive.length > 0) {
    await prisma.triviaQuestion.updateMany({
      where: { id: { in: previousActive.map((question) => question.id) } },
      data: { active: false },
    });
  }

  await prisma.triviaQuestion.deleteMany({
    where: { techniqueId: technique.id, prompt: { startsWith: FIXTURE_PREFIX } },
  });

  await prisma.triviaQuestion.createMany({
    data: Array.from({ length: FIXTURE_COUNT }, (_, index) => ({
      techniqueId: technique.id,
      prompt: `${FIXTURE_PREFIX} Pregunta ${index + 1}: ¿cuál es la opción correcta?`,
      options: [
        `Opción A${index + 1}`,
        `Opción B${index + 1}`,
        `Opción C${index + 1}`,
        `Opción D${index + 1}`,
      ],
      correctIdx: index % 4,
      explanation: `Explicación de prueba ${index + 1}.`,
      // La última queda sin revisar para verificar la advertencia.
      reviewed: index < FIXTURE_COUNT - 1,
      active: true,
    })),
  });

  const questions = await prisma.triviaQuestion.findMany({
    where: { techniqueId: technique.id, prompt: { startsWith: FIXTURE_PREFIX } },
    orderBy: { prompt: "asc" },
  });

  return {
    questions,
    restore: async () => {
      await prisma.triviaQuestion.deleteMany({
        where: { techniqueId: technique.id, prompt: { startsWith: FIXTURE_PREFIX } },
      });

      if (previousActive.length > 0) {
        await prisma.triviaQuestion.updateMany({
          where: { id: { in: previousActive.map((question) => question.id) } },
          data: { active: true },
        });
      }
    },
  };
}

export function optionsOf(question: TriviaQuestion): string[] {
  return Array.isArray(question.options)
    ? question.options.filter((option): option is string => typeof option === "string")
    : [];
}

export function correctText(question: TriviaQuestion): string {
  return optionsOf(question)[question.correctIdx] ?? "";
}

export function wrongText(question: TriviaQuestion): string {
  const options = optionsOf(question);
  return options[(question.correctIdx + 1) % options.length] ?? "";
}
