import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { TriviaGame } from "@/components/games/trivia-game";
import {
  MIN_OPTIONS,
  buildTriviaItem,
  parseOptions,
  questionCountFromConfig,
  selectTriviaQuestions,
  type TriviaQuestionData,
} from "@/lib/games/trivia";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Trivia" };

export default async function TriviaPage({ params }: PageProps) {
  await requireUser();
  const { slug } = await params;

  const technique = await prisma.technique.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      activities: {
        where: { type: "TRIVIA" },
        take: 1,
        select: { config: true, passScore: true },
      },
      questions: {
        where: { active: true },
        select: {
          id: true,
          prompt: true,
          options: true,
          correctIdx: true,
          explanation: true,
          reviewed: true,
        },
      },
    },
  });

  const activity = technique?.activities[0];
  if (!technique || !activity) notFound();

  const bank: TriviaQuestionData[] = technique.questions
    .map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: parseOptions(question.options),
      correctIdx: question.correctIdx,
      explanation: question.explanation,
      reviewed: question.reviewed,
    }))
    .filter(
      (question) =>
        question.options.length >= MIN_OPTIONS &&
        question.correctIdx >= 0 &&
        question.correctIdx < question.options.length,
    );

  const seed = randomUUID();
  const selected = selectTriviaQuestions(
    bank,
    questionCountFromConfig(activity.config),
    seed,
  );
  const questions = selected.map((question) => buildTriviaItem(question, seed));

  return (
    <div className="space-y-5">
      <Link
        href={`/tecnicas/${technique.slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la técnica
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-bordo">Juego</p>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Trivia</h1>
        <p className="text-sm text-muted-foreground">{technique.title}</p>
      </header>

      {questions.length === 0 ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-navy">La trivia todavía no está disponible.</p>
          <p>
            El equipo docente está cargando las preguntas de esta técnica. Mientras tanto,
            podés repasar la lectura y jugar a ordenar los pasos.
          </p>
        </div>
      ) : (
        <TriviaGame
          techniqueSlug={technique.slug}
          seed={seed}
          questions={questions}
          passScore={activity.passScore}
        />
      )}
    </div>
  );
}
