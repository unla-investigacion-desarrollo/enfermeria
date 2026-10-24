"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { XpToast } from "@/components/gamification/xp-toast";
import { submitOrderStepsAction } from "@/app/(student)/tecnicas/actions";
import type { ToastPayload } from "@/lib/gamification/types";
import { cn } from "@/lib/utils";

export type GameStep = { id: string; text: string };

type Props = {
  techniqueSlug: string;
  blockStart: number;
  steps: GameStep[];
  passScore: number;
};

type Result = Extract<
  Awaited<ReturnType<typeof submitOrderStepsAction>>,
  { score: number }
>;

function SortableStep({
  step,
  index,
  total,
  disabled,
  onMove,
}: {
  step: GameStep;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (from: number, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id, disabled });

  return (
    <li
      ref={setNodeRef}
      data-step-id={step.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-white p-3 shadow-sm",
        isDragging && "relative z-10 opacity-90 shadow-lg",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-navy active:cursor-grabbing"
        aria-label={`Arrastrar paso ${index + 1}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bordo/10 text-xs font-bold text-bordo">
        {index + 1}
      </span>

      <p className="flex-1 text-sm leading-relaxed">{step.text}</p>

      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled || index === 0}
          onClick={() => onMove(index, -1)}
          aria-label={`Subir paso ${index + 1}`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disabled || index === total - 1}
          onClick={() => onMove(index, 1)}
          aria-label={`Bajar paso ${index + 1}`}
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export function OrderStepsGame({ techniqueSlug, blockStart, steps, passScore }: Props) {
  const [items, setItems] = useState<GameStep[]>(steps);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setReady(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= items.length) return;
    setItems((previous) => arrayMove(previous, from, to));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((previous) => {
      const oldIndex = previous.findIndex((step) => step.id === active.id);
      const newIndex = previous.findIndex((step) => step.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return previous;
      return arrayMove(previous, oldIndex, newIndex);
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const response = await submitOrderStepsAction({
        techniqueSlug,
        blockStart,
        orderedIds: items.map((step) => step.id),
      });

      if ("error" in response) {
        setError(response.error);
        return;
      }

      setResult(response);
      if (response.xpAwarded > 0 || response.badges.length > 0) {
        setToast({ id: Date.now(), amount: response.xpAwarded, badges: response.badges });
      }
    });
  }

  if (result) {
    const stepsById = new Map(steps.map((step) => [step.id, step.text]));

    return (
      <div className="space-y-5">
        <section
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
          <h2 className="text-xl font-bold text-navy">
            {result.passed ? "¡Aprobaste!" : "Todavía no aprobaste"}
          </h2>
          <p className="text-3xl font-extrabold text-navy">{result.score} / 100</p>
          <p className="text-sm text-muted-foreground">
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

        <section aria-labelledby="orden-correcto" className="space-y-2">
          <h2 id="orden-correcto" className="text-lg font-bold text-navy">
            Orden correcto
          </h2>
          <ol className="space-y-2 rounded-xl border border-border bg-white p-4">
            {result.correctIds.map((id, index) => (
              <li key={id} className="flex gap-3 text-sm">
                <span className="font-bold text-bordo">{index + 1}.</span>
                <span>{stepsById.get(id)}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`/tecnicas/${techniqueSlug}/jugar/ordenar`}
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

  return (
    <div className="space-y-4" data-game-ready={ready ? "true" : undefined}>
      <p className="rounded-lg border border-navy/20 bg-navy/5 px-4 py-3 text-sm text-navy">
        Arrastrá las tarjetas o usá las flechas ↑ ↓ para ordenar. Al terminar, comprobá tu
        orden.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((step) => step.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol aria-label="Pasos para ordenar" className="space-y-2">
            {items.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                index={index}
                total={items.length}
                disabled={pending}
                onMove={move}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Aprobás con {passScore} de 100. Podés reintentar las veces que quieras.
        </p>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Revisando…" : "Comprobar orden"}
        </Button>
      </div>
    </div>
  );
}
