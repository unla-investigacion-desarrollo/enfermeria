"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { masterBadgeCode, masterBadgeData } from "@/lib/techniques/badges";
import { techniqueIdSchema, techniquePayloadSchema } from "@/lib/validation/techniques";

export type SaveTechniqueState =
  | { error: string }
  | { success: string; id: string; version: number }
  | null;

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function saveTechniqueAction(input: unknown): Promise<SaveTechniqueState> {
  await requireAdmin();

  const parsed = techniquePayloadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return {
      error: issue ? `${path ? `${path}: ` : ""}${issue.message}` : "Revisá los datos de la técnica.",
    };
  }

  const data = parsed.data;
  const existing = data.id
    ? await prisma.technique.findUnique({ where: { id: data.id }, select: { id: true, version: true, published: true } })
    : null;

  if (data.id && !existing) {
    return { error: "No encontramos la técnica que querés guardar." };
  }

  try {
    const technique = await prisma.$transaction(async (tx) => {
      let saved;

      if (existing) {
        saved = await tx.technique.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            slug: data.slug,
            summary: optional(data.summary),
            definition: data.definition,
            coverImage: optional(data.coverImage),
            version: existing.published ? existing.version + 1 : existing.version,
          },
        });
      } else {
        saved = await tx.technique.create({
          data: {
            title: data.title,
            slug: data.slug,
            summary: optional(data.summary),
            definition: data.definition,
            coverImage: optional(data.coverImage),
            published: false,
            version: 1,
          },
        });
      }

      await tx.objective.deleteMany({ where: { techniqueId: saved.id } });
      await tx.material.deleteMany({ where: { techniqueId: saved.id } });
      await tx.step.deleteMany({ where: { techniqueId: saved.id } });
      await tx.techniqueImage.deleteMany({ where: { techniqueId: saved.id } });
      await tx.video.deleteMany({ where: { techniqueId: saved.id } });
      await tx.checklistItem.deleteMany({ where: { techniqueId: saved.id } });

      if (data.objectives.length > 0) {
        await tx.objective.createMany({
          data: data.objectives.map((objective, index) => ({
            techniqueId: saved.id,
            kind: objective.kind,
            text: objective.text,
            order: index,
          })),
        });
      }

      if (data.materials.length > 0) {
        await tx.material.createMany({
          data: data.materials.map((text, index) => ({
            techniqueId: saved.id,
            text,
            order: index,
          })),
        });
      }

      await tx.step.createMany({
        data: data.steps.map((step, index) => ({
          techniqueId: saved.id,
          text: step.text,
          emphasis: step.emphasis,
          order: index,
        })),
      });

      if (data.images.length > 0) {
        await tx.techniqueImage.createMany({
          data: data.images.map((image, index) => ({
            techniqueId: saved.id,
            url: image.url,
            alt: image.alt,
            credit: image.credit,
            order: index,
          })),
        });
      }

      if (data.videos.length > 0) {
        await tx.video.createMany({
          data: data.videos.map((video, index) => ({
            techniqueId: saved.id,
            title: video.title,
            url: video.url,
            institutional: video.institutional,
            order: index,
          })),
        });
      }

      if (data.checklist.length > 0) {
        await tx.checklistItem.createMany({
          data: data.checklist.map((text, index) => ({
            techniqueId: saved.id,
            text,
            order: index,
          })),
        });
      }

      await tx.activity.upsert({
        where: { techniqueId_type: { techniqueId: saved.id, type: "ORDER_STEPS" } },
        create: {
          techniqueId: saved.id,
          type: "ORDER_STEPS",
          title: "Ordená los pasos",
          passScore: 80,
          config: { blockSize: 8 },
        },
        update: {},
      });

      await tx.activity.upsert({
        where: { techniqueId_type: { techniqueId: saved.id, type: "TRIVIA" } },
        create: {
          techniqueId: saved.id,
          type: "TRIVIA",
          title: "Trivia de la técnica",
          passScore: 70,
          config: { questionCount: 10 },
        },
        update: {},
      });

      return saved;
    });

    revalidatePath("/admin/tecnicas");
    revalidatePath(`/admin/tecnicas/${technique.id}/editar`);
    revalidatePath(`/admin/tecnicas/${technique.id}/preview`);

    return {
      success: existing
        ? `Técnica guardada. Versión ${technique.version}.`
        : "Técnica creada como borrador.",
      id: technique.id,
      version: technique.version,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya existe una técnica con ese slug." };
    }
    throw error;
  }
}

export async function toggleTechniquePublishedAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = techniqueIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const technique = await prisma.technique.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true, title: true, published: true },
  });
  if (!technique) return;

  await prisma.technique.update({
    where: { id: technique.id },
    data: { published: !technique.published },
  });

  if (!technique.published) {
    await prisma.badge.upsert({
      where: { code: masterBadgeCode(technique.slug) },
      create: {
        code: masterBadgeCode(technique.slug),
        ...masterBadgeData(technique.title),
      },
      update: masterBadgeData(technique.title),
    });
  }

  revalidatePath("/admin/tecnicas");
  revalidatePath(`/admin/tecnicas/${technique.id}/editar`);
  revalidatePath("/inicio");
}
