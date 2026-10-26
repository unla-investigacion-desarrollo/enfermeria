"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Map,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadingCheckpoint } from "@/components/technique/reading-checkpoint";
import { StepQuickReview } from "@/components/technique/step-quick-review";
import { PhaseGlyph, phaseTone } from "@/components/technique/phase-visuals";
import {
  checkpointForStep,
  clampPhaseIndex,
  clampStepToPhase,
  phaseIndexForStep,
  type ReadingPlan,
} from "@/lib/techniques/reading-plan";
import { saveReadingProgressAction } from "@/app/(student)/tecnicas/actions";
import { cn } from "@/lib/utils";

export type ReaderStep = {
  id: string;
  text: string;
  emphasis: boolean;
  order: number;
};

export type ReaderTechnique = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  definition: string;
  version: number;
  steps: ReaderStep[];
  objectives: { id: string; text: string; kind: string }[];
  materials: { id: string; text: string }[];
};

type Props = {
  technique: ReaderTechnique;
  plan: ReadingPlan;
  initialPhaseIndex: number;
  initialStepIndex: number;
  readCurrentVersion: boolean;
};

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function TechniqueReader({
  technique,
  plan,
  initialPhaseIndex,
  initialStepIndex,
  readCurrentVersion,
}: Props) {
  const [phaseIndex, setPhaseIndex] = useState(() =>
    clampPhaseIndex(plan, initialPhaseIndex),
  );
  const [stepIndex, setStepIndex] = useState(() =>
    clampStepToPhase(plan, clampPhaseIndex(plan, initialPhaseIndex), initialStepIndex),
  );
  const [passed, setPassed] = useState<Set<string>>(() => new Set());
  const [firstTryResults, setFirstTryResults] = useState<Record<string, boolean>>({});
  const [showMap, setShowMap] = useState(false);
  const stepRef = useRef<HTMLElement>(null);

  const phase = plan.phases[phaseIndex] ?? plan.phases[0];
  const step = technique.steps[stepIndex];
  const totalSteps = technique.steps.length;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= totalSteps - 1;
  const checkpoint = phase ? checkpointForStep(phase, stepIndex) : null;
  const checkpointPassed = checkpoint ? passed.has(checkpoint.id) : false;
  const phaseCheckpointCount = phase?.checkpoints.length ?? 0;
  const totalPassed = plan.phases.reduce(
    (sum, item) => sum + item.checkpoints.filter((checkpointItem) => passed.has(checkpointItem.id)).length,
    0,
  );
  const firstTryClean = Object.values(firstTryResults).filter(Boolean).length;
  const checkpointsAttempted = Object.keys(firstTryResults).length;
  const stepPercent = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0;
  const phasePercent = phase
    ? Math.round(((stepIndex - phase.from + 1) / (phase.to - phase.from + 1)) * 100)
    : 0;
  const phaseComplete = phase
    ? stepIndex === phase.to && phase.checkpoints.every((item) => passed.has(item.id))
    : false;
  const nextPhase = plan.phases[phaseIndex + 1] ?? null;
  const tone = phaseTone(phase?.tone ?? "navy");
  const currentCheckpointIndex = checkpoint
    ? phase?.checkpoints.findIndex((item) => item.id === checkpoint.id) ?? 0
    : 0;

  const goTo = useCallback(
    (nextPhaseIndex: number, nextStepIndex: number) => {
      const safePhase = clampPhaseIndex(plan, nextPhaseIndex);
      const safeStep = clampStepToPhase(plan, safePhase, nextStepIndex);

      setPhaseIndex(safePhase);
      setStepIndex(safeStep);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("fase", String(safePhase + 1));
        url.searchParams.set("paso", String(safeStep + 1));
        window.history.replaceState(null, "", url);

        requestAnimationFrame(() => {
          stepRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        });
      }
    },
    [plan],
  );

  const advance = useCallback(() => {
    if (!phase) return;

    if (stepIndex < phase.to) {
      goTo(phaseIndex, stepIndex + 1);
      return;
    }

    if (nextPhase) {
      goTo(phaseIndex + 1, nextPhase.from);
      return;
    }

    if (typeof document !== "undefined") {
      document
        .getElementById("terminar-lectura")
        ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  }, [goTo, nextPhase, phase, phaseIndex, stepIndex]);

  const next = useCallback(() => {
    if (checkpoint && !checkpointPassed) {
      if (typeof document !== "undefined") {
        document
          .getElementById("checkpoint-actual")
          ?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      }
      return;
    }

    advance();
  }, [advance, checkpoint, checkpointPassed]);

  const previous = useCallback(() => {
    if (!phase) return;

    if (stepIndex > phase.from) {
      goTo(phaseIndex, stepIndex - 1);
      return;
    }

    const previousPhase = plan.phases[phaseIndex - 1];
    if (previousPhase) goTo(phaseIndex - 1, previousPhase.to);
  }, [goTo, phase, phaseIndex, plan.phases, stepIndex]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveReadingProgressAction({
        techniqueId: technique.id,
        phaseIndex,
        stepIndex,
      }).catch(() => undefined);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [phaseIndex, stepIndex, technique.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, button, a, summary, [contenteditable='true']",
        )
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  const objectives = useMemo(
    () => technique.objectives.filter((objective) => objective.kind === "SPECIFIC"),
    [technique.objectives],
  );

  if (!phase || !step) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        Esta técnica todavía no tiene pasos publicados.
      </p>
    );
  }

  function passCheckpoint() {
    if (!checkpoint) return;
    setPassed((current) => {
      const updated = new Set(current);
      updated.add(checkpoint.id);
      return updated;
    });
    advance();
  }

  return (
    <div className="space-y-5" aria-keyshortcuts="ArrowLeft ArrowRight">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-bordo px-2.5 py-1 text-white">Caso simulado</span>
          <span className="rounded-full bg-navy/10 px-2.5 py-1 text-navy">
            Contenido oficial de Enfermería
          </span>
          {readCurrentVersion ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Leída
            </span>
          ) : null}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
            Caso 01 · Vía periférica
          </p>
          <h1 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">
            {technique.title}
          </h1>
          {technique.summary ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {technique.summary}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-2 rounded-xl border border-bordo/20 bg-bordo/[0.04] p-3 text-sm">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-bordo" aria-hidden="true" />
          <p className="leading-relaxed text-navy">
            <span className="font-semibold">Tu misión:</span> recorrer la técnica y superar
            los checkpoints sin errores críticos.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border bg-white p-2">
            <p className="text-lg font-extrabold text-navy">{plan.phases.length}</p>
            <p className="text-muted-foreground">fases</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-2">
            <p className="text-lg font-extrabold text-navy">{totalSteps}</p>
            <p className="text-muted-foreground">pasos</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-2">
            <p className="text-lg font-extrabold text-navy">{plan.checkpointCount}</p>
            <p className="text-muted-foreground">checkpoints</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Avance del caso</span>
            <span>
              {stepPercent}% · {totalPassed} de {plan.checkpointCount} checkpoints
              {checkpointsAttempted > 0
                ? ` · ${firstTryClean} al primer intento`
                : ""}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Avance de la lectura"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stepPercent}
            className="h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-bordo transition-[width]"
              style={{ width: `${stepPercent}%` }}
            />
          </div>
        </div>

        <details className="rounded-xl border border-border bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-navy">
            <span>Contexto del caso: definición, objetivos y materiales</span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          </summary>
          <div className="space-y-4 border-t border-border p-4 text-sm">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-bordo">Definición</h3>
              <p className="whitespace-pre-line leading-relaxed">{technique.definition}</p>
            </div>

            {objectives.length > 0 ? (
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-bordo">
                  Objetivos específicos
                </h3>
                <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                  {objectives.map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {technique.materials.length > 0 ? (
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-bordo">
                  Materiales
                </h3>
                <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                  {technique.materials.map((material) => (
                    <li key={material.id}>{material.text}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Fases de la técnica" className="min-w-0 flex-1">
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {plan.phases.map((item, index) => {
              const itemTone = phaseTone(item.tone);
              const active = index === phaseIndex;

              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    onClick={() => goTo(index, item.from)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      active
                        ? `${itemTone.solid} border-transparent`
                        : "border-border bg-white text-muted-foreground hover:border-bordo/40 hover:text-navy",
                    )}
                  >
                    <PhaseGlyph icon={item.icon} className="h-3.5 w-3.5" />
                    {item.shortTitle}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setShowMap((value) => !value)}
          aria-expanded={showMap}
          aria-controls="mapa-fases"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:border-bordo/40"
        >
          <Map className="h-3.5 w-3.5" aria-hidden="true" />
          {showMap ? "Ocultar mapa" : "Mapa"}
        </button>
      </div>

      {showMap ? (
        <div id="mapa-fases" className="grid gap-2 sm:grid-cols-2">
          {plan.phases.map((item, index) => {
            const itemTone = phaseTone(item.tone);
            const completed = readCurrentVersion || index < phaseIndex;
            const active = index === phaseIndex;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  goTo(index, item.from);
                  setShowMap(false);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-white p-3 text-left transition-colors hover:border-bordo/40",
                  active ? itemTone.border : "border-border",
                )}
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", itemTone.soft)}>
                  <PhaseGlyph icon={item.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-navy">
                    Fase {index + 1}: {item.title}
                    {completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Pasos {item.from + 1}–{item.to + 1} ·{" "}
                    {item.checkpoints.length === 0
                      ? "sin checkpoint"
                      : `${item.checkpoints.length} checkpoint${item.checkpoints.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {item.goal}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <section
        id="caso"
        ref={stepRef}
        aria-labelledby="paso-a-paso"
        className="scroll-mt-24 space-y-3"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
              Fase {phaseIndex + 1} · {phase.title}
            </p>
            <h2 id="paso-a-paso" className="text-xl font-bold text-navy">
              Técnica paso a paso
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{phase.goal}</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            Paso {stepIndex + 1} de {totalSteps}
          </span>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{phase.shortTitle}</span>
              <span>{phasePercent}% de la fase</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Avance de la fase ${phaseIndex + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={phasePercent}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn("h-full rounded-full transition-[width]", tone.progress)}
                style={{ width: `${phasePercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                tone.soft,
              )}
              aria-hidden="true"
            >
              {stepIndex + 1}
            </span>
            <div className="min-w-0 space-y-2">
              {step.emphasis ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Punto crítico
                </span>
              ) : null}
              <p
                className={cn(
                  "text-[15px] leading-relaxed sm:text-base",
                  step.emphasis && "font-semibold",
                )}
              >
                {step.text}
              </p>
            </div>
          </div>

          {step.emphasis ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Este paso está marcado como crítico en la técnica. Revisalo antes de avanzar:
                es de los que más impactan en la seguridad del procedimiento.
              </p>
            </div>
          ) : null}

          {checkpoint && checkpointPassed ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Checkpoint superado
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={previous} disabled={isFirst} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
            <div className="flex flex-col gap-1 sm:items-end">
              <Button onClick={next} className="w-full sm:w-auto">
                {checkpoint && !checkpointPassed
                  ? "Responder checkpoint"
                  : isLast
                    ? "Ir al cierre"
                    : stepIndex === phase.to && nextPhase
                      ? `Siguiente: ${nextPhase.shortTitle}`
                      : "Siguiente"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <p className="text-center text-[11px] text-muted-foreground sm:text-right">
                {checkpoint && !checkpointPassed
                  ? "Resolvé el checkpoint para continuar o saltalo desde la tarjeta."
                  : "También podés usar ← → en el teclado."}
              </p>
            </div>
          </div>
        </div>

        {checkpoint && !checkpointPassed ? (
          <div id="checkpoint-actual" className="scroll-mt-24">
            <ReadingCheckpoint
              checkpoint={checkpoint}
              index={currentCheckpointIndex}
              total={phaseCheckpointCount}
              sourceText={technique.steps[checkpoint.sourceStep - 1]?.text}
              onPassed={passCheckpoint}
              onSkip={advance}
              onResult={(firstTryCorrect) =>
                setFirstTryResults((current) =>
                  current[checkpoint.id] === undefined
                    ? { ...current, [checkpoint.id]: firstTryCorrect }
                    : current,
                )
              }
            />
          </div>
        ) : null}

        {phaseComplete ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-600/30 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-bold">Fase completada</p>
                <p className="text-xs leading-relaxed">
                  {nextPhase
                    ? `Siguiente: ${nextPhase.title}.`
                    : `Resolución del caso: ${firstTryClean} de ${plan.checkpointCount} checkpoints al primer intento. Podés cerrar la lectura y jugar.`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={next}>
              {nextPhase ? "Ir a la siguiente fase" : "Ir al cierre"}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </section>

      <details className="rounded-xl border border-border bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-navy">
          <span>Repaso rápido: los {totalSteps} pasos, paginados</span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </summary>
        <div className="border-t border-border p-4">
          <StepQuickReview
            steps={technique.steps.map((item) => ({
              id: item.id,
              text: item.text,
              emphasis: item.emphasis,
            }))}
            currentStep={stepIndex}
            onJump={(nextStepIndex) =>
              goTo(phaseIndexForStep(plan, nextStepIndex), nextStepIndex)
            }
          />
        </div>
      </details>
    </div>
  );
}
