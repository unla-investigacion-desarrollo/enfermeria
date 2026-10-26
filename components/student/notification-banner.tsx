import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  notification: {
    id: string;
    title: string;
    body: string;
    href: string;
  };
};

export function NotificationBanner({ notification }: Props) {
  return (
    <section
      aria-labelledby={`aviso-${notification.id}`}
      className="flex flex-col gap-3 rounded-xl border border-amber-600/30 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-900">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Actualización del manual
          </p>
          <h2 id={`aviso-${notification.id}`} className="text-sm font-bold text-navy">
            {notification.title}
          </h2>
          <p className="text-xs leading-relaxed text-amber-950/80">{notification.body}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
        <Link href={notification.href} className={buttonVariants({ size: "sm" })}>
          Releer ahora
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/notificaciones"
          className="inline-flex min-h-9 items-center justify-center px-2 text-xs font-semibold text-amber-900 underline-offset-4 hover:underline"
        >
          Ver todas
        </Link>
      </div>
    </section>
  );
}
