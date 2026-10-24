"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: Props) {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 focus:outline-none"
    >
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
            Algo salió mal
          </p>
          <h1 className="text-2xl font-bold text-navy">No pudimos cargar esta página</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Probá de nuevo en unos segundos. Si el problema continúa, avisá al equipo
            administrativo del manual.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">Código de referencia: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} size="sm">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
