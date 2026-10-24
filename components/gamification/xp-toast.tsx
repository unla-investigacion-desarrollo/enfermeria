"use client";

import { useEffect, useState } from "react";
import { Award, Sparkles } from "lucide-react";
import type { ToastPayload } from "@/lib/gamification/types";

export function XpToast({ toast }: { toast: ToastPayload | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-sm animate-slide-up rounded-xl bg-navy px-4 py-3 text-white shadow-lg sm:inset-x-auto sm:right-6 sm:mx-0"
    >
      {toast.amount > 0 ? (
        <p className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
          Sumaste {toast.amount} XP
        </p>
      ) : null}
      {toast.badges.length > 0 ? (
        <ul className="mt-1 space-y-1">
          {toast.badges.map((badge) => (
            <li key={badge.code} className="flex items-center gap-2 text-xs text-white/90">
              <Award className="h-4 w-4 text-amber-300" aria-hidden="true" />
              Nueva insignia: <span className="font-semibold">{badge.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
