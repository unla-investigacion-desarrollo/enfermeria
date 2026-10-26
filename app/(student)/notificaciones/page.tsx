import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellRing, CheckCheck, RefreshCw } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions";

export const metadata: Metadata = { title: "Notificaciones" };

const PAGE_SIZE = 10;
const pageSchema = z.coerce.number().int().min(1).max(999).catch(1);

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

type PageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function NotificacionesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = pageSchema.parse(rawPage);

  const [total, unread] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bordo">
            Tu actividad
          </p>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Notificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0
              ? `Tenés ${unread} ${unread === 1 ? "aviso sin leer" : "avisos sin leer"}.`
              : "Estás al día: no tenés avisos pendientes."}
          </p>
        </div>

        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Marcar todas como leídas
            </button>
          </form>
        ) : null}
      </div>

      {total === 0 ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="font-semibold text-navy">Todavía no tenés notificaciones.</p>
          <p>
            Cuando una técnica que leíste o estás leyendo se actualice, te avisamos acá.
          </p>
          <Link
            href="/inicio"
            className="inline-block pt-1 font-semibold text-primary underline-offset-4 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {notifications.map((notification) => {
              const unreadItem = notification.readAt === null;

              return (
                <li
                  key={notification.id}
                  className={cn(
                    "space-y-3 rounded-xl border bg-white p-4 sm:p-5",
                    unreadItem ? "border-bordo/35 shadow-sm" : "border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        unreadItem
                          ? "bg-bordo/10 text-bordo"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {unreadItem ? (
                        <BellRing className="h-4 w-4" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-navy">{notification.title}</h2>
                        {unreadItem ? (
                          <span className="rounded-full bg-bordo px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Sin leer
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {dateFormatter.format(notification.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <Link
                      href={notification.href}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Volver a leer la técnica
                    </Link>

                    {unreadItem ? (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="id" value={notification.id} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
                        >
                          Marcar como leída
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        Leída
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/notificaciones"
          />
        </>
      )}
    </div>
  );
}
