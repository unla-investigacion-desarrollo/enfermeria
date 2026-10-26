"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Checkpoint = {
  id: string;
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  sourceStep: number;
};

type Props = {
  checkpoint: Checkpoint;
  index: number;
  total: number;
  sourceText?: string;
  onPassed: () => void;
  onSkip: () => void;
  onResult?: (firstTryCorrect: boolean) => void;
};

type Feedback = "none" | "wrong" | "correct" | "revealed";

export function ReadingCheckpoint({
  checkpoint,
  index,
  total,
  sourceText,
  onPassed,
  onSkip,
  onResult,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const reportedRef = useRef(false);
  const legendId = useId();

  const answered = feedback === "correct" || feedback === "revealed";

  function check() {
    if (selected === null) return;

    const isCorrect = selected === checkpoint.correctIdx;

    if (!reportedRef.current) {
      reportedRef.current = true;
      onResult?.(isCorrect);
    }

    if (isCorrect) {
      setFeedback("correct");
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setFeedback(nextAttempts >= 2 ? "revealed" : "wrong");
    }

    requestAnimationFrame(() => feedbackRef.current?.focus());
  }

  function retry() {
    setFeedback("none");
    setSelected(null);
  }

  return (
    <section
      aria-labelledby={legendId}
      className="animate-slide-up space-y-4 rounded-xl border-2 border-dashed border-bordo/35 bg-bordo/[0.03] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bordo/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-bordo">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          Checkpoint {index + 1} de {total}
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="min-h-11 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
        >
          Saltar por ahora
        </button>
      </div>

      <fieldset className="space-y-3">
        <legend id={legendId} className="text-base font-bold leading-snug text-navy">
          {checkpoint.question}
        </legend>

        <div className="space-y-2">
          {checkpoint.options.map((option, optionIdx) => {
            const checked = selected === optionIdx;
            const isCorrect = answered && optionIdx === checkpoint.correctIdx;
            const isWrongChoice =
              feedback === "revealed" && checked && optionIdx !== checkpoint.correctIdx;

            return (
              <label
                key={optionIdx}
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 text-sm transition-colors",
                  checked
                    ? "border-bordo bg-bordo/5"
                    : "border-border hover:border-bordo/40 hover:bg-accent",
                  isCorrect && "border-emerald-600/50 bg-emerald-50",
                  isWrongChoice && "border-destructive/40 bg-destructive/5",
                )}
              >
                <input
                  type="radio"
                  name={`checkpoint-${checkpoint.id}`}
                  value={optionIdx}
                  checked={checked}
                  onChange={() => setSelected(optionIdx)}
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
            answered
              ? "border-emerald-600/30 bg-emerald-50 text-emerald-950"
              : "border-amber-600/30 bg-amber-50 text-amber-950",
          )}
        >
          {answered ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className="font-semibold">
              {feedback === "correct"
                ? "Correcto. Buen ojo clínico."
                : feedback === "wrong"
                  ? "Casi. Volvé al paso y probá de nuevo."
                  : "La respuesta correcta está marcada en verde."}
            </p>
            {answered ? <p className="leading-relaxed">{checkpoint.explanation}</p> : null}
            {feedback === "wrong" ? (
              <p className="text-xs leading-relaxed text-amber-900">
                Te queda un intento antes de mostrar la respuesta.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {sourceText ? (
        <details className="rounded-lg border border-border bg-white">
          <summary className="min-h-11 cursor-pointer px-3 py-2 text-xs font-semibold text-navy">
            Ver el paso {checkpoint.sourceStep}
          </summary>
          <p className="border-t border-border px-3 py-2 text-sm leading-relaxed text-muted-foreground">
            {sourceText}
          </p>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Este checkpoint no suma ni resta XP.
        </p>
        {answered ? (
          <Button onClick={onPassed} className="w-full sm:w-auto">
            Continuar
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : feedback === "wrong" ? (
          <Button variant="outline" onClick={retry} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Intentar de nuevo
          </Button>
        ) : (
          <Button onClick={check} disabled={selected === null} className="w-full sm:w-auto">
            Comprobar
          </Button>
        )}
      </div>
    </section>
  );
}
