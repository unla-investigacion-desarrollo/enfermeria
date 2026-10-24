"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { XpToast } from "@/components/gamification/xp-toast";
import { submitTriviaAction } from "@/app/(student)/tecnicas/actions";
import type { TriviaItem } from "@/lib/games/trivia";
import type { ToastPayload } from "@/lib/gamification/types";
import { cn } from "@/lib/utils";

type Props = {
  techniqueSlug: string;
  seed: string;
  questions: TriviaItem[];
  passScore: number;
};

type Result = Extract<Awaited<ReturnType<typeof submitTriviaAction>>, { score: number }>;

export function TriviaGame({ techniqueSlug, seed, questions, passScore }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (ready && !result) headingRef.current?.focus();
  }, [index, ready, result]);

  const current = questions[index];
  const lastIndex = questions.length - 1;
  const allAnswered = answers.every((answer) => answer !== null);
  const currentAnswer = answers[index] ?? null;

  function choose(optionIdx: number) {
    setAnswers((previous) =>
      previous.map((answer, position) => (position === index ? optionIdx : answer)),
    );
  }

  function submit() {
    if (!allAnswered) {
      setError("Respondé todas las preguntas antes de terminar.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await submitTriviaAction({
        techniqueSlug,
        seed,
        answers: questions.map((question, position) => ({
          questionId: question.id,
          chosenIdx: answers[position] ?? 0,
        })),
      });

      if ("error" in response) {
        setError(response.error);
        return;
      }

      setResult(response);
      if (response.xpAwarded > 0 || response.badges.length > 0) {
        setToast({
          id: Date.now(),
          amount: response.xpAwarded,
          badges: response.badges,
        });
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-5">
        <section
          aria-labelledby="trivia-resultado"
          className={cn(
            "space-y-3 rounded-xl border p-5 text-center",
            result.passed
              ? "border-emerald-600/30 bg-emerald-50"
              : "border-amber-600/30 bg-amber-50",
          )}
        >
          {result.passed ? (
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
          ) : (
            <XCircle className="mx-auto h-10 w-10 text-amber-700" aria-hidden="true" />
          )}
          <h2 id="trivia-resultado" className="text-xl font-bold text-navy">
            {result.passed ? "¡Aprobaste la trivia!" : "Todavía no aprobaste"}
          </h2>
          <p className="text-3xl font-extrabold text-navy">{result.score} / 100</p>
          <p className="text-sm text-muted-foreground">
            {result.correctCount} de {result.total} respuestas correctas.{" "}
            {result.passed
              ? `Necesitabas ${result.passScore} para aprobar.`
              : `Necesitás ${result.passScore} para aprobar. Podés intentarlo de nuevo.`}
          </p>
          {result.xpAwarded > 0 ? (
            <p className="text-sm font-semibold text-bordo">
              Sumaste {result.xpAwarded} XP en este intento.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="trivia-revision" className="space-y-3">
          <h2 id="trivia-revision" className="text-lg font-bold text-navy">
            Revisión de las respuestas
          </h2>
          <ol className="space-y-3">
            {result.questions.map((question, position) => {
              const chosen = question.options[question.chosenIdx];
              const correctOption = question.options[question.correctIdx];
              const isCorrect = question.chosenIdx === question.correctIdx;

              return (
                <li
                  key={question.id}
                  className="space-y-2 rounded-xl border border-border bg-white p-4"
                >
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                        aria-hidden="true"
                      />
                    )}
                    <h3 className="text-sm font-semibold">
                      {position + 1}. {question.prompt}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Tu respuesta:{" "}
                    <span className={isCorrect ? "font-medium text-emerald-800" : "font-medium text-destructive"}>
                      {chosen ?? "Sin responder"}
                    </span>
                  </p>
                  {!isCorrect ? (
                    <p className="text-sm text-muted-foreground">
                      Respuesta correcta:{" "}
                      <span className="font-medium text-emerald-800">{correctOption}</span>
                    </p>
                  ) : null}

                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed">
                    {question.explanation}
                  </p>

                  {!question.reviewed ? (
                    <p className="text-xs font-medium text-amber-800">
                      Pregunta pendiente de revisión por Enfermería.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`/tecnicas/${techniqueSlug}/jugar/trivia`}
            className={buttonVariants({ variant: result.passed ? "outline" : "default" })}
          >
            Reintentar
          </a>
          <Link
            href={`/tecnicas/${techniqueSlug}`}
            className={buttonVariants({ variant: result.passed ? "default" : "outline" })}
          >
            Volver a la técnica
          </Link>
        </div>

        <XpToast toast={toast} />
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4" data-trivia-ready={ready ? "true" : undefined} data-trivia-seed={seed}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>
          Pregunta {index + 1} de {questions.length}
        </span>
        <span>{passScore} para aprobar</span>
      </div>

      <div
        role="progressbar"
        aria-label="Avance de la trivia"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={index + 1}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-bordo transition-[width]"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <section
        aria-labelledby="trivia-pregunta"
        className="space-y-4 rounded-xl border border-border bg-white p-5"
      >
        <h2
          id="trivia-pregunta"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold leading-snug text-navy focus:outline-none"
        >
          {current.prompt}
        </h2>

        <fieldset className="space-y-2">
          <legend className="sr-only">Elegí una opción</legend>
          {current.options.map((option, optionIdx) => {
            const selected = currentAnswer === optionIdx;

            return (
              <label
                key={optionIdx}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                  selected
                    ? "border-bordo bg-bordo/5"
                    : "border-border hover:border-bordo/40 hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name={`pregunta-${current.id}`}
                  value={optionIdx}
                  checked={selected}
                  onChange={() => choose(optionIdx)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span className="leading-relaxed">{option}</span>
              </label>
            );
          })}
        </fieldset>

        {current.reviewed === false ? (
          <p className="text-xs text-muted-foreground">
            Pregunta en revisión por el equipo de Enfermería.
          </p>
        ) : null}
      </section>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Las respuestas se corrigen al terminar. Podés volver atrás antes de enviar.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0 || pending}
          >
            Anterior
          </Button>
          {index < lastIndex ? (
            <Button
              type="button"
              onClick={() => setIndex((value) => Math.min(lastIndex, value + 1))}
              disabled={currentAnswer === null || pending}
            >
              Siguiente
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={!allAnswered || pending}>
              {pending ? "Revisando…" : "Responder trivia"}
            </Button>
          )}
        </div>
      </div>

      <XpToast toast={toast} />
    </div>
  );
}
