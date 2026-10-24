import Link from "next/link";
import { ArrowRight, BookOpen, RefreshCw, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  READING_STATE_LABELS,
  readingState,
  type LatestReading,
} from "@/lib/techniques/reading";

type Props = {
  technique: {
    slug: string;
    title: string;
    summary: string | null;
    version: number;
    stepCount: number;
  };
  latestReading?: LatestReading;
};

const STATUS_STYLES = {
  unread: "bg-muted text-muted-foreground",
  read: "bg-emerald-100 text-emerald-800",
  outdated: "bg-amber-100 text-amber-900",
} as const;

export function TechniqueCard({ technique, latestReading }: Props) {
  const state = readingState(latestReading?.version, technique.version);

  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[state]}`}
        >
          {state === "read" ? <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {state === "outdated" ? <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {state === "unread" ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {READING_STATE_LABELS[state]}
        </span>
        <span className="text-xs font-medium text-muted-foreground">v{technique.version}</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold leading-snug text-navy">
          <Link
            href={`/tecnicas/${technique.slug}`}
            className="underline-offset-4 hover:underline"
          >
            {technique.title}
          </Link>
        </h3>
        {technique.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{technique.summary}</p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <span className="text-xs text-muted-foreground">{technique.stepCount} pasos</span>
        <Link
          href={`/tecnicas/${technique.slug}`}
          className={buttonVariants({
            variant: state === "read" ? "outline" : "default",
            size: "sm",
          })}
        >
          {state === "read"
            ? "Volver a leer"
            : state === "outdated"
              ? "Ver nueva versión"
              : "Leer técnica"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
