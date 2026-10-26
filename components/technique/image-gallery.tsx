"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  credit: string;
};

type Props = {
  images: GalleryImage[];
};

export function ImageGallery({ images }: Props) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const safeIndex = Math.min(Math.max(0, index), images.length - 1);
  const image = images[safeIndex];
  if (!image) return null;

  return (
    <div className="space-y-3">
      <figure className="space-y-2">
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={image.url}
            alt={image.alt}
            className="max-h-[420px] w-full object-contain"
            loading="lazy"
          />
        </div>
        <figcaption className="flex flex-wrap items-start justify-between gap-2 text-xs leading-relaxed text-muted-foreground">
          <span>
            <span className="font-semibold text-navy">
              Imagen {safeIndex + 1} de {images.length}.
            </span>{" "}
            {image.alt}. {image.credit}
          </span>
        </figcaption>
      </figure>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={safeIndex === 0}
          aria-label="Imagen anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>

        <div className="flex gap-1.5" role="group" aria-label="Miniaturas de imágenes">
          {images.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`Ver imagen ${itemIndex + 1}: ${item.alt}`}
              aria-current={itemIndex === safeIndex ? "true" : undefined}
              className={
                itemIndex === safeIndex
                  ? "h-2.5 w-6 rounded-full bg-bordo"
                  : "h-2.5 w-2.5 rounded-full bg-border hover:bg-bordo/50"
              }
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((value) => Math.min(images.length - 1, value + 1))}
          disabled={safeIndex === images.length - 1}
          aria-label="Imagen siguiente"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
