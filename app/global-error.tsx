"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">No pudimos iniciar el manual</h1>
              <p className="text-sm leading-relaxed text-slate-600">
                Ocurrió un error inesperado. Recargá la página o volvé a intentarlo en unos
                minutos.
              </p>
              {error.digest ? (
                <p className="text-xs text-slate-500">Código de referencia: {error.digest}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#8A1E3C] px-4 text-sm font-semibold text-white hover:bg-[#6E1730] focus:outline-none focus:ring-2 focus:ring-[#8A1E3C] focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
