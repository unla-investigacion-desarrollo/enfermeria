import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Link2,
  Syringe,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PhaseIcon, PhaseTone } from "@/lib/techniques/reading-plan";

const ICONS: Record<PhaseIcon, LucideIcon> = {
  clipboard: ClipboardList,
  users: Users,
  syringe: Syringe,
  link: Link2,
  check: ClipboardCheck,
};

const TONES: Record<
  PhaseTone,
  {
    soft: string;
    solid: string;
    text: string;
    border: string;
    dot: string;
    progress: string;
  }
> = {
  navy: {
    soft: "bg-navy/10 text-navy",
    solid: "bg-navy text-white",
    text: "text-navy",
    border: "border-navy/25",
    dot: "bg-navy",
    progress: "bg-navy",
  },
  sky: {
    soft: "bg-sky-100 text-sky-900",
    solid: "bg-sky-700 text-white",
    text: "text-sky-800",
    border: "border-sky-600/30",
    dot: "bg-sky-700",
    progress: "bg-sky-700",
  },
  bordo: {
    soft: "bg-bordo/10 text-bordo",
    solid: "bg-bordo text-white",
    text: "text-bordo",
    border: "border-bordo/30",
    dot: "bg-bordo",
    progress: "bg-bordo",
  },
  amber: {
    soft: "bg-amber-100 text-amber-900",
    solid: "bg-amber-600 text-white",
    text: "text-amber-900",
    border: "border-amber-600/30",
    dot: "bg-amber-600",
    progress: "bg-amber-600",
  },
  emerald: {
    soft: "bg-emerald-100 text-emerald-900",
    solid: "bg-emerald-700 text-white",
    text: "text-emerald-900",
    border: "border-emerald-600/30",
    dot: "bg-emerald-700",
    progress: "bg-emerald-700",
  },
};

export function phaseTone(tone: PhaseTone) {
  return TONES[tone];
}

export function PhaseGlyph({
  icon,
  className,
}: {
  icon: PhaseIcon;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? CheckCircle2;
  return <Icon className={className} aria-hidden="true" />;
}
