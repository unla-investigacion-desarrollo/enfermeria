import { prisma } from "@/lib/db/prisma";
import type { LatestReading } from "@/lib/techniques/reading";

/**
 * Devuelve la última lectura de cada técnica para una persona. Se resuelve en
 * memoria porque el MVP tiene pocas técnicas y evita depender de `DISTINCT ON`.
 */
export async function getLatestReadings(
  userId: string,
  techniqueIds?: string[],
): Promise<Map<string, LatestReading>> {
  const readings = await prisma.readingCompletion.findMany({
    where: {
      userId,
      ...(techniqueIds ? { techniqueId: { in: techniqueIds } } : {}),
    },
    orderBy: { completedAt: "desc" },
    select: { techniqueId: true, version: true, completedAt: true },
  });

  const latest = new Map<string, LatestReading>();
  for (const reading of readings) {
    if (latest.has(reading.techniqueId)) continue;
    latest.set(reading.techniqueId, {
      version: reading.version,
      completedAt: reading.completedAt,
    });
  }

  return latest;
}
