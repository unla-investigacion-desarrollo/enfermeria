import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Preguntas" };

type PageProps = { params: Promise<{ id: string }> };

export default async function TechniqueQuestionsPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const technique = await prisma.technique.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!technique) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Preguntas de trivia</h1>
      <p className="text-sm text-muted-foreground">{technique.title}</p>
      <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        El banco de preguntas se habilita en la Fase 8.
      </div>
      <Link
        href={`/admin/tecnicas/${technique.id}/editar`}
        className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← Volver al editor
      </Link>
    </div>
  );
}
