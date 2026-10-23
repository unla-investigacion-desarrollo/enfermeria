import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="bg-bordo px-4 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/login" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-extrabold text-bordo">
              UNLa
            </span>
            <span className="text-sm font-semibold leading-tight sm:text-base">
              Manual de Técnicas
              <br />
              de Enfermería
            </span>
          </Link>
          <span className="hidden text-right text-xs text-white/80 sm:block">
            Departamento de Salud Comunitaria
            <br />
            Licenciatura en Enfermería
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>

      <footer className="border-t border-border bg-white px-4 py-4 text-center text-xs text-muted-foreground">
        Licenciatura en Enfermería | Departamento de Salud Comunitaria – UNLa
      </footer>
    </div>
  );
}
