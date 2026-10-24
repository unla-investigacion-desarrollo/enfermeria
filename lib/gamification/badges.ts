import type { ActivityType, Prisma, PrismaClient } from "@prisma/client";
import { masterBadgeCode, MASTER_BADGE_PREFIX } from "@/lib/techniques/badges";
import type { EarnedBadge } from "@/lib/gamification/types";
import { awardXp, masteredRefKey, XP } from "@/lib/gamification/xp";

type BadgeClient = PrismaClient | Prisma.TransactionClient;

export type BadgeRuleInput = {
  /** Cantidad de lecturas (incluidas relecturas) por técnica. */
  readingCounts: Map<string, number>;
  passedOrder: Set<string>;
  passedTrivia: Set<string>;
  perfectOrder: Set<string>;
  perfectTrivia: Set<string>;
  techniques: { id: string; slug: string; title: string }[];
};

export type EvaluateBadgesResult = {
  badges: EarnedBadge[];
  xpAwarded: number;
};

/**
 * Reglas puras de insignias. Se mantienen separadas de la base para poder
 * testearlas y para que las fases de juegos las reutilicen.
 */
export function evaluateBadgeRules(input: BadgeRuleInput): string[] {
  const codes = new Set<string>();

  if ([...input.readingCounts.values()].some((count) => count > 0)) {
    codes.add("FIRST_READING");
  }

  if ([...input.readingCounts.values()].some((count) => count >= 3)) {
    codes.add("REVIEWER");
  }

  if (input.perfectOrder.size > 0) codes.add("ORDERED_MIND");
  if (input.perfectTrivia.size > 0) codes.add("TRIVIA_STAR");

  for (const technique of input.techniques) {
    const read = (input.readingCounts.get(technique.id) ?? 0) > 0;
    const passedBoth =
      input.passedOrder.has(technique.id) && input.passedTrivia.has(technique.id);

    if (read && passedBoth) codes.add(masterBadgeCode(technique.slug));
  }

  return [...codes];
}

function addToSet(map: Map<string, Set<ActivityType>>, key: string, value: ActivityType) {
  const current = map.get(key);
  if (current) {
    current.add(value);
  } else {
    map.set(key, new Set([value]));
  }
}

/**
 * Otorga las insignias que correspondan y devuelve solo las nuevas, para que la
 * UI pueda mostrarlas en un toast. Es idempotente: `UserBadge` tiene clave
 * compuesta y se usa `skipDuplicates`.
 */
export async function evaluateBadges(
  prisma: BadgeClient,
  userId: string,
): Promise<EvaluateBadgesResult> {
  const [readings, attempts, techniques] = await Promise.all([
    prisma.readingCompletion.findMany({
      where: { userId },
      select: { techniqueId: true },
    }),
    prisma.activityAttempt.findMany({
      where: { userId },
      select: {
        score: true,
        passed: true,
        activity: { select: { techniqueId: true, type: true } },
      },
    }),
    prisma.technique.findMany({
      select: { id: true, slug: true, title: true },
    }),
  ]);

  const readingCounts = new Map<string, number>();
  for (const reading of readings) {
    readingCounts.set(reading.techniqueId, (readingCounts.get(reading.techniqueId) ?? 0) + 1);
  }

  const passedByType = new Map<string, Set<ActivityType>>();
  const perfectOrder = new Set<string>();
  const perfectTrivia = new Set<string>();

  for (const attempt of attempts) {
    const { techniqueId, type } = attempt.activity;

    if (attempt.passed) addToSet(passedByType, techniqueId, type);
    if (attempt.score >= 100) {
      if (type === "ORDER_STEPS") perfectOrder.add(techniqueId);
      if (type === "TRIVIA") perfectTrivia.add(techniqueId);
    }
  }

  const codes = evaluateBadgeRules({
    readingCounts,
    passedOrder: new Set(
      [...passedByType.entries()]
        .filter(([, types]) => types.has("ORDER_STEPS"))
        .map(([techniqueId]) => techniqueId),
    ),
    passedTrivia: new Set(
      [...passedByType.entries()]
        .filter(([, types]) => types.has("TRIVIA"))
        .map(([techniqueId]) => techniqueId),
    ),
    perfectOrder,
    perfectTrivia,
    techniques,
  });

  if (codes.length === 0) return { badges: [], xpAwarded: 0 };

  const badges = await prisma.badge.findMany({ where: { code: { in: codes } } });
  const earned: EarnedBadge[] = [];
  let xpAwarded = 0;

  for (const badge of badges) {
    const created = await prisma.userBadge.createMany({
      data: [{ userId, badgeId: badge.id }],
      skipDuplicates: true,
    });

    if (created.count === 0) continue;

    earned.push({ code: badge.code, name: badge.name });

    if (badge.code.startsWith(MASTER_BADGE_PREFIX)) {
      const slug = badge.code.slice(MASTER_BADGE_PREFIX.length);
      const technique = techniques.find((item) => item.slug === slug);
      if (technique) {
        xpAwarded += await awardXp(prisma, {
          userId,
          amount: XP.MASTERED,
          reason: `Técnica dominada: ${technique.title}`,
          refKey: masteredRefKey(technique.id),
        });
      }
    }
  }

  return { badges: earned, xpAwarded };
}
