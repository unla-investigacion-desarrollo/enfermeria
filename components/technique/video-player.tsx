"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Play } from "lucide-react";
import { XpToast } from "@/components/gamification/xp-toast";
import { registerVideoViewAction } from "@/app/(student)/tecnicas/actions";
import type { ToastPayload } from "@/lib/gamification/types";
import { toEmbedUrl } from "@/lib/videos";

type Props = {
  video: {
    id: string;
    title: string;
    url: string;
    institutional: boolean;
  };
  initialViewed: boolean;
};

export function VideoPlayer({ video, initialViewed }: Props) {
  const embedUrl = toEmbedUrl(video.url);
  const [started, setStarted] = useState(false);
  const [viewed, setViewed] = useState(initialViewed);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [pending, startTransition] = useTransition();

  if (!embedUrl) {
    return (
      <p className="text-sm text-destructive">
        La URL del video no es válida. TODO(enfermería): revisar el enlace.
      </p>
    );
  }

  function play() {
    setStarted(true);
    setError(null);
    startTransition(async () => {
      const result = await registerVideoViewAction(video.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setViewed(true);
      setXpAwarded(result.xpAwarded);
      if (result.xpAwarded > 0) {
        setToast({ id: Date.now(), amount: result.xpAwarded, badges: result.badges });
      }
    });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">{video.title}</h3>

      {started ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            src={`${embedUrl}?autoplay=1&rel=0`}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={play}
          disabled={pending}
          aria-label={`Reproducir ${video.title}`}
          className="group relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-border bg-navy text-white transition-colors hover:bg-navy-dark disabled:opacity-80"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-bordo transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-6 w-6" aria-hidden="true" fill="currentColor" />
          </span>
          <span className="text-sm font-semibold">
            {pending ? "Cargando video…" : "Reproducir video"}
          </span>
          <span className="text-xs text-white/70">Video de YouTube sin cookies de seguimiento</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {viewed ? (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Visto
          </span>
        ) : null}
        {xpAwarded > 0 ? (
          <span role="status" className="font-semibold text-bordo">
            Sumaste {xpAwarded} XP
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {!video.institutional ? (
        <p className="text-xs text-muted-foreground">
          Este video no es material institucional de la UNLa; se incluye como apoyo.
        </p>
      ) : null}

      <XpToast toast={toast} />
    </div>
  );
}
