"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import {
  blockSizeFromConfig,
  blockStepIds,
  isValidProposedOrder,
  lisLength,
  scoreOrder,
} from "@/lib/games/order-steps";
import {
  MIN_OPTIONS,
  correctTrivia,
  parseOptions,
  questionCountFromConfig,
  scoreTrivia,
  selectTriviaQuestions,
  type TriviaQuestionData,
  type TriviaReviewItem,
} from "@/lib/games/trivia";
import { evaluateBadges } from "@/lib/gamification/badges";
import type { EarnedBadge } from "@/lib/gamification/types";
import { triviaSubmissionSchema } from "@/lib/validation/trivia";
import {
  awardXp,
  passRefKey,
  perfectRefKey,
  readingFirstRefKey,
  readingVersionRefKey,
  videoRefKey,
  XP,
} from "@/lib/gamification/xp";

const idSchema = z.string().trim().min(1).max(64);

type ReadingOutcome =
  | { error: string }
  | { slug: string; readingXp: number; bonusXp: number; badges: EarnedBadge[] };

export type CompleteReadingResult =
  | { success: string; xpAwarded: number; badges: EarnedBadge[] }
  | { error: string };

export async function completeReadingAction(
  techniqueId: string,
): Promise<CompleteReadingResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(techniqueId);
  if (!parsed.success) {
    return { error: "No pudimos registrar la lectura. Probá de nuevo." };
  }

  const outcome: ReadingOutcome = await prisma.$transaction(async (tx): Promise<ReadingOutcome> => {
    const technique = await tx.technique.findFirst({
      where: { id: parsed.data, published: true },
      select: { id: true, slug: true, version: true },
    });

    if (!technique) {
      return { error: "La técnica no está disponible." } as const;
    }

    // Las relecturas de la misma versión no suman XP. Solo la primera lectura
    // de cada versión nueva otorga los 30 XP, además de la primera lectura (100).
    const previousReadings = await tx.readingCompletion.count({
      where: { userId: user.id, techniqueId: technique.id },
    });
    const previousVersionReadings =
      previousReadings > 0
        ? await tx.readingCompletion.count({
            where: {
              userId: user.id,
              techniqueId: technique.id,
              version: technique.version,
            },
          })
        : 0;

    // Cada lectura (también las relecturas) queda registrada con la versión leída.
    await tx.readingCompletion.create({
      data: {
        userId: user.id,
        techniqueId: technique.id,
        version: technique.version,
      },
    });

    // Al completar la versión publicada, el aviso de actualización queda leído.
    await tx.notification.updateMany({
      where: {
        userId: user.id,
        techniqueId: technique.id,
        type: "TECHNIQUE_UPDATED",
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    let readingXp = 0;
    if (previousReadings === 0) {
      readingXp = await awardXp(tx, {
        userId: user.id,
        amount: XP.READING_FIRST,
        reason: "Primera lectura terminada",
        refKey: readingFirstRefKey(technique.id),
      });
    } else if (previousVersionReadings === 0) {
      readingXp = await awardXp(tx, {
        userId: user.id,
        amount: XP.READING_VERSION,
        reason: `Lectura de la versión ${technique.version}`,
        refKey: readingVersionRefKey(technique.id, technique.version),
      });
    }

    const badgeResult = await evaluateBadges(tx, user.id);

    return {
      slug: technique.slug,
      readingXp,
      bonusXp: badgeResult.xpAwarded,
      badges: badgeResult.badges,
    } as const;
  });

  if ("error" in outcome) return { error: outcome.error };

  revalidatePath("/inicio");
  revalidatePath("/tecnicas");
  revalidatePath(`/tecnicas/${outcome.slug}`);
  revalidatePath("/perfil");
  revalidatePath("/notificaciones");

  let success = "Lectura registrada. Las relecturas no suman XP.";
  if (outcome.readingXp === XP.READING_FIRST) {
    success = `Lectura registrada. Sumaste ${XP.READING_FIRST} XP.`;
  } else if (outcome.readingXp === XP.READING_VERSION) {
    success = `Lectura registrada. Sumaste ${XP.READING_VERSION} XP por la nueva versión.`;
  }

  return {
    success,
    xpAwarded: outcome.readingXp + outcome.bonusXp,
    badges: outcome.badges,
  };
}

const readingProgressSchema = z.object({
  techniqueId: z.string().trim().min(1).max(64),
  phaseIndex: z.number().int().min(0).max(20),
  stepIndex: z.number().int().min(0).max(500),
});

export type SaveReadingProgressResult = { ok: true } | { error: string };

/**
 * Guarda el último paso visto sin revalidar la ruta actual: el reader mantiene
 * su estado en el cliente y el inicio vuelve a leer el progreso al navegar.
 */
export async function saveReadingProgressAction(
  input: unknown,
): Promise<SaveReadingProgressResult> {
  const user = await requireUser();
  const parsed = readingProgressSchema.safeParse(input);
  if (!parsed.success) return { error: "No pudimos guardar tu avance." };

  const technique = await prisma.technique.findFirst({
    where: { id: parsed.data.techniqueId, published: true },
    select: { id: true, _count: { select: { steps: true } } },
  });

  if (!technique) return { error: "La técnica no está disponible." };

  const maxStep = Math.max(0, technique._count.steps - 1);

  await prisma.readingProgress.upsert({
    where: {
      userId_techniqueId: { userId: user.id, techniqueId: technique.id },
    },
    create: {
      userId: user.id,
      techniqueId: technique.id,
      phaseIndex: parsed.data.phaseIndex,
      stepIndex: Math.min(parsed.data.stepIndex, maxStep),
    },
    update: {
      phaseIndex: parsed.data.phaseIndex,
      stepIndex: Math.min(parsed.data.stepIndex, maxStep),
    },
  });

  return { ok: true };
}

export type RegisterVideoViewResult =
  | { ok: true; xpAwarded: number; badges: EarnedBadge[] }
  | { error: string };

export async function registerVideoViewAction(
  videoId: string,
): Promise<RegisterVideoViewResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(videoId);
  if (!parsed.success) {
    return { error: "No pudimos registrar la visualización." };
  }

  const video = await prisma.video.findFirst({
    where: { id: parsed.data, technique: { published: true } },
    select: { id: true, technique: { select: { slug: true } } },
  });

  if (!video) return { error: "El video no está disponible." };

  const created = await prisma.videoView.createMany({
    data: [{ userId: user.id, videoId: video.id }],
    skipDuplicates: true,
  });

  const xpAwarded =
    created.count > 0
      ? await awardXp(prisma, {
          userId: user.id,
          amount: XP.VIDEO,
          reason: "Video visto por primera vez",
          refKey: videoRefKey(video.id),
        })
      : 0;

  revalidatePath(`/tecnicas/${video.technique.slug}`);
  revalidatePath("/perfil");

  return { ok: true, xpAwarded, badges: [] };
}

const submitOrderStepsSchema = z.object({
  techniqueSlug: z.string().trim().min(1).max(80),
  blockStart: z.number().int().min(0).max(10_000),
  orderedIds: z.array(z.string().trim().min(1).max(64)).min(1).max(20),
});

export type SubmitOrderStepsResult =
  | {
      score: number;
      passed: boolean;
      passScore: number;
      correctIds: string[];
      xpAwarded: number;
      badges: EarnedBadge[];
    }
  | { error: string };

export async function submitOrderStepsAction(
  input: unknown,
): Promise<SubmitOrderStepsResult> {
  const user = await requireUser();
  const parsed = submitOrderStepsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "No pudimos revisar tu orden. Probá de nuevo." };
  }

  const { techniqueSlug, blockStart, orderedIds } = parsed.data;

  const technique = await prisma.technique.findFirst({
    where: { slug: techniqueSlug, published: true },
    select: {
      id: true,
      slug: true,
      steps: { orderBy: { order: "asc" }, select: { id: true } },
      activities: {
        where: { type: "ORDER_STEPS" },
        take: 1,
        select: { id: true, passScore: true, config: true },
      },
    },
  });

  const activity = technique?.activities[0];
  if (!technique || !activity) {
    return { error: "El juego no está disponible para esta técnica." };
  }

  const correctIds = blockStepIds(
    technique.steps,
    blockStart,
    blockSizeFromConfig(activity.config),
  );

  if (!correctIds || !isValidProposedOrder(orderedIds, correctIds)) {
    return { error: "El orden enviado no coincide con el bloque del juego." };
  }

  const score = scoreOrder(orderedIds, correctIds);
  const passed = score >= activity.passScore;
  const correctIndex = new Map(correctIds.map((id, index) => [id, index]));
  const sequence = orderedIds
    .map((id) => correctIndex.get(id))
    .filter((value): value is number => value !== undefined);

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.activityAttempt.create({
      data: {
        userId: user.id,
        activityId: activity.id,
        score,
        passed,
        detail: {
          blockStart,
          blockIds: correctIds,
          proposedIds: orderedIds,
          lis: lisLength(sequence),
        },
      },
    });

    let xpAwarded = 0;

    if (passed) {
      xpAwarded += await awardXp(tx, {
        userId: user.id,
        amount: XP.PASS,
        reason: "Aprobaste Ordená los pasos",
        refKey: passRefKey(activity.id),
      });
    }

    if (score === 100) {
      xpAwarded += await awardXp(tx, {
        userId: user.id,
        amount: XP.PERFECT,
        reason: "100% en Ordená los pasos",
        refKey: perfectRefKey(activity.id),
      });
    }

    const badgeResult = await evaluateBadges(tx, user.id);

    return {
      xpAwarded: xpAwarded + badgeResult.xpAwarded,
      badges: badgeResult.badges,
    };
  });

  revalidatePath("/inicio");
  revalidatePath(`/tecnicas/${technique.slug}`);
  revalidatePath("/perfil");

  return {
    score,
    passed,
    passScore: activity.passScore,
    correctIds,
    ...outcome,
  };
}

export type SubmitTriviaResult =
  | {
      score: number;
      passed: boolean;
      passScore: number;
      correctCount: number;
      total: number;
      questions: TriviaReviewItem[];
      xpAwarded: number;
      badges: EarnedBadge[];
    }
  | { error: string };

/**
 * Corrige la trivia en el servidor. La selección de preguntas se recalcula a
 * partir de la semilla: el cliente no puede enviar un subconjunto más chico ni
 * inventar preguntas para subir el puntaje.
 */
export async function submitTriviaAction(input: unknown): Promise<SubmitTriviaResult> {
  const user = await requireUser();
  const parsed = triviaSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "No pudimos revisar tu trivia. Probá de nuevo." };
  }

  const { techniqueSlug, seed, answers } = parsed.data;

  const technique = await prisma.technique.findFirst({
    where: { slug: techniqueSlug, published: true },
    select: {
      id: true,
      slug: true,
      activities: {
        where: { type: "TRIVIA" },
        take: 1,
        select: { id: true, passScore: true, config: true },
      },
      questions: {
        where: { active: true },
        select: {
          id: true,
          prompt: true,
          options: true,
          correctIdx: true,
          explanation: true,
          reviewed: true,
        },
      },
    },
  });

  const activity = technique?.activities[0];
  if (!technique || !activity) {
    return { error: "La trivia no está disponible para esta técnica." };
  }

  const bank: TriviaQuestionData[] = technique.questions
    .map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: parseOptions(question.options),
      correctIdx: question.correctIdx,
      explanation: question.explanation,
      reviewed: question.reviewed,
    }))
    .filter(
      (question) =>
        question.options.length >= MIN_OPTIONS &&
        question.correctIdx >= 0 &&
        question.correctIdx < question.options.length,
    );

  const selected = selectTriviaQuestions(
    bank,
    questionCountFromConfig(activity.config),
    seed,
  );

  if (selected.length === 0) {
    return { error: "La trivia todavía no tiene preguntas cargadas." };
  }

  const answerIds = new Set(answers.map((answer) => answer.questionId));
  const selectedIds = new Set(selected.map((question) => question.id));
  const complete =
    answerIds.size === answers.length &&
    answerIds.size === selectedIds.size &&
    [...selectedIds].every((id) => answerIds.has(id));

  if (!complete) {
    return {
      error: "Las preguntas de la trivia cambiaron. Recargá la página y volvé a intentarlo.",
    };
  }

  const corrections = correctTrivia(selected, answers, seed);
  const correctCount = corrections.filter((correction) => correction.correct).length;
  const score = scoreTrivia(correctCount, selected.length);
  const passed = score >= activity.passScore;

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.activityAttempt.create({
      data: {
        userId: user.id,
        activityId: activity.id,
        score,
        passed,
        detail: {
          seed,
          questionIds: selected.map((question) => question.id),
          correctCount,
          answers: corrections.map((correction) => ({
            questionId: correction.item.id,
            chosenIdx: correction.item.chosenIdx,
            correctIdx: correction.item.correctIdx,
            correct: correction.correct,
          })),
        },
      },
    });

    let xpAwarded = 0;

    if (passed) {
      xpAwarded += await awardXp(tx, {
        userId: user.id,
        amount: XP.PASS,
        reason: "Aprobaste la trivia",
        refKey: passRefKey(activity.id),
      });
    }

    if (score === 100) {
      xpAwarded += await awardXp(tx, {
        userId: user.id,
        amount: XP.PERFECT,
        reason: "100% en la trivia",
        refKey: perfectRefKey(activity.id),
      });
    }

    const badgeResult = await evaluateBadges(tx, user.id);

    return {
      xpAwarded: xpAwarded + badgeResult.xpAwarded,
      badges: badgeResult.badges,
    };
  });

  revalidatePath("/inicio");
  revalidatePath(`/tecnicas/${technique.slug}`);
  revalidatePath(`/tecnicas/${technique.slug}/jugar/trivia`);
  revalidatePath("/perfil");

  return {
    score,
    passed,
    passScore: activity.passScore,
    correctCount,
    total: selected.length,
    questions: corrections.map((correction) => correction.item),
    ...outcome,
  };
}
