import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { buttonVariants } from "@/components/ui/button";
import { TechniqueContent } from "@/components/technique/technique-content";
import { ReadingCompletion } from "@/components/technique/reading-completion";
import { ScrollProgress } from "@/components/technique/scroll-progress";
import { techniqueContentInclude } from "@/lib/techniques/queries";
import { readingState } from "@/lib/techniques/reading";

type PageProps = { params: Promise<{ slug: string }> };

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const technique = await prisma.technique.findFirst({
    where: { slug, published: true },
    select: { title: true },
  });

  return { title: technique?.title ?? "Técnica" };
}

export default async function TechniqueReadingPage({ params }: PageProps) {
  const user = await requireUser();
  const { slug } = await params;

  const technique = await prisma.technique.findFirst({
    where: { slug, published: true },
    include: { ...techniqueContentInclude, activities: true },
  });

  if (!technique) notFound();

  const [latestReading, videoViews, activeTriviaQuestions] = await Promise.all([
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
  ]);

  const state = readingState(latestReading?.version, technique.version);
  const readCurrentVersion = state === "read";
  const triviaAvailable = activeTriviaQuestions > 0;

  const sections = [
    { id: "definicion", label: "Definición" },
    ...(technique.objectives.length > 0 ? [{ id: "objetivos", label: "Objetivos" }] : []),
    ...(technique.materials.length > 0 ? [{ id: "materiales", label: "Materiales" }] : []),
    { id: "pasos", label: "Paso a paso" },
    ...(technique.images.length > 0 ? [{ id: "imagenes", label: "Imágenes" }] : []),
    ...(technique.videos.length > 0 ? [{ id: "videos", label: "Videos" }] : []),
    ...(technique.checklist.length > 0 ? [{ id: "checklist", label: "Check list" }] : []),
    ...(technique.activities.length > 0 ? [{ id: "juegos", label: "Juegos" }] : []),
  ];

  return (
    <div className="space-y-6">
      <ScrollProgress />

      <Link
        href="/tecnicas"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a técnicas
      </Link>

      <header className="space-y-2 rounded-xl bg-gradient-to-br from-bordo to-bordo-dark p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Técnica</p>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{technique.title}</h1>
        {technique.summary ? (
          <p className="text-sm leading-relaxed text-white/85">{technique.summary}</p>
        ) : null}
        <p className="text-xs text-white/75">Versión {technique.version}</p>
      </header>

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

      <div className="rounded-xl border border-border bg-white p-4 sm:p-8">
        <TechniqueContent
          technique={technique}
          showTitle={false}
          interactiveVideos
          viewedVideoIds={videoViews.map((view) => view.videoId)}
        />
      </div>

      {technique.activities.length > 0 ? (
        <section id="juegos" className="scroll-mt-24 space-y-3">
          <h2 className="border-b border-border pb-2 text-xl font-bold text-navy">Juegos</h2>
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
