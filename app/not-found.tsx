import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 focus:outline-none"
    >
      <div className="w-full max-w-md space-y-5 rounded-xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bordo/10 text-bordo">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">Error 404</p>
          <h1 className="text-2xl font-bold text-navy">No encontramos esta página</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Puede que el enlace esté mal escrito o que la técnica ya no esté publicada.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            <Home className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
          <Link href="/tecnicas" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver las técnicas
          </Link>
        </div>
      </div>
    </main>
  );
}
