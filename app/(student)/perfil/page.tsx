import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { BadgeIcon } from "@/components/gamification/badge-icon";
import { getLevel } from "@/lib/gamification/levels";

export const metadata: Metadata = { title: "Perfil" };

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function PerfilPage() {
  const sessionUser = await requireUser();

  const [profile, xpTotal] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        readings: { select: { techniqueId: true } },
        badges: {
          select: {
            earnedAt: true,
            badge: { select: { code: true, name: true, description: true, icon: true } },
          },
          orderBy: { earnedAt: "desc" },
        },
        xpEvents: {
          select: { id: true, amount: true, reason: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
    prisma.xpEvent.aggregate({
      where: { userId: sessionUser.id },
      _sum: { amount: true },
    }),
  ]);

  if (!profile) notFound();

  const totalXp = xpTotal._sum.amount ?? 0;
  const level = getLevel(totalXp);
  const techniquesRead = new Set(profile.readings.map((reading) => reading.techniqueId)).size;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-bordo">Mi cuenta</p>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.firstName} {profile.lastName} · {profile.email}
        </p>
      </div>

      <section
        aria-labelledby="nivel"
        className="space-y-4 rounded-xl bg-gradient-to-br from-bordo to-bordo-dark p-5 text-white sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/85">
              Nivel {level.level}
            </p>
            <h2 id="nivel" className="text-2xl font-bold">
              {level.name}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold">{totalXp} XP</p>
            <p className="text-xs text-white/85">XP total</p>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Avance al próximo nivel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level.progressPercent}
          className="h-2.5 overflow-hidden rounded-full bg-white/20"
        >
          <div
            className="h-full rounded-full bg-amber-300 transition-[width]"
            style={{ width: `${level.progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-white/85">
          {level.nextLevel
            ? `Te faltan ${level.xpToNext} XP para el nivel ${level.nextLevel.level} (${level.nextLevel.name}).`
            : "Alcanzaste el nivel máximo del manual."}
        </p>
      </section>

      <section aria-label="Resumen de actividad" className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-navy">{techniquesRead}</p>
          <p className="text-xs text-muted-foreground">Técnicas leídas</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-navy">{profile.readings.length}</p>
          <p className="text-xs text-muted-foreground">Lecturas</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <p className="text-2xl font-extrabold text-navy">{profile.badges.length}</p>
          <p className="text-xs text-muted-foreground">Insignias</p>
        </div>
      </section>

      <section aria-labelledby="insignias" className="space-y-3">
        <h2 id="insignias" className="text-lg font-bold text-navy">
          Insignias
        </h2>
        {profile.badges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            Todavía no ganaste insignias. Terminá una lectura para empezar.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {profile.badges.map(({ badge, earnedAt }) => (
              <li
                key={badge.code}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                  <BadgeIcon icon={badge.icon} />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-navy">{badge.name}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {badge.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Obtenida el {dateFormatter.format(earnedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial" className="space-y-3">
        <h2 id="historial" className="text-lg font-bold text-navy">
          Historial de XP
        </h2>
        {profile.xpEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            Todavía no sumaste XP. Las lecturas y los videos suman puntos.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {profile.xpEvents.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{event.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateFormatter.format(event.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-bordo">+{event.amount} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
