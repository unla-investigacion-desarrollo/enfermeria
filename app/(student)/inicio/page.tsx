import type { Metadata } from "next";
import Link from "next/link";
import { Gamepad2, ImageIcon, Video } from "lucide-react";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { buttonVariants } from "@/components/ui/button";
import { SearchForm } from "@/components/technique/search-form";
import { TechniqueCard } from "@/components/technique/technique-card";
import { matchesQuery } from "@/lib/techniques/search";
import { getLatestReadings } from "@/lib/techniques/progress";
import { readingState } from "@/lib/techniques/reading";

export const metadata: Metadata = { title: "Inicio" };

const querySchema = z.string().max(80).catch("");

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function InicioPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const { q: rawQuery } = await searchParams;
  const q = querySchema.parse(Array.isArray(rawQuery) ? rawQuery[0] : (rawQuery ?? "")).trim();

  const [techniques, readings] = await Promise.all([
    prisma.technique.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { steps: true, images: true, videos: true } },
        activities: { orderBy: { type: "asc" } },
        questions: { where: { active: true }, select: { id: true } },
      },
    }),
    getLatestReadings(user.id),
  ]);

  const filtered = q
    ? techniques.filter((technique) =>
        matchesQuery(`${technique.title} ${technique.summary ?? ""}`, q),
      )
    : techniques;

  const featured = filtered[0] ?? null;
  const readCount = techniques.filter(
    (technique) =>
      readingState(readings.get(technique.id)?.version, technique.version) === "read",
  ).length;
  const progress = techniques.length
    ? Math.round((readCount / techniques.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">Inicio</p>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Hola, {user.name?.split(" ")[0] ?? "estudiante"}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Consultá la técnica, mirá las fotos y el video, y registrá tu lectura.
          </p>
        </div>
        <SearchForm action="/inicio" defaultValue={q} />
      </section>

      <section
        aria-labelledby="tu-progreso"
        className="space-y-3 rounded-xl border border-border bg-white p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tu-progreso" className="text-lg font-bold text-navy">
            Tu progreso
          </h2>
          <span className="text-sm font-semibold text-bordo">
            {readCount} de {techniques.length} {techniques.length === 1 ? "técnica" : "técnicas"}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Técnicas leídas"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-bordo transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {techniques.length === 0
            ? "Todavía no hay técnicas publicadas."
            : readCount === techniques.length
              ? "¡Leíste todas las técnicas disponibles!"
              : readCount === 0
                ? "Empezá por la técnica disponible y marcá la lectura al terminar."
                : "Seguí con la técnica que te falta."}
        </p>
      </section>

      {techniques.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          El equipo docente todavía no publicó técnicas.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          <p>No encontramos técnicas para “{q}”.</p>
          <Link href="/inicio" className="mt-2 inline-block font-semibold text-primary underline">
            Ver todas las técnicas
          </Link>
        </div>
      ) : (
        <>
          {featured && !q ? (
            <section aria-labelledby="accesos-rapidos" className="space-y-3">
              <h2 id="accesos-rapidos" className="text-lg font-bold text-navy">
                Accesos rápidos
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  href={`/tecnicas/${featured.slug}#imagenes`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-bordo/40 hover:bg-accent"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bordo/10 text-bordo">
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-navy">Fotos</span>
                    <span className="block text-xs text-muted-foreground">
                      {featured._count.images}{" "}
                      {featured._count.images === 1 ? "imagen" : "imágenes"}
                    </span>
                  </span>
                </Link>
                <Link
                  href={`/tecnicas/${featured.slug}#videos`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-bordo/40 hover:bg-accent"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-navy">
                    <Video className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-navy">Video</span>
                    <span className="block text-xs text-muted-foreground">
                      {featured._count.videos}{" "}
                      {featured._count.videos === 1 ? "video" : "videos"}
                    </span>
                  </span>
                </Link>
                <Link
                  href={`/tecnicas/${featured.slug}#juegos`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-bordo/40 hover:bg-accent"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                    <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-navy">Juego</span>
                    <span className="block text-xs text-muted-foreground">
                      {featured.activities.length}{" "}
                      {featured.activities.length === 1 ? "actividad" : "actividades"}
                    </span>
                  </span>
                </Link>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="tecnicas-disponibles" className="space-y-3">
            <h2 id="tecnicas-disponibles" className="text-lg font-bold text-navy">
              {q ? `Resultados para “${q}”` : "Tu técnica"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((technique) => (
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
          </section>

          {featured && !q ? (
            <section
              aria-labelledby="evaluacion"
              className="space-y-3 rounded-xl border border-border bg-white p-5"
            >
              <h2 id="evaluacion" className="text-lg font-bold text-navy">
                Evaluación
              </h2>
              <p className="text-xs text-muted-foreground">
                Actividades de {featured.title}.
              </p>
              <ul className="divide-y divide-border">
                {featured.activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <span className="text-sm font-medium">{activity.title}</span>
                    {activity.type === "ORDER_STEPS" ? (
                      <Link
                        href={`/tecnicas/${featured.slug}/jugar/ordenar`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Jugar
                      </Link>
                    ) : activity.type === "TRIVIA" ? (
                      featured.questions.length > 0 ? (
                        <Link
                          href={`/tecnicas/${featured.slug}/jugar/trivia`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Jugar
                        </Link>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          Sin preguntas
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        Próximamente
                      </span>
                    )}
                  </li>
                ))}
                {featured.activities.length === 0 ? (
                  <li className="py-3 text-sm text-muted-foreground">
                    No hay actividades cargadas para esta técnica.
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
