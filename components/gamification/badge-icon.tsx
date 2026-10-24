import { Award, BookOpen, ListOrdered, Repeat, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  "book-open": BookOpen,
  repeat: Repeat,
  "list-ordered": ListOrdered,
  star: Star,
  award: Award,
} as const;

export function BadgeIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? Award;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden="true" />;
}
