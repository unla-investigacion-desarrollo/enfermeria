import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { SearchForm } from "@/components/technique/search-form";
import { TechniqueCard } from "@/components/technique/technique-card";
import { Pagination } from "@/components/ui/pagination";
import { matchesQuery } from "@/lib/techniques/search";
import { getLatestReadings } from "@/lib/techniques/progress";

export const metadata: Metadata = { title: "Técnicas" };

const querySchema = z.string().max(80).catch("");
const pageSchema = z.coerce.number().int().min(1).max(999).catch(1);

const PAGE_SIZE = 6;

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function TecnicasPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const q = querySchema.parse(rawQuery ?? "").trim();
  const requestedPage = pageSchema.parse(rawPage);

  const [techniques, readings] = await Promise.all([
    prisma.technique.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { steps: true } } },
    }),
    getLatestReadings(user.id),
  ]);

  const filtered = q
    ? techniques.filter((technique) =>
        matchesQuery(`${technique.title} ${technique.summary ?? ""}`, q),
      )
    : techniques;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);
  const pagedTechniques = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-bordo">Manual</p>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Técnicas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leé la técnica completa, mirá las imágenes y registrá tu avance.
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "técnica" : "técnicas"}
          {q ? ` para “${q}”` : " publicadas"}
        </p>
      </div>

      <SearchForm action="/tecnicas" defaultValue={q} />

      {techniques.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Todavía no hay técnicas publicadas.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          <p>No encontramos técnicas para “{q}”.</p>
          <Link href="/tecnicas" className="mt-2 inline-block font-semibold text-primary underline">
            Ver todas las técnicas
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {pagedTechniques.map((technique) => (
              <TechniqueCard
                key={technique.id}
                technique={{
                  slug: technique.slug,
                  title: technique.title,
                  summary: technique.summary,
                  version: technique.version,
                  stepCount: technique._count.steps,
                }}
                latestReading={readings.get(technique.id)}
              />
            ))}
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/tecnicas"
            searchParams={{ q }}
          />
        </>
      )}
    </div>
  );
}
