"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/games/trivia";
import { saveQuestionAction, type QuestionActionState } from "./actions";

const initialState: QuestionActionState = null;

export type EditableQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  reviewed: boolean;
  active: boolean;
};

type Props = {
  techniqueId: string;
  question?: EditableQuestion;
};

export function QuestionForm({ techniqueId, question }: Props) {
  const [state, formAction, pending] = useActionState(saveQuestionAction, initialState);
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [options, setOptions] = useState<string[]>(
    question && question.options.length >= MIN_OPTIONS ? question.options : ["", ""],
  );
  const [correctIdx, setCorrectIdx] = useState(question?.correctIdx ?? 0);
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [reviewed, setReviewed] = useState(question?.reviewed ?? false);
  const [active, setActive] = useState(question?.active ?? true);

  useEffect(() => {
    if (!state?.success || question) return;
    setPrompt("");
    setOptions(["", ""]);
    setCorrectIdx(0);
    setExplanation("");
    setReviewed(false);
    setActive(true);
  }, [state, question]);

  function updateOption(index: number, value: string) {
    setOptions((previous) =>
      previous.map((option, position) => (position === index ? value : option)),
    );
  }

  function addOption() {
    setOptions((previous) =>
      previous.length >= MAX_OPTIONS ? previous : [...previous, ""],
    );
  }

  function removeOption(index: number) {
    setOptions((previous) => {
      if (previous.length <= MIN_OPTIONS) return previous;
      return previous.filter((_, position) => position !== index);
    });
    setCorrectIdx((previous) => {
      if (previous === index) return 0;
      if (previous > index) return previous - 1;
      return previous;
    });
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
      noValidate
      aria-label={question ? `Editar pregunta: ${question.prompt}` : "Nueva pregunta"}
    >
      <input type="hidden" name="techniqueId" value={techniqueId} />
      {question ? <input type="hidden" name="questionId" value={question.id} /> : null}

      {state?.error ? <Alert>{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="space-y-2">
        <Label htmlFor={`prompt-${question?.id ?? "nueva"}`}>Enunciado</Label>
        <Textarea
          id={`prompt-${question?.id ?? "nueva"}`}
          name="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
          maxLength={500}
          required
          placeholder="Escribí la pregunta tal como la va a leer el estudiante"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Opciones</legend>
        <p className="text-xs text-muted-foreground">
          Entre {MIN_OPTIONS} y {MAX_OPTIONS} opciones. Marcá cuál es la correcta.
        </p>

        <ul className="space-y-2">
          {options.map((option, index) => {
            const inputId = `opcion-${question?.id ?? "nueva"}-${index}`;

            return (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctIdx"
                  value={index}
                  checked={correctIdx === index}
                  onChange={() => setCorrectIdx(index)}
                  aria-label={`Marcar la opción ${index + 1} como correcta`}
                  className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                />
                <Label htmlFor={inputId} className="sr-only">
                  Opción {index + 1}
                </Label>
                <Input
                  id={inputId}
                  name="options"
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  maxLength={300}
                  required
                  placeholder={`Opción ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= MIN_OPTIONS}
                  aria-label={`Quitar la opción ${index + 1}`}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={options.length >= MAX_OPTIONS}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar opción
        </Button>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`explanation-${question?.id ?? "nueva"}`}>
          Explicación de la respuesta
        </Label>
        <Textarea
          id={`explanation-${question?.id ?? "nueva"}`}
          name="explanation"
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={3}
          maxLength={2000}
          required
          placeholder="Por qué la opción marcada es la correcta"
        />
        <p className="text-xs text-muted-foreground">
          Se muestra recién al terminar la trivia, junto con la corrección.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="reviewed"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium">Revisada por Enfermería</span>
            <span className="block text-xs text-muted-foreground">
              Mientras no esté revisada, la pregunta se muestra con una advertencia.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium">Activa</span>
            <span className="block text-xs text-muted-foreground">
              Solo las preguntas activas entran en la trivia.
            </span>
          </span>
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Guardando…"
          : question
            ? "Guardar cambios"
            : "Agregar pregunta"}
      </Button>
    </form>
  );
}
