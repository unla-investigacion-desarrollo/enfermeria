"use client";

import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Crosshair, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  text: string;
  emphasis: boolean;
};

type Props = {
  steps: Step[];
  currentStep: number;
  onJump: (stepIndex: number) => void;
};

const PAGE_SIZE = 5;

/**
 * Repaso rápido de todos los pasos, paginado y filtrable por puntos críticos.
 * Permite saltar directo a un paso sin recorrer la lista completa.
 */
export function StepQuickReview({ steps, currentStep, onJump }: Props) {
  const [page, setPage] = useState(0);
  const [onlyCritical, setOnlyCritical] = useState(false);

  const criticalSteps = steps.filter((step) => step.emphasis);
  const visible = onlyCritical ? criticalSteps : steps;
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const pageItems = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleCritical() {
    setOnlyCritical((value) => !value);
    setPage(0);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {visible.length} de {steps.length}{" "}
          {steps.length === 1 ? "paso" : "pasos"}
          {onlyCritical ? " · solo puntos críticos" : ""}
        </p>
        <Button
          variant={onlyCritical ? "secondary" : "outline"}
          size="sm"
          onClick={toggleCritical}
          aria-pressed={onlyCritical}
          disabled={criticalSteps.length === 0 && !onlyCritical}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          {onlyCritical ? "Ver todos" : `Solo críticos (${criticalSteps.length})`}
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-white p-4 text-center text-sm text-muted-foreground">
          No hay puntos críticos marcados en esta técnica.
        </p>
      ) : (
        <ol className="space-y-2">
          {pageItems.map((step) => {
            const stepIndex = steps.findIndex((item) => item.id === step.id);
            const active = stepIndex === currentStep;

            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-white p-3 text-sm",
                  active ? "border-bordo/40 bg-bordo/[0.03]" : "border-border",
                )}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bordo/10 text-xs font-bold text-bordo">
                  {stepIndex + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={step.emphasis ? "font-semibold" : undefined}>{step.text}</p>
                  {step.emphasis ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      Punto crítico
                    </span>
                  ) : null}
                </div>
                <Button
                  variant={active ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => onJump(stepIndex)}
                  disabled={active}
                  aria-label={`Ir al paso ${stepIndex + 1}`}
                  className="shrink-0"
                >
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                  {active ? "Acá" : "Ir"}
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Paginación del repaso de pasos"
          className="flex items-center justify-between gap-2 border-t border-border pt-3"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 0}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">
            Página {safePage + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= totalPages - 1}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
