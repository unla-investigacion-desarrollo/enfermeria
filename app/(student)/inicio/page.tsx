import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true },
      })
    : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-bordo">Inicio</p>
        <h1 className="text-2xl font-bold text-navy">
          {user ? `Hola, ${user.firstName}` : "Hola"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Muy pronto vas a encontrar acá la técnica, los juegos y tu progreso.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        Estamos preparando el contenido del manual. El inicio completo llega en la Fase 5.
      </div>
    </div>
  );
}
