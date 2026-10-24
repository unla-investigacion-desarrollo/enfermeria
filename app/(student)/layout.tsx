import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { signOutAction } from "@/lib/auth/actions";
import { StudentNav } from "@/components/student/student-nav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true },
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="bg-bordo text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/inicio" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-extrabold text-bordo">
              UNLa
            </span>
            <span className="text-sm font-semibold leading-tight">
              Manual de Técnicas de Enfermería
            </span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-xs font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Salir
            </button>
          </form>
        </div>
        <div className="bg-navy">
          <div className="mx-auto max-w-5xl px-4 py-2 text-xs font-medium tracking-wide text-white/90">
            {user ? `Hola, ${user.firstName}` : "Manual de Técnicas de Enfermería"}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-6">{children}</main>

      <footer className="border-t border-border bg-white px-4 pb-24 pt-6 text-center text-xs text-muted-foreground">
        <p className="font-semibold text-navy">Universidad Nacional de Lanús</p>
        <p className="mt-1">Licenciatura en Enfermería · Manual Digital de Técnicas</p>
      </footer>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white"
      >
        <StudentNav />
      </nav>
    </div>
  );
}
