import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { PhaseGlyph, phaseTone } from "@/components/technique/phase-visuals";
import type { ReadingPlan } from "@/lib/techniques/reading-plan";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  plan: ReadingPlan;
  currentPhaseIndex: number;
  read: boolean;
};

export function CaseProgressMap({ slug, plan, currentPhaseIndex, read }: Props) {
  return (
    <section aria-labelledby="mapa-caso" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
            Itinerario
          </p>
          <h2 id="mapa-caso" className="text-lg font-bold text-navy">
            Mapa del caso
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {read ? "Caso completo" : `Fase ${currentPhaseIndex + 1} de ${plan.phases.length}`}
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {plan.phases.map((phase, index) => {
          const tone = phaseTone(phase.tone);
          const completed = read || index < currentPhaseIndex;
          const current = !read && index === currentPhaseIndex;
          const href = `/tecnicas/${slug}?fase=${index + 1}&paso=${phase.from + 1}`;

          return (
            <li key={phase.id}>
              <Link
                href={href}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex h-full items-start gap-3 rounded-xl border bg-white p-3 transition-colors hover:border-bordo/40",
                  current ? tone.border : "border-border",
                  completed && "bg-emerald-50/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    completed ? "bg-emerald-100 text-emerald-800" : tone.soft,
                  )}
                >
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <PhaseGlyph icon={phase.icon} className="h-4 w-4" />
                  )}
                </span>

                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-navy">
                    Fase {index + 1}: {phase.title}
                    {current ? (
                      <span className="rounded-full bg-bordo px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Ahora
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Pasos {phase.from + 1}–{phase.to + 1} ·{" "}
                    {phase.checkpoints.length === 0
                      ? "sin checkpoint"
                      : `${phase.checkpoints.length} checkpoint${phase.checkpoints.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {phase.goal}
                  </span>
                </span>

                <ChevronRight
                  className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ol>

      {!read ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
          Cada fase termina con un checkpoint. Podés saltarlo, pero no suma al avance.
        </p>
      ) : null}
    </section>
  );
}
