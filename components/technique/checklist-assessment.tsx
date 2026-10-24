"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChecklistRating = "correct" | "difficult" | "not-yet";

const RATINGS: { value: ChecklistRating; label: string }[] = [
  { value: "correct", label: "Lo realizo correctamente" },
  { value: "difficult", label: "Lo realizo con dificultad" },
  { value: "not-yet", label: "No lo realiza" },
];

type Props = {
  items: { id: string; text: string }[];
};

/**
 * Autoevaluación del check list oficial. Es orientativa y no se persiste:
 * sirve para repasar la técnica antes de la práctica en simulación.
 */
export function ChecklistAssessment({ items }: Props) {
  const [ratings, setRatings] = useState<Record<string, ChecklistRating>>({});

  const answered = items.filter((item) => ratings[item.id]).length;
  const complete = answered === items.length;

  function choose(itemId: string, rating: ChecklistRating) {
    setRatings((previous) => ({ ...previous, [itemId]: rating }));
  }

  function reset() {
    setRatings({});
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
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={answered === 0}
        >
          Reiniciar
        </Button>
      </div>

      <ol className="space-y-3">
        {items.map((item, index) => (
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
                  {index + 1}
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
        ))}
      </ol>

      {complete ? (
        <p className="flex items-start gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 p-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Completaste la autoevaluación. Revisá con tu docente los ítems que marcaste
          con dificultad o que todavía no realizás.
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        La autoevaluación es orientativa y no se guarda. La lista de cotejo oficial
        sigue siendo la guía válida para la práctica.
      </p>
    </div>
  );
}
