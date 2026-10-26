import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
};

function hrefFor(
  basePath: string,
  target: number,
  searchParams: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }

  if (target > 1) params.set("page", String(target));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams = {},
  className,
}: Props) {
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, page), totalPages);
  const previousHref = hrefFor(basePath, safePage - 1, searchParams);
  const nextHref = hrefFor(basePath, safePage + 1, searchParams);

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-between gap-2", className)}
    >
      {safePage > 1 ? (
        <Link
          href={previousHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          rel="prev"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </span>
      )}

      <span className="text-xs font-semibold text-muted-foreground">
        Página {safePage} de {totalPages}
      </span>

      {safePage < totalPages ? (
        <Link
          href={nextHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          rel="next"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none opacity-50",
          )}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
