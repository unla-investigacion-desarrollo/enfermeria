import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true },
      })
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Mi perfil</h1>
      {user ? (
        <div className="rounded-xl border border-border bg-white p-6">
          <p className="font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            El perfil gamificado (XP, nivel e insignias) se habilita en la Fase 6.
          </p>
        </div>
      ) : null}
    </div>
  );
}
