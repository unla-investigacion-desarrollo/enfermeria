"use client";

import { useActionState, useId, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateProvisionalPassword } from "@/lib/auth/generate-password";
import { resetStudentPasswordAction, type StudentActionState } from "./actions";

const initialState: StudentActionState = null;

type Props = {
  studentId: string;
  studentName: string;
};

/**
 * Usa <details> nativo para que el formulario se abra incluso antes de que
 * React hidrate la página.
 */
export function ResetPasswordForm({ studentId, studentName }: Props) {
  const [state, formAction, pending] = useActionState(resetStudentPasswordAction, initialState);
  const passwordRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  return (
    <div className="w-full">
      <details className="group w-full">
        <summary
          aria-label={`Resetear la contraseña de ${studentName}`}
          className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden"
        >
          Resetear contraseña
        </summary>

        <form
          action={formAction}
          className="mt-2 space-y-2 rounded-md border border-border p-3 text-left"
        >
          <input type="hidden" name="userId" value={studentId} />

          <Label htmlFor={`${fieldId}-password`} className="text-xs">
            Nueva provisoria para {studentName}
          </Label>

          {state?.error ? <Alert>{state.error}</Alert> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={passwordRef}
              id={`${fieldId}-password`}
              name="password"
              type="text"
              autoComplete="new-password"
              minLength={8}
              required
              className="h-9 max-w-48"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (passwordRef.current) {
                  passwordRef.current.value = generateProvisionalPassword();
                }
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Generar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </details>

      {state?.success ? (
        <div className="mt-2">
          <Alert variant="success">{state.success}</Alert>
        </div>
      ) : null}
    </div>
  );
}
