import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { buttonVariants } from "@/components/ui/button";
import { toggleTechniquePublishedAction } from "./actions";

export const metadata: Metadata = { title: "Técnicas" };

export default async function AdminTecnicasPage() {
  await requireAdmin();

  const techniques = await prisma.technique.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { steps: true, questions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Técnicas</h1>
          <p className="text-sm text-muted-foreground">
            Cargá el contenido estructurado, publicalo y gestioná sus preguntas.
          </p>
        </div>
        <Link href="/admin/tecnicas/nueva" className={buttonVariants()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva técnica
        </Link>
      </div>

      {techniques.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Todavía no hay técnicas cargadas.{" "}
          <Link href="/admin/tecnicas/nueva" className="text-primary underline-offset-4 hover:underline">
            Crear la primera
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">Técnica</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Versión</th>
                <th scope="col" className="px-4 py-3 font-semibold">Contenido</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {techniques.map((technique) => (
                <tr key={technique.id} className="border-b border-border/60 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{technique.title}</p>
                    <p className="text-xs text-muted-foreground">/{technique.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        technique.published
                          ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {technique.published ? "Publicada" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">v{technique.version}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {technique._count.steps} pasos · {technique._count.questions} preguntas
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/tecnicas/${technique.id}/editar`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/admin/tecnicas/${technique.id}/preview`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Vista previa
                      </Link>
                      <form action={toggleTechniquePublishedAction}>
                        <input type="hidden" name="id" value={technique.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          {technique.published ? "Despublicar" : "Publicar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
