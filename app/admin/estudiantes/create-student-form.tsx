"use client";

import { useActionState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateProvisionalPassword } from "@/lib/auth/generate-password";
import { createStudentAction, type StudentActionState } from "./actions";

const initialState: StudentActionState = null;

export function CreateStudentForm() {
  const [state, formAction, pending] = useActionState(createStudentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const lastSubmit = useRef<Record<string, string>>({});

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }

    // React resetea los inputs al completar la acción. Si hubo error,
    // restauramos lo que la persona había cargado.
    if (state?.error && formRef.current) {
      for (const [name, value] of Object.entries(lastSubmit.current)) {
        const field = formRef.current.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = value;
      }
    }
  }, [state]);

  function rememberValues(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const values: Record<string, string> = {};
    for (const [name, value] of data.entries()) {
      if (typeof value === "string") values[name] = value;
    }
    lastSubmit.current = values;
  }

  function fillGeneratedPassword() {
    if (passwordRef.current) {
      passwordRef.current.value = generateProvisionalPassword();
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={rememberValues}
      className="space-y-4"
      noValidate
    >
      {state?.error ? <Alert>{state.error}</Alert> : null}
      {state?.success ? <Alert variant="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" name="firstName" autoComplete="off" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" name="lastName" autoComplete="off" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dni">DNI</Label>
          <Input
            id="dni"
            name="dni"
            inputMode="numeric"
            pattern="\d{7,8}"
            maxLength={8}
            autoComplete="off"
            required
            aria-describedby="dni-help"
          />
          <p id="dni-help" className="text-xs text-muted-foreground">
            Solo números, 7 u 8 dígitos. Es un dato personal: se muestra únicamente en este panel.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="off" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña provisoria</Label>
        <div className="flex gap-2">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="text"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-help"
          />
          <Button
            type="button"
            variant="outline"
            onClick={fillGeneratedPassword}
            aria-label="Generar contraseña provisoria"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Generar
          </Button>
        </div>
        <p id="password-help" className="text-xs text-muted-foreground">
          Mínimo 8 caracteres. El estudiante deberá cambiarla en el primer ingreso.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear estudiante"}
      </Button>
    </form>
  );
}
