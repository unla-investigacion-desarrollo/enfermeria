import { Prisma, type ActivityType, type PrismaClient } from "@prisma/client";
import data from "./seed-data/via-periferica.json";
import { masterBadgeCode, masterBadgeData } from "../lib/techniques/badges";

export { masterBadgeCode, MASTER_BADGE_PREFIX } from "../lib/techniques/badges";

const BASE_BADGES = [
  {
    code: "FIRST_READING",
    name: "Primer paso",
    description: "Terminaste la lectura de tu primera técnica.",
    icon: "book-open",
  },
  {
    code: "REVIEWER",
    name: "Relector/a",
    description: "Releíste la misma técnica 3 veces.",
    icon: "repeat",
  },
  {
    code: "ORDERED_MIND",
    name: "Mente ordenada",
    description: "Obtuviste 100% en Ordená los pasos.",
    icon: "list-ordered",
  },
  {
    code: "TRIVIA_STAR",
    name: "Estrella de la trivia",
    description: "Obtuviste 100% en una trivia.",
    icon: "star",
  },
];

export async function seedBadges(prisma: PrismaClient): Promise<void> {
  for (const badge of BASE_BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      create: badge,
      update: { name: badge.name, description: badge.description, icon: badge.icon },
    });
  }
}

type SeedQuestion = {
  prompt: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  reviewed?: boolean;
  active?: boolean;
};

export async function seedTechnique(prisma: PrismaClient): Promise<void> {
  const technique = await prisma.technique.upsert({
    where: { slug: data.slug },
    create: {
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      definition: data.definition,
      published: data.published,
    },
    update: {
      title: data.title,
      summary: data.summary,
      definition: data.definition,
      published: data.published,
    },
  });

  await prisma.$transaction([
    prisma.objective.deleteMany({ where: { techniqueId: technique.id } }),
    prisma.material.deleteMany({ where: { techniqueId: technique.id } }),
    prisma.step.deleteMany({ where: { techniqueId: technique.id } }),
    prisma.techniqueImage.deleteMany({ where: { techniqueId: technique.id } }),
    prisma.video.deleteMany({ where: { techniqueId: technique.id } }),
    prisma.checklistItem.deleteMany({ where: { techniqueId: technique.id } }),
  ]);

  await prisma.objective.createMany({
    data: data.objectives.map((objective, index) => ({
      techniqueId: technique.id,
      kind: objective.kind as "GENERAL" | "SPECIFIC",
      text: objective.text,
      order: index,
    })),
  });

  await prisma.material.createMany({
    data: data.materials.map((text, index) => ({ techniqueId: technique.id, text, order: index })),
  });

  await prisma.step.createMany({
    data: data.steps.map((step, index) => ({
      techniqueId: technique.id,
      text: step.text,
      emphasis: step.emphasis ?? false,
      order: index,
    })),
  });

  await prisma.techniqueImage.createMany({
    data: data.images.map((image, index) => ({
      techniqueId: technique.id,
      url: image.url,
      alt: image.alt,
      credit: image.credit,
      order: index,
    })),
  });

  await prisma.video.createMany({
    data: data.videos.map((video, index) => ({
      techniqueId: technique.id,
      title: video.title,
      url: video.url,
      institutional: video.institutional,
      order: index,
    })),
  });

  await prisma.checklistItem.createMany({
    data: data.checklist.map((text, index) => ({
      techniqueId: technique.id,
      text,
      order: index,
    })),
  });

  for (const activity of data.activities) {
    const type = activity.type as ActivityType;
    await prisma.activity.upsert({
      where: { techniqueId_type: { techniqueId: technique.id, type } },
      create: {
        techniqueId: technique.id,
        type,
        title: activity.title,
        passScore: activity.passScore,
        config: activity.config as Prisma.InputJsonValue,
      },
      update: {
        title: activity.title,
        passScore: activity.passScore,
        config: activity.config as Prisma.InputJsonValue,
      },
    });
  }

  // TODO(enfermería): cargar el banco del Apéndice B en `questions`.
  // Mientras la lista esté vacía no se toca lo que se haya cargado desde el
  // panel de administración. Si el seed trae preguntas, reemplaza el banco.
  const seedQuestions = data.questions as SeedQuestion[];

  if (seedQuestions.length > 0) {
    await prisma.$transaction([
      prisma.triviaQuestion.deleteMany({ where: { techniqueId: technique.id } }),
      prisma.triviaQuestion.createMany({
        data: seedQuestions.map((question) => ({
          techniqueId: technique.id,
          prompt: question.prompt,
          options: question.options,
          correctIdx: question.correctIdx,
          explanation: question.explanation,
          reviewed: question.reviewed ?? false,
          active: question.active ?? true,
        })),
      }),
    ]);
  }

  await prisma.badge.upsert({
    where: { code: masterBadgeCode(technique.slug) },
    create: {
      code: masterBadgeCode(technique.slug),
      ...masterBadgeData(technique.title),
    },
    update: masterBadgeData(technique.title),
  });
}
