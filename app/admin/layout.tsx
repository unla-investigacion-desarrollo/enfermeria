import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/auth/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="bg-bordo text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin/estudiantes" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-extrabold text-bordo">
              UNLa
            </span>
            <span className="text-sm font-semibold leading-tight">
              Administración · Manual de Enfermería
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-white/80 sm:inline">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
        <div className="bg-navy">
          <nav className="mx-auto flex max-w-6xl gap-6 px-4 py-2 text-xs font-medium">
            <Link href="/admin/estudiantes" className="text-white/90 hover:text-white">
              Estudiantes
            </Link>
            <Link href="/admin/tecnicas" className="text-white/90 hover:text-white">
              Técnicas
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
