import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { SearchForm } from "@/components/technique/search-form";
import { TechniqueCard } from "@/components/technique/technique-card";
import { CaseHero } from "@/components/student/case-hero";
import { DailyCase } from "@/components/student/daily-case";
import { CaseProgressMap } from "@/components/student/case-progress-map";
import { NotificationBanner } from "@/components/student/notification-banner";
import { Pagination } from "@/components/ui/pagination";
import { matchesQuery } from "@/lib/techniques/search";
import { getLatestReadings } from "@/lib/techniques/progress";
import { readingState } from "@/lib/techniques/reading";
import {
  clampPhaseIndex,
  clampStepToPhase,
  dailyCheckpoint,
  getReadingPlan,
} from "@/lib/techniques/reading-plan";
import { getLevel } from "@/lib/gamification/levels";

export const metadata: Metadata = { title: "Inicio" };

const querySchema = z.string().max(80).catch("");
const pageSchema = z.coerce.number().int().min(1).max(999).catch(1);

const PAGE_SIZE = 6;

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function InicioPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const q = querySchema.parse(rawQuery ?? "").trim();
  const requestedPage = pageSchema.parse(rawPage);

  const [techniques, readings, progressRows, xpTotal, badgesCount, unreadNotification] =
    await Promise.all([
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
      prisma.readingProgress.findMany({
        where: { userId: user.id },
        select: { techniqueId: true, phaseIndex: true, stepIndex: true, updatedAt: true },
      }),
      prisma.xpEvent.aggregate({
        where: { userId: user.id },
        _sum: { amount: true },
      }),
      prisma.userBadge.count({ where: { userId: user.id } }),
      prisma.notification.findFirst({
        where: { userId: user.id, readAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, body: true, href: true },
      }),
    ]);

  const filtered = q
    ? techniques.filter((technique) =>
        matchesQuery(`${technique.title} ${technique.summary ?? ""}`, q),
      )
    : techniques;

  const progressByTechnique = new Map(
    progressRows.map((row) => [row.techniqueId, row]),
  );

  const mostRecentProgress = [...progressRows]
    .filter((row) => techniques.some((technique) => technique.id === row.techniqueId))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  const featured =
    (mostRecentProgress
      ? techniques.find((technique) => technique.id === mostRecentProgress.techniqueId)
      : null) ??
    filtered[0] ??
    null;

  const featuredProgress = featured
    ? (progressByTechnique.get(featured.id) ?? null)
    : null;
  const plan = featured ? getReadingPlan(featured.slug, featured._count.steps) : null;
  const currentPhaseIndex = plan
    ? clampPhaseIndex(plan, featuredProgress?.phaseIndex ?? 0)
    : 0;
  const currentStepIndex = plan
    ? clampStepToPhase(plan, currentPhaseIndex, featuredProgress?.stepIndex ?? 0)
    : 0;
  const featuredRead = featured
    ? readingState(readings.get(featured.id)?.version, featured.version) === "read"
    : false;

  const readCount = techniques.filter(
    (technique) =>
      readingState(readings.get(technique.id)?.version, technique.version) === "read",
  ).length;
  const level = getLevel(xpTotal._sum.amount ?? 0);
  const daily = plan ? dailyCheckpoint(plan, dateKeyFormatter.format(new Date())) : null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);
  const pagedTechniques = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {q ? (
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
              Biblioteca
            </p>
            <h1 className="text-2xl font-bold text-navy sm:text-3xl">
              Resultados para “{q}”
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {filtered.length === 0
                ? "No encontramos técnicas con esa búsqueda."
                : `${filtered.length} ${filtered.length === 1 ? "técnica encontrada" : "técnicas encontradas"}.`}
            </p>
          </div>
          <SearchForm action="/inicio" defaultValue={q} />
        </section>
      ) : (
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
            {dateFormatter.format(new Date())}
          </p>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">
            Hola, {user.name?.split(" ")[0] ?? "estudiante"}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tu turno empieza acá: un caso, cinco fases y checkpoints para practicar antes de
            la simulación.
          </p>
        </header>
      )}

      {!q && unreadNotification ? (
        <NotificationBanner notification={unreadNotification} />
      ) : null}

      {!q && featured && plan ? (
        <>
          <CaseHero
            technique={{
              slug: featured.slug,
              title: featured.title,
              summary: featured.summary,
              version: featured.version,
              stepCount: featured._count.steps,
            }}
            plan={plan}
            currentPhaseIndex={currentPhaseIndex}
            currentStepIndex={currentStepIndex}
            read={featuredRead}
            hasProgress={Boolean(featuredProgress)}
            level={level}
            badgesCount={badgesCount}
            readCount={readCount}
            totalTechniques={techniques.length}
          />

          {daily ? (
            <DailyCase
              techniqueSlug={featured.slug}
              phaseIndex={daily.phaseIndex}
              phaseTitle={daily.phase.title}
              checkpoint={daily.checkpoint}
            />
          ) : null}

          <CaseProgressMap
            slug={featured.slug}
            plan={plan}
            currentPhaseIndex={currentPhaseIndex}
            read={featuredRead}
          />
        </>
      ) : null}

      <section aria-labelledby="biblioteca" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
              Biblioteca
            </p>
            <h2 id="biblioteca" className="text-lg font-bold text-navy">
              {q ? "Todas las coincidencias" : "Técnicas disponibles"}
            </h2>
          </div>
          {!q && techniques.length > 0 ? (
            <Link
              href="/tecnicas"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Ver todas
            </Link>
          ) : null}
        </div>

        {!q ? <SearchForm action="/inicio" defaultValue={q} /> : null}

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
              basePath="/inicio"
              searchParams={{ q }}
              className="pt-1"
            />
          </>
        )}
      </section>
    </div>
  );
}
