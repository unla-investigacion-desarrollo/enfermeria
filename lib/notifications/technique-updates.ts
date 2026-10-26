import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type TechniqueUpdateInfo = {
  id: string;
  slug: string;
  title: string;
  version: number;
};

export function techniqueUpdateCopy(technique: TechniqueUpdateInfo) {
  return {
    title: `Nueva versión de ${technique.title}`,
    body: `Actualizamos esta técnica a la versión ${technique.version}. Volvé a leerla para registrar la nueva versión y mantener tu progreso al día.`,
    href: `/tecnicas/${technique.slug}?fase=1&paso=1`,
  };
}

/**
 * Avisa a estudiantes activos que ya completaron la técnica o que tienen un
 * avance guardado. Se mantiene un solo aviso por técnica y estudiante: si la
 * técnica se vuelve a actualizar, el aviso vuelve a quedar sin leer.
 */
export async function notifyTechniqueUpdate(
  db: Db,
  technique: TechniqueUpdateInfo,
): Promise<number> {
  const recipients = await db.user.findMany({
    where: {
      role: "STUDENT",
      active: true,
      OR: [
        { readings: { some: { techniqueId: technique.id } } },
        { readingProgress: { some: { techniqueId: technique.id } } },
      ],
    },
    select: { id: true },
  });

  if (recipients.length === 0) return 0;

  const copy = techniqueUpdateCopy(technique);

  for (const recipient of recipients) {
    await db.notification.upsert({
      where: {
        userId_techniqueId_type: {
          userId: recipient.id,
          techniqueId: technique.id,
          type: "TECHNIQUE_UPDATED",
        },
      },
      create: {
        userId: recipient.id,
        techniqueId: technique.id,
        type: "TECHNIQUE_UPDATED",
        version: technique.version,
        ...copy,
      },
      update: {
        version: technique.version,
        readAt: null,
        ...copy,
      },
    });
  }

  return recipients.length;
}
