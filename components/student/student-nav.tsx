"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/tecnicas", label: "Técnicas", icon: BookOpen },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function StudentNav() {
  const pathname = usePathname();

  return (
    <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex flex-col items-center gap-1 px-2 py-2 text-xs font-semibold text-bordo"
                  : "flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-navy"
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
