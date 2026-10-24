"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { completeReadingAction } from "@/app/(student)/tecnicas/actions";

type Props = {
  techniqueId: string;
  currentVersion: number;
  readCurrentVersion: boolean;
  lastCompletedLabel: string | null;
};

type Message = { variant: "success" | "error"; text: string };

export function ReadingCompletion({
  techniqueId,
  currentVersion,
  readCurrentVersion,
  lastCompletedLabel,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [read, setRead] = useState(readCurrentVersion);
  const [message, setMessage] = useState<Message | null>(null);

  function complete() {
    startTransition(async () => {
      const result = await completeReadingAction(techniqueId);
      if ("error" in result) {
        setMessage({ variant: "error", text: result.error });
        return;
      }

      setRead(true);
      setMessage({ variant: "success", text: result.success });
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="terminar-lectura"
      className="space-y-3 rounded-xl border border-border bg-white p-5 sm:p-6"
    >
      <div className="space-y-1">
        <h2 id="terminar-lectura" className="text-lg font-bold text-navy">
          ¿Terminaste la lectura?
        </h2>
        {read ? (
          <p className="text-sm text-muted-foreground">
            Ya registraste la lectura de la versión {currentVersion}. Podés releer y volver a
            registrarla cuando quieras.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Marcá la lectura al terminar. La primera vez suma XP y las relecturas quedan
            registradas en tu historial.
          </p>
        )}
        {lastCompletedLabel ? (
          <p className="text-xs text-muted-foreground">
            Última lectura registrada: {lastCompletedLabel}.
          </p>
        ) : null}
      </div>

      <Button onClick={complete} disabled={pending} className="w-full sm:w-auto">
        <BookCheck className="h-4 w-4" aria-hidden="true" />
        {pending ? "Registrando…" : read ? "Registrar relectura" : "Terminé la lectura"}
      </Button>

      {message ? <Alert variant={message.variant}>{message.text}</Alert> : null}
    </section>
  );
}
