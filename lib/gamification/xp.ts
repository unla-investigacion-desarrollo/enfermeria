import type { Prisma, PrismaClient } from "@prisma/client";

export const XP = {
  READING_FIRST: 100,
  READING_VERSION: 30,
  VIDEO: 20,
  MASTERED: 200,
  PASS: 150,
  PERFECT: 50,
} as const;

export function readingFirstRefKey(techniqueId: string): string {
  return `READING_FIRST:${techniqueId}`;
}

export function readingVersionRefKey(techniqueId: string, version: number): string {
  return `READING_VERSION:${techniqueId}:${version}`;
}

export function videoRefKey(videoId: string): string {
  return `VIDEO:${videoId}`;
}

export function passRefKey(activityId: string): string {
  return `PASS:${activityId}`;
}

export function perfectRefKey(activityId: string): string {
  return `PERFECT:${activityId}`;
}

export function masteredRefKey(techniqueId: string): string {
  return `MASTERED:${techniqueId}`;
}

type XpClient = PrismaClient | Prisma.TransactionClient;

type AwardXpInput = {
  userId: string;
  amount: number;
  reason: string;
  refKey: string;
};

/**
 * Otorga XP una sola vez por `refKey` (la restricción única de `XpEvent` lo
 * garantiza incluso con pedidos concurrentes). Devuelve el XP efectivamente
 * otorgado: 0 si el evento ya existía.
 */
export async function awardXp(prisma: XpClient, input: AwardXpInput): Promise<number> {
  const result = await prisma.xpEvent.createMany({
    data: [
      {
        userId: input.userId,
        amount: input.amount,
        reason: input.reason,
        refKey: input.refKey,
      },
    ],
    skipDuplicates: true,
  });

  return result.count > 0 ? input.amount : 0;
}
