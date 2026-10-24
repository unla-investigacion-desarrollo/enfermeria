import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { buttonVariants } from "@/components/ui/button";
import { techniqueContentInclude } from "@/lib/techniques/queries";
import type { EditorTechnique } from "@/lib/techniques/editor-types";
import { TechniqueEditor } from "../../technique-editor";

export const metadata: Metadata = { title: "Editar técnica" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTechniquePage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const technique = await prisma.technique.findUnique({
    where: { id },
    include: techniqueContentInclude,
  });

  if (!technique) notFound();

  const initial: EditorTechnique = {
    id: technique.id,
    published: technique.published,
    version: technique.version,
    title: technique.title,
    slug: technique.slug,
    summary: technique.summary ?? "",
    definition: technique.definition,
    coverImage: technique.coverImage ?? "",
    objectives: technique.objectives.map((item) => ({ kind: item.kind, text: item.text })),
    materials: technique.materials.map((item) => item.text),
    steps: technique.steps.map((item) => ({ text: item.text, emphasis: item.emphasis })),
    images: technique.images.map((item) => ({
      url: item.url,
      alt: item.alt,
      credit: item.credit,
    })),
    videos: technique.videos.map((item) => ({
      title: item.title,
      url: item.url,
      institutional: item.institutional,
    })),
    checklist: technique.checklist.map((item) => item.text),
  };

  return (
    <div className="space-y-4">
      <Link
        href="/admin/tecnicas"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Volver al listado
      </Link>
      <TechniqueEditor initial={initial} />
    </div>
  );
}
