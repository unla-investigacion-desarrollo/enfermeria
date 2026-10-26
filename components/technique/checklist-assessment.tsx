"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChecklistRating = "correct" | "difficult" | "not-yet";

const RATINGS: { value: ChecklistRating; label: string }[] = [
  { value: "correct", label: "Lo realizo correctamente" },
  { value: "difficult", label: "Lo realizo con dificultad" },
  { value: "not-yet", label: "No lo realiza" },
];

const PAGE_SIZE = 5;

type Props = {
  items: { id: string; text: string }[];
};

/**
 * Autoevaluación del check list oficial. Es orientativa y no se persiste:
 * sirve para repasar la técnica antes de la práctica en simulación.
 */
export function ChecklistAssessment({ items }: Props) {
  const [ratings, setRatings] = useState<Record<string, ChecklistRating>>({});
  const [page, setPage] = useState(0);
  const [onlyWeak, setOnlyWeak] = useState(false);

  const answered = items.filter((item) => ratings[item.id]).length;
  const complete = answered === items.length;

  const weakItems = items.filter((item) => {
    const rating = ratings[item.id];
    return rating === "difficult" || rating === "not-yet";
  });

  const visibleItems = onlyWeak ? weakItems : items;
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const pageItems = visibleItems.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const correctCount = items.filter((item) => ratings[item.id] === "correct").length;
  const difficultCount = items.filter((item) => ratings[item.id] === "difficult").length;
  const notYetCount = items.filter((item) => ratings[item.id] === "not-yet").length;

  function choose(itemId: string, rating: ChecklistRating) {
    setRatings((previous) => ({ ...previous, [itemId]: rating }));
  }

  function reset() {
    setRatings({});
    setPage(0);
    setOnlyWeak(false);
  }

  function toggleWeak() {
    setOnlyWeak((value) => !value);
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-medium text-muted-foreground"
        >
          {answered} de {items.length} ítems evaluados
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={onlyWeak ? "secondary" : "outline"}
            size="sm"
            onClick={toggleWeak}
            disabled={weakItems.length === 0 && !onlyWeak}
            aria-pressed={onlyWeak}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            {onlyWeak ? "Ver todos los ítems" : `Ver solo para repasar (${weakItems.length})`}
          </Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={answered === 0}>
            Reiniciar
          </Button>
        </div>
      </div>

      {onlyWeak && weakItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
          No marcaste ítems con dificultad ni pendientes. Buen trabajo.
        </p>
      ) : (
        <>
          <ol className="space-y-3">
            {pageItems.map((item) => {
              const position = items.findIndex((candidate) => candidate.id === item.id);
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-white p-4 shadow-sm"
                >
                  <fieldset>
                    <legend className="flex gap-3 text-[15px] font-medium leading-relaxed">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bordo/10 text-xs font-bold text-bordo"
                        aria-hidden="true"
                      >
                        {position + 1}
                      </span>
                      <span>{item.text}</span>
                    </legend>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {RATINGS.map((rating) => {
                        const checked = ratings[item.id] === rating.value;
                        return (
                          <label
                            key={rating.value}
                            className={cn(
                              "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                              checked
                                ? "border-bordo bg-bordo/5 text-bordo"
                                : "border-border bg-white text-muted-foreground hover:bg-muted",
                            )}
                          >
                            <input
                              type="radio"
                              name={`checklist-${item.id}`}
                              value={rating.value}
                              checked={checked}
                              onChange={() => choose(item.id, rating.value)}
                              className="h-4 w-4 shrink-0 accent-bordo"
                            />
                            {rating.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>

          {totalPages > 1 ? (
            <nav
              aria-label="Paginación del check list"
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
        </>
      )}

      {complete ? (
        <div className="space-y-3 rounded-lg border border-emerald-600/30 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="flex items-start gap-2 font-semibold">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Completaste la autoevaluación.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-white/70 p-2">
              <p className="text-lg font-extrabold">{correctCount}</p>
              <p>Correctos</p>
            </div>
            <div className="rounded-md bg-white/70 p-2">
              <p className="text-lg font-extrabold">{difficultCount}</p>
              <p>Con dificultad</p>
            </div>
            <div className="rounded-md bg-white/70 p-2">
              <p className="text-lg font-extrabold">{notYetCount}</p>
              <p>Pendientes</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed">
            Revisá con tu docente los ítems que marcaste con dificultad o que todavía no
            realizás. La lista de cotejo oficial sigue siendo la guía válida para la práctica.
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        La autoevaluación es orientativa y no se guarda.
      </p>
    </div>
  );
}
