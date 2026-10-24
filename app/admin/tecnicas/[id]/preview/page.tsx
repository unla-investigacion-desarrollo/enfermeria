import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { TechniqueContent } from "@/components/technique/technique-content";
import { techniqueContentInclude } from "@/lib/techniques/queries";

export const metadata: Metadata = { title: "Vista previa" };

type PageProps = { params: Promise<{ id: string }> };

export default async function TechniquePreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const technique = await prisma.technique.findUnique({
    where: { id },
    include: techniqueContentInclude,
  });

  if (!technique) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-navy/20 bg-navy/5 px-4 py-3 text-sm text-navy">
        <p className="font-semibold">Vista previa del estudiante</p>
        <p className="text-xs">
          {technique.published
            ? "La técnica está publicada. Esta vista no registra progreso."
            : "La técnica está en borrador: solo el admin puede verla."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 sm:p-8">
        <TechniqueContent technique={technique} />
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
