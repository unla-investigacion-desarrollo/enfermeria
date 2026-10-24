"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { questionIdSchema, questionInputSchema } from "@/lib/validation/trivia";

export type QuestionActionState = { error?: string; success?: string } | null;

function revalidateQuestionPaths(techniqueId: string, slug?: string): void {
  revalidatePath(`/admin/tecnicas/${techniqueId}/preguntas`);
  revalidatePath("/admin/tecnicas");
  revalidatePath("/inicio");
  if (slug) {
    revalidatePath(`/tecnicas/${slug}`);
    revalidatePath(`/tecnicas/${slug}/jugar/trivia`);
  }
}

export async function saveQuestionAction(
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  await requireAdmin();

  const rawQuestionId = formData.get("questionId");
  const parsed = questionInputSchema.safeParse({
    techniqueId: formData.get("techniqueId"),
    questionId:
      typeof rawQuestionId === "string" && rawQuestionId.trim().length > 0
        ? rawQuestionId
        : undefined,
    prompt: formData.get("prompt"),
    options: formData.getAll("options"),
    correctIdx: formData.get("correctIdx"),
    explanation: formData.get("explanation"),
    reviewed: formData.get("reviewed") === "on",
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Revisá los datos de la pregunta." };
  }

  const data = parsed.data;
  const technique = await prisma.technique.findUnique({
    where: { id: data.techniqueId },
    select: { id: true, slug: true },
  });

  if (!technique) {
    return { error: "No encontramos la técnica de esta pregunta." };
  }

  const payload = {
    prompt: data.prompt,
    options: data.options,
    correctIdx: data.correctIdx,
    explanation: data.explanation,
    reviewed: data.reviewed,
    active: data.active,
  };

  if (data.questionId) {
    const updated = await prisma.triviaQuestion.updateMany({
      where: { id: data.questionId, techniqueId: technique.id },
      data: payload,
    });

    if (updated.count === 0) {
      return { error: "No encontramos la pregunta que querés guardar." };
    }
  } else {
    await prisma.triviaQuestion.create({
      data: { techniqueId: technique.id, ...payload },
    });
  }

  revalidateQuestionPaths(technique.id, technique.slug);

  return {
    success: data.questionId
      ? "Pregunta actualizada."
      : "Pregunta agregada. Recordá que queda pendiente de revisión hasta que Enfermería la apruebe.",
  };
}

async function findQuestion(techniqueId: string, questionId: string) {
  return prisma.triviaQuestion.findFirst({
    where: { id: questionId, techniqueId },
    select: { id: true, active: true, reviewed: true, technique: { select: { slug: true } } },
  });
}

export async function toggleQuestionActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = questionIdSchema.safeParse({
    techniqueId: formData.get("techniqueId"),
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) return;

  const question = await findQuestion(parsed.data.techniqueId, parsed.data.questionId);
  if (!question) return;

  await prisma.triviaQuestion.update({
    where: { id: question.id },
    data: { active: !question.active },
  });

  revalidateQuestionPaths(parsed.data.techniqueId, question.technique.slug);
}

export async function toggleQuestionReviewedAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = questionIdSchema.safeParse({
    techniqueId: formData.get("techniqueId"),
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) return;

  const question = await findQuestion(parsed.data.techniqueId, parsed.data.questionId);
  if (!question) return;

  await prisma.triviaQuestion.update({
    where: { id: question.id },
    data: { reviewed: !question.reviewed },
  });

  revalidateQuestionPaths(parsed.data.techniqueId, question.technique.slug);
}

export async function deleteQuestionAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = questionIdSchema.safeParse({
    techniqueId: formData.get("techniqueId"),
    questionId: formData.get("questionId"),
  });
  if (!parsed.success) return;

  const question = await findQuestion(parsed.data.techniqueId, parsed.data.questionId);
  if (!question) return;

  await prisma.triviaQuestion.delete({ where: { id: question.id } });

  revalidateQuestionPaths(parsed.data.techniqueId, question.technique.slug);
}
