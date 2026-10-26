import Link from "next/link";
import {
  ArrowRight,
  Gamepad2,
  Sparkles,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import type { ReadingPlan } from "@/lib/techniques/reading-plan";
import type { LevelInfo } from "@/lib/gamification/levels";

type Props = {
  technique: {
    slug: string;
    title: string;
    summary: string | null;
    version: number;
    stepCount: number;
  };
  plan: ReadingPlan;
  currentPhaseIndex: number;
  currentStepIndex: number;
  read: boolean;
  hasProgress: boolean;
  level: LevelInfo;
  badgesCount: number;
  readCount: number;
  totalTechniques: number;
};

export function CaseHero({
  technique,
  plan,
  currentPhaseIndex,
  currentStepIndex,
  read,
  hasProgress,
  level,
  badgesCount,
  readCount,
  totalTechniques,
}: Props) {
  const phase = plan.phases[currentPhaseIndex] ?? plan.phases[0];
  const stepPercent =
    plan.totalSteps > 0
      ? Math.round(((currentStepIndex + 1) / plan.totalSteps) * 100)
      : 0;
  const continueHref = hasProgress
    ? `/tecnicas/${technique.slug}?fase=${currentPhaseIndex + 1}&paso=${currentStepIndex + 1}`
    : `/tecnicas/${technique.slug}`;
  const ctaLabel = read
    ? "Repasar el caso"
    : hasProgress
      ? `Continuar en Fase ${currentPhaseIndex + 1}`
      : "Empezar el caso";

  return (
    <section
      aria-labelledby="tu-turno"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-bordo via-bordo to-navy text-white shadow-sm"
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">
            Tu turno
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            Caso 01
          </span>
        </div>

        <div className="space-y-2">
          <h2 id="tu-turno" className="text-2xl font-extrabold leading-tight sm:text-3xl">
            {technique.title}
          </h2>
          {technique.summary ? (
            <p className="max-w-2xl text-sm leading-relaxed text-white/90">
              {technique.summary}
            </p>
          ) : null}
          <p className="flex items-start gap-2 text-xs leading-relaxed text-white/85">
            <Target className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold text-white">Tu misión:</span> recorrer las{" "}
              {plan.phases.length} fases, superar {plan.checkpointCount} checkpoints y llegar
              al cierre sin errores críticos.
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-white/85">
            Tu progreso
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span>
              {hasProgress ? (
                <>
                  Fase {currentPhaseIndex + 1} de {plan.phases.length} ·{" "}
                  {phase?.shortTitle ?? "Técnica"}
                </>
              ) : (
                <>Caso sin empezar</>
              )}
            </span>
            <span>
              {read ? "Leída" : `${stepPercent}%`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Avance del caso"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={read ? 100 : stepPercent}
            className="h-2.5 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className="h-full rounded-full bg-amber-300 transition-[width]"
              style={{ width: `${read ? 100 : stepPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-white/80">
            {plan.totalSteps} pasos · {plan.phases.length} fases ·{" "}
            {plan.checkpointCount} checkpoints
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={continueHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-bordo transition-colors hover:bg-amber-50"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={`/tecnicas/${technique.slug}#juegos`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/40 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Gamepad2 className="h-4 w-4" aria-hidden="true" />
            Jugar
          </Link>
          <Link
            href="/perfil"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Mi perfil
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-white/15 bg-white/10 text-center">
        <div className="bg-bordo-dark/40 px-2 py-3">
          <p className="text-lg font-extrabold">{level.xp} XP</p>
          <p className="text-[11px] text-white/80">Nivel {level.level}</p>
        </div>
        <div className="bg-bordo-dark/40 px-2 py-3">
          <p className="inline-flex items-center gap-1 text-lg font-extrabold">
            <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
            {badgesCount}
          </p>
          <p className="text-[11px] text-white/80">Insignias</p>
        </div>
        <div className="bg-bordo-dark/40 px-2 py-3">
          <p className="inline-flex items-center gap-1 text-lg font-extrabold">
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
            {readCount}/{totalTechniques}
          </p>
          <p className="text-[11px] text-white/80">Técnicas leídas</p>
        </div>
      </div>

      <div className="border-t border-white/15 bg-navy-dark/50 px-5 py-2 text-[11px] text-white/75 sm:px-6">
        <span className="font-semibold text-white/90">{level.name}</span>
        {level.nextLevel ? (
          <>
            {" "}
            · te faltan {level.xpToNext} XP para {level.nextLevel.name}
          </>
        ) : (
          <> · nivel máximo alcanzado</>
        )}
        <span className="float-right hidden sm:inline">
          Contenido oficial de Enfermería · caso simulado
        </span>
      </div>
    </section>
  );
}
