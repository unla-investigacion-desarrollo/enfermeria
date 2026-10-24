"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteQuestionAction } from "./actions";

type Props = {
  techniqueId: string;
  questionId: string;
  prompt: string;
};

export function DeleteQuestionButton({ techniqueId, questionId, prompt }: Props) {
  return (
    <form
      action={deleteQuestionAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `¿Eliminar definitivamente la pregunta “${prompt}”? Esta acción no se puede deshacer.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="techniqueId" value={techniqueId} />
      <input type="hidden" name="questionId" value={questionId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Eliminar
      </Button>
    </form>
  );
}
