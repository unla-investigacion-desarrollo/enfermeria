import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { OrderStepsGame } from "@/components/games/order-steps-game";
import { blockSizeFromConfig, buildOrderStepsBlock } from "@/lib/games/order-steps";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Ordená los pasos" };

export default async function OrderStepsPage({ params }: PageProps) {
  await requireUser();
  const { slug } = await params;

  const technique = await prisma.technique.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      steps: { orderBy: { order: "asc" }, select: { id: true, text: true } },
      activities: {
        where: { type: "ORDER_STEPS" },
        take: 1,
        select: { config: true, passScore: true },
      },
    },
  });

  const activity = technique?.activities[0];
  if (!technique || !activity || technique.steps.length < 2) notFound();

  const block = buildOrderStepsBlock(
    technique.steps,
    blockSizeFromConfig(activity.config),
  );
  const textById = new Map(technique.steps.map((step) => [step.id, step.text]));
  const gameSteps = block.shuffledIds.map((id) => ({
    id,
    text: textById.get(id) ?? "",
  }));

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
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Ordená los pasos</h1>
        <p className="text-sm text-muted-foreground">{technique.title}</p>
      </header>

      <OrderStepsGame
        techniqueSlug={technique.slug}
        blockStart={block.blockStart}
        steps={gameSteps}
        passScore={activity.passScore}
      />
    </div>
  );
}
