"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  techniqueSlug: string;
  phaseIndex: number;
  phaseTitle: string;
  checkpoint: {
    id: string;
    question: string;
    options: string[];
    correctIdx: number;
    explanation: string;
    sourceStep: number;
  };
};

export function DailyCase({
  techniqueSlug,
  phaseIndex,
  phaseTitle,
  checkpoint,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const legendId = useId();

  const answered = feedback === "correct";

  function check() {
    if (selected === null) return;
    setFeedback(selected === checkpoint.correctIdx ? "correct" : "wrong");
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }

  return (
    <section
      aria-labelledby={legendId}
      className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          Caso del día
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Fase {phaseIndex + 1} · {phaseTitle}
        </span>
      </div>

      <fieldset className="space-y-3">
        <legend id={legendId} className="text-base font-bold leading-snug text-navy">
          {checkpoint.question}
        </legend>

        <div className="space-y-2">
          {checkpoint.options.map((option, optionIdx) => {
            const checked = selected === optionIdx;
            const isCorrect = answered && optionIdx === checkpoint.correctIdx;

            return (
              <label
                key={optionIdx}
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 text-sm transition-colors",
                  checked
                    ? "border-bordo bg-bordo/5"
                    : "border-border hover:border-bordo/40 hover:bg-accent",
                  isCorrect && "border-emerald-600/50 bg-emerald-50",
                )}
              >
                <input
                  type="radio"
                  name={`daily-${checkpoint.id}`}
                  value={optionIdx}
                  checked={checked}
                  onChange={() => {
                    setSelected(optionIdx);
                    setFeedback("none");
                  }}
                  disabled={answered}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                />
                <span className="leading-relaxed">{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {feedback !== "none" ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            feedback === "correct"
              ? "border-emerald-600/30 bg-emerald-50 text-emerald-950"
              : "border-amber-600/30 bg-amber-50 text-amber-950",
          )}
        >
          {feedback === "correct" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className="font-semibold">
              {feedback === "correct" ? "Correcto." : "Casi. Probá de nuevo."}
            </p>
            {feedback === "correct" ? (
              <p className="leading-relaxed">{checkpoint.explanation}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Un minuto de repaso. No suma ni resta XP.
        </p>
        {answered ? (
          <Link
            href={`/tecnicas/${techniqueSlug}?fase=${phaseIndex + 1}&paso=${checkpoint.sourceStep}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-bordo underline-offset-4 hover:underline"
          >
            Ver el paso {checkpoint.sourceStep}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : feedback === "wrong" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelected(null);
              setFeedback("none");
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Intentar de nuevo
          </Button>
        ) : (
          <Button size="sm" onClick={check} disabled={selected === null}>
            Comprobar
          </Button>
        )}
      </div>
    </section>
  );
}
