import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseOptions, questionCountFromConfig } from "@/lib/games/trivia";
import { QuestionForm } from "./question-form";
import { DeleteQuestionButton } from "./delete-question-button";
import {
  toggleQuestionActiveAction,
  toggleQuestionReviewedAction,
} from "./actions";

export const metadata: Metadata = { title: "Preguntas" };

type PageProps = { params: Promise<{ id: string }> };

export default async function TechniqueQuestionsPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const technique = await prisma.technique.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      published: true,
      activities: {
        where: { type: "TRIVIA" },
        take: 1,
        select: { id: true, title: true, passScore: true, config: true },
      },
      questions: { orderBy: { id: "asc" } },
    },
  });

  if (!technique) notFound();

  const activity = technique.activities[0] ?? null;
  const requested = activity ? questionCountFromConfig(activity.config) : 10;
  const activeCount = technique.questions.filter((question) => question.active).length;
  const unreviewedActive = technique.questions.filter(
    (question) => question.active && !question.reviewed,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">Trivia</p>
          <h1 className="text-2xl font-bold text-navy">Preguntas de trivia</h1>
          <p className="text-sm text-muted-foreground">
            {technique.title} · {technique.questions.length}{" "}
            {technique.questions.length === 1 ? "pregunta" : "preguntas"} ({activeCount}{" "}
            {activeCount === 1 ? "activa" : "activas"})
          </p>
        </div>
        <Link
          href={`/admin/tecnicas/${technique.id}/editar`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Volver al editor
        </Link>
      </div>

      {!activity ? (
        <Alert>
          Esta técnica todavía no tiene una actividad de trivia. Guardá la técnica desde el
          editor para crearla.
        </Alert>
      ) : (
        <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
          Cada intento muestra <strong className="text-navy">{requested}</strong> preguntas
          activas al azar, con las opciones mezcladas. Se aprueba con{" "}
          <strong className="text-navy">{activity.passScore}%</strong>.
        </div>
      )}

      {unreviewedActive > 0 ? (
        <Alert>
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Hay {unreviewedActive}{" "}
              {unreviewedActive === 1
                ? "pregunta activa sin revisar"
                : "preguntas activas sin revisar"}{" "}
              por Enfermería. Se muestran con una advertencia hasta que las marques como
              revisadas.
            </span>
          </span>
        </Alert>
      ) : null}

      {activeCount < requested ? (
        <Alert>
          La trivia pide {requested} preguntas y hay {activeCount} activas. Se jugará con las
          disponibles hasta tanto cargues más.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nueva pregunta</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionForm techniqueId={technique.id} />
        </CardContent>
      </Card>

      <section aria-labelledby="banco-preguntas" className="space-y-3">
        <h2 id="banco-preguntas" className="text-lg font-bold text-navy">
          Banco de preguntas
        </h2>

        {technique.questions.length === 0 ? (
          <div className="space-y-2 rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            <p className="font-semibold text-navy">Todavía no hay preguntas cargadas.</p>
            <p>
              Cargá el banco del Apéndice B con el formulario de arriba o desde el seed.
              Mientras no haya preguntas activas, el juego no aparece disponible para el
              estudiantado.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {technique.questions.map((question, index) => {
              const options = parseOptions(question.options);

              return (
                <li
                  key={question.id}
                  className="space-y-3 rounded-xl border border-border bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span
                        className={
                          question.active
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
                            : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                        }
                      >
                        {question.active ? "Activa" : "Inactiva"}
                      </span>
                      <span
                        className={
                          question.reviewed
                            ? "rounded-full bg-sky-100 px-2 py-0.5 text-sky-900"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-amber-900"
                        }
                      >
                        {question.reviewed ? "Revisada" : "Pendiente de revisión"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <form action={toggleQuestionActiveAction}>
                        <input type="hidden" name="techniqueId" value={technique.id} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          {question.active ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                      <form action={toggleQuestionReviewedAction}>
                        <input type="hidden" name="techniqueId" value={technique.id} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          {question.reviewed ? "Quitar revisión" : "Marcar revisada"}
                        </button>
                      </form>
                      <DeleteQuestionButton
                        techniqueId={technique.id}
                        questionId={question.id}
                        prompt={question.prompt}
                      />
                    </div>
                  </div>

                  <p className="text-sm font-semibold">{question.prompt}</p>

                  <ol className="space-y-1 text-sm" aria-label="Opciones de la pregunta">
                    {options.map((option, optionIdx) => (
                      <li
                        key={optionIdx}
                        className={
                          optionIdx === question.correctIdx
                            ? "rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-900"
                            : "px-2 py-1 text-muted-foreground"
                        }
                      >
                        {optionIdx === question.correctIdx ? "✓ " : ""}
                        {option}
                      </li>
                    ))}
                  </ol>

                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-navy">Explicación: </span>
                    {question.explanation}
                  </p>

                  <details className="rounded-lg border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-primary">
                      Editar pregunta
                    </summary>
                    <div className="border-t border-border p-3">
                      <QuestionForm
                        techniqueId={technique.id}
                        question={{
                          id: question.id,
                          prompt: question.prompt,
                          options,
                          correctIdx: question.correctIdx,
                          explanation: question.explanation,
                          reviewed: question.reviewed,
                          active: question.active,
                        }}
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
