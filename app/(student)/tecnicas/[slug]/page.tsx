import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellRing, Gamepad2 } from "lucide-react";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { buttonVariants } from "@/components/ui/button";
import { TechniqueReader } from "@/components/technique/technique-reader";
import { ImageGallery } from "@/components/technique/image-gallery";
import { VideoPlayer } from "@/components/technique/video-player";
import { ChecklistAssessment } from "@/components/technique/checklist-assessment";
import { ReadingCompletion } from "@/components/technique/reading-completion";
import { techniqueContentInclude } from "@/lib/techniques/queries";
import { readingState } from "@/lib/techniques/reading";
import {
  clampPhaseIndex,
  clampStepToPhase,
  getReadingPlan,
  phaseIndexForStep,
} from "@/lib/techniques/reading-plan";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fase?: string | string[]; paso?: string | string[] }>;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

const positionSchema = z.coerce.number().int().min(1).max(500).catch(1);

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const technique = await prisma.technique.findFirst({
    where: { slug, published: true },
    select: { title: true },
  });

  return { title: technique?.title ?? "Técnica" };
}

export default async function TechniqueReadingPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { slug } = await params;
  const query = await searchParams;

  const technique = await prisma.technique.findFirst({
    where: { slug, published: true },
    include: { ...techniqueContentInclude, activities: true },
  });

  if (!technique) notFound();

  const [latestReading, videoViews, activeTriviaQuestions, progress] = await Promise.all([
    prisma.readingCompletion.findFirst({
      where: { userId: user.id, techniqueId: technique.id },
      orderBy: { completedAt: "desc" },
      select: { version: true, completedAt: true },
    }),
    prisma.videoView.findMany({
      where: {
        userId: user.id,
        videoId: { in: technique.videos.map((video) => video.id) },
      },
      select: { videoId: true },
    }),
    prisma.triviaQuestion.count({
      where: { techniqueId: technique.id, active: true },
    }),
    prisma.readingProgress.findUnique({
      where: {
        userId_techniqueId: { userId: user.id, techniqueId: technique.id },
      },
      select: { phaseIndex: true, stepIndex: true },
    }),
  ]);

  const state = readingState(latestReading?.version, technique.version);
  const readCurrentVersion = state === "read";
  const triviaAvailable = activeTriviaQuestions > 0;
  const plan = getReadingPlan(technique.slug, technique.steps.length);

  const rawPhase = firstValue(query.fase);
  const rawStep = firstValue(query.paso);
  const requestedPhase = positionSchema.parse(rawPhase) - 1;
  const requestedStep = positionSchema.parse(rawStep) - 1;

  const basePhase =
    rawPhase !== undefined
      ? requestedPhase
      : rawStep !== undefined
        ? phaseIndexForStep(plan, requestedStep)
        : (progress?.phaseIndex ?? 0);
  const baseStep =
    rawPhase !== undefined || rawStep !== undefined
      ? requestedStep
      : (progress?.stepIndex ?? 0);

  const initialPhaseIndex = clampPhaseIndex(plan, basePhase);
  const initialStepIndex = clampStepToPhase(plan, initialPhaseIndex, baseStep);

  const readerTechnique = {
    id: technique.id,
    slug: technique.slug,
    title: technique.title,
    summary: technique.summary,
    definition: technique.definition,
    version: technique.version,
    steps: technique.steps.map((step) => ({
      id: step.id,
      text: step.text,
      emphasis: step.emphasis,
      order: step.order,
    })),
    objectives: technique.objectives.map((objective) => ({
      id: objective.id,
      text: objective.text,
      kind: objective.kind,
    })),
    materials: technique.materials.map((material) => ({
      id: material.id,
      text: material.text,
    })),
  };

  const sections = [
    { id: "caso", label: "Caso" },
    ...(technique.images.length > 0 || technique.videos.length > 0
      ? [{ id: "recursos", label: "Recursos" }]
      : []),
    ...(technique.checklist.length > 0 ? [{ id: "checklist", label: "Check list" }] : []),
    ...(technique.activities.length > 0 ? [{ id: "juegos", label: "Juegos" }] : []),
    { id: "terminar-lectura", label: "Cierre" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/tecnicas"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a técnicas
      </Link>

      {state === "outdated" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-600/30 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-900">
              <BellRing className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-navy">
                Hay una versión nueva de esta técnica
              </p>
              <p className="text-xs leading-relaxed text-amber-950/80">
                Publicamos la versión {technique.version}. Tu última lectura es de la
                versión {latestReading?.version ?? "anterior"}. Releela para registrar la
                versión actual y mantener tu progreso al día.
              </p>
            </div>
          </div>
          <Link
            href={`/tecnicas/${technique.slug}?fase=1&paso=1`}
            className={buttonVariants({ size: "sm" })}
          >
            Empezar la nueva versión
          </Link>
        </div>
      ) : null}

      <nav
        aria-label="Secciones de la técnica"
        className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 backdrop-blur"
      >
        <ul className="flex w-max gap-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-bordo/40 hover:text-bordo"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <TechniqueReader
        technique={readerTechnique}
        plan={plan}
        initialPhaseIndex={initialPhaseIndex}
        initialStepIndex={initialStepIndex}
        readCurrentVersion={readCurrentVersion}
      />

      {technique.images.length > 0 || technique.videos.length > 0 ? (
        <section id="recursos" className="scroll-mt-24 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
              Material de apoyo
            </p>
            <h2 className="border-b border-border pb-2 text-xl font-bold text-navy">
              Recursos del caso
            </h2>
          </div>

          {technique.images.length > 0 ? (
            <ImageGallery
              images={technique.images.map((image) => ({
                id: image.id,
                url: image.url,
                alt: image.alt,
                credit: image.credit,
              }))}
            />
          ) : null}

          {technique.videos.length > 0 ? (
            <div className="space-y-6">
              {technique.videos.map((video) => (
                <VideoPlayer
                  key={video.id}
                  video={{
                    id: video.id,
                    title: video.title,
                    url: video.url,
                    institutional: video.institutional,
                  }}
                  initialViewed={videoViews.some((view) => view.videoId === video.id)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {technique.checklist.length > 0 ? (
        <section id="checklist" className="scroll-mt-24 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
              Práctica
            </p>
            <h2 className="border-b border-border pb-2 text-xl font-bold text-navy">
              Check list
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Marcá cómo realizás cada paso para identificar lo que necesitás repasar antes de
            la práctica en simulación. Está paginado de a 5 ítems para que puedas concentrarte.
          </p>
          <ChecklistAssessment
            items={technique.checklist.map((item) => ({ id: item.id, text: item.text }))}
          />
        </section>
      ) : null}

      {technique.activities.length > 0 ? (
        <section id="juegos" className="scroll-mt-24 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
              Evaluación
            </p>
            <h2 className="border-b border-border pb-2 text-xl font-bold text-navy">Juegos</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Poné a prueba lo que aprendiste. Podés repetir los juegos las veces que quieras.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {technique.activities.map((activity) => (
              <li
                key={activity.id}
                className="space-y-2 rounded-xl border border-border bg-white p-4"
              >
                <div className="flex items-center gap-2 text-bordo">
                  <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {activity.type === "TRIVIA"
                      ? "Trivia"
                      : activity.type === "ORDER_STEPS"
                        ? "Ordenar pasos"
                        : "Sala de escape"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-navy">{activity.title}</h3>
                {activity.type === "ORDER_STEPS" ? (
                  <Link
                    href={`/tecnicas/${technique.slug}/jugar/ordenar`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Jugar ahora
                  </Link>
                ) : activity.type === "TRIVIA" ? (
                  triviaAvailable ? (
                    <Link
                      href={`/tecnicas/${technique.slug}/jugar/trivia`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Jugar ahora
                    </Link>
                  ) : (
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      Sin preguntas todavía
                    </span>
                  )
                ) : (
                  <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    Próximamente
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReadingCompletion
        techniqueId={technique.id}
        currentVersion={technique.version}
        readCurrentVersion={readCurrentVersion}
        lastCompletedLabel={
          latestReading ? dateFormatter.format(latestReading.completedAt) : null
        }
      />
    </div>
  );
}
