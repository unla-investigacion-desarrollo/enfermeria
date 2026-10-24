/* eslint-disable @next/next/no-img-element */
import type {
  ChecklistItem,
  Material,
  Objective,
  Step,
  Technique,
  TechniqueImage,
  Video,
} from "@prisma/client";
import { toEmbedUrl } from "@/lib/videos";

export type TechniqueWithContent = Technique & {
  objectives: Objective[];
  materials: Material[];
  steps: Step[];
  images: TechniqueImage[];
  videos: Video[];
  checklist: ChecklistItem[];
};

type Props = {
  technique: TechniqueWithContent;
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="border-b border-border pb-2 text-xl font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export function TechniqueContent({ technique }: Props) {
  const generalObjectives = technique.objectives.filter((item) => item.kind === "GENERAL");
  const specificObjectives = technique.objectives.filter((item) => item.kind === "SPECIFIC");

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">{technique.title}</h1>
        {technique.summary ? (
          <p className="text-sm text-muted-foreground">{technique.summary}</p>
        ) : null}
      </header>

      <Section id="definicion" title="Definición">
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{technique.definition}</p>
      </Section>

      {technique.objectives.length > 0 ? (
        <Section id="objetivos" title="Objetivos">
          <div className="space-y-4">
            {generalObjectives.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-bordo">
                  Generales
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-[15px]">
                  {generalObjectives.map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {specificObjectives.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-bordo">
                  Específicos
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-[15px]">
                  {specificObjectives.map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {technique.materials.length > 0 ? (
        <Section id="materiales" title="Materiales">
          <ul className="list-disc space-y-1 pl-5 text-[15px]">
            {technique.materials.map((material) => (
              <li key={material.id}>{material.text}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="pasos" title="Técnica paso a paso">
        <ol className="space-y-3">
          {technique.steps.map((step, index) => (
            <li key={step.id} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bordo/10 text-xs font-bold text-bordo">
                {index + 1}
              </span>
              <p
                className={
                  step.emphasis
                    ? "text-[15px] font-semibold leading-relaxed"
                    : "text-[15px] leading-relaxed"
                }
              >
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {technique.images.length > 0 ? (
        <Section id="imagenes" title="Imágenes">
          <div className="grid gap-6 sm:grid-cols-2">
            {technique.images.map((image) => (
              <figure key={image.id} className="space-y-2">
                <div className="overflow-hidden rounded-lg border border-border bg-muted">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="h-auto w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="text-xs leading-relaxed text-muted-foreground">
                  {image.alt}. {image.credit}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {technique.videos.length > 0 ? (
        <Section id="videos" title="Videos">
          <div className="space-y-6">
            {technique.videos.map((video) => {
              const embedUrl = toEmbedUrl(video.url);
              return (
                <div key={video.id} className="space-y-2">
                  <h3 className="text-base font-semibold">{video.title}</h3>
                  {embedUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                      <iframe
                        src={embedUrl}
                        title={video.title}
                        className="h-full w-full"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">
                      La URL del video no es válida. TODO(enfermería): revisar el enlace.
                    </p>
                  )}
                  {!video.institutional ? (
                    <p className="text-xs text-muted-foreground">
                      Este video no es material institucional de la UNLa; se incluye como apoyo.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {technique.checklist.length > 0 ? (
        <Section id="checklist" title="Check list">
          <ol className="list-decimal space-y-2 pl-5 text-[15px]">
            {technique.checklist.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ol>
        </Section>
      ) : null}
    </article>
  );
}
