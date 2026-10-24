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
import { evaluateBadges } from "@/lib/gamification/badges";
import type { EarnedBadge } from "@/lib/gamification/types";
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
