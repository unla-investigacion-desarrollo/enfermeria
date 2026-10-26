"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/techniques/slugify";
import type { EditorTechnique } from "@/lib/techniques/editor-types";
import type { TechniquePayload } from "@/lib/validation/techniques";
import { saveTechniqueAction, toggleTechniquePublishedAction } from "./actions";
import { uploadTechniqueImageAction } from "./upload-action";

type ItemControlsProps = {
  index: number;
  length: number;
  label: string;
  onMove: (from: number, direction: -1 | 1) => void;
  onRemove: () => void;
};

function ItemControls({ index, length, label, onMove, onRemove }: ItemControlsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={index === 0}
        onClick={() => onMove(index, -1)}
        aria-label={`Subir ${label} ${index + 1}`}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={index === length - 1}
        onClick={() => onMove(index, 1)}
        aria-label={`Bajar ${label} ${index + 1}`}
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={onRemove}
        aria-label={`Eliminar ${label} ${index + 1}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function moveItem<T>(items: T[], from: number, direction: -1 | 1): T[] {
  const to = from + direction;
  if (to < 0 || to >= items.length) return items;
  const copy = [...items];
  const current = copy[from];
  const target = copy[to];
  if (current === undefined || target === undefined) return items;
  copy[from] = target;
  copy[to] = current;
  return copy;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

type ImageFieldProps = {
  image: { url: string; alt: string; credit: string };
  index: number;
  onChange: (value: { url: string; alt: string; credit: string }) => void;
  onMove: (from: number, direction: -1 | 1) => void;
  onRemove: () => void;
  length: number;
};

function ImageField({ image, index, onChange, onMove, onRemove, length }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadTechniqueImageAction(formData);
    setUploading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onChange({ ...image, url: result.url });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Imagen {index + 1}</span>
        <ItemControls
          index={index}
          length={length}
          label="imagen"
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>

      {image.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.alt || "Vista previa de la imagen"}
          className="h-32 w-full rounded-md border border-border object-cover"
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${inputId}-url`} className="text-xs">
            URL de la imagen
          </Label>
          <Input
            id={`${inputId}-url`}
            value={image.url}
            onChange={(event) => onChange({ ...image, url: event.target.value })}
            placeholder="/uploads/foto.jpg"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${inputId}-file`} className="text-xs">
            Subir archivo (JPG, PNG o WebP, máx. 5 MB)
          </Label>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              id={`${inputId}-file`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-navy-dark"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Recargar vista de la imagen"
              onClick={() => fileRef.current?.click()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          {uploading ? <p className="text-xs text-muted-foreground">Subiendo…</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${inputId}-alt`} className="text-xs">
            Texto alternativo (obligatorio)
          </Label>
          <Input
            id={`${inputId}-alt`}
            value={image.alt}
            onChange={(event) => onChange({ ...image, alt: event.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${inputId}-credit`} className="text-xs">
            Crédito (obligatorio)
          </Label>
          <Input
            id={`${inputId}-credit`}
            value={image.credit}
            onChange={(event) => onChange({ ...image, credit: event.target.value })}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

type Props = { initial: EditorTechnique };

export function TechniqueEditor({ initial }: Props) {
  const [form, setForm] = useState<EditorTechnique>(initial);
  const [saveState, setSaveState] = useState<
    { error: string } | { success: string } | null
  >(null);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // La versión y el estado de publicación vienen del servidor: los sincronizamos
  // después de guardar o publicar sin pisar lo que la persona está editando.
  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      version: initial.version,
      published: initial.published,
    }));
  }, [initial.version, initial.published]);

  function setField<K extends keyof EditorTechnique>(key: K, value: EditorTechnique[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState(null);
    startTransition(async () => {
      const payload: TechniquePayload = {
        ...(form.id ? { id: form.id } : {}),
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        definition: form.definition,
        coverImage: form.coverImage,
        objectives: form.objectives,
        materials: form.materials,
        steps: form.steps,
        images: form.images,
        videos: form.videos,
        checklist: form.checklist,
        notifyStudents,
      };
      const result = await saveTechniqueAction(payload);
      if (!result) return;
      setSaveState(result);
      if ("success" in result) {
        if (!form.id) {
          router.replace(`/admin/tecnicas/${result.id}/editar`);
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">
              {form.id ? "Editar técnica" : "Nueva técnica"}
            </h1>
            <span
              className={
                form.published
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                  : "rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
              }
            >
              {form.published ? `Publicada · v${form.version}` : `Borrador · v${form.version}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Guardar una técnica publicada incrementa su versión.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {form.id ? (
            <>
              <Link
                href={`/admin/tecnicas/${form.id}/preview`}
                className={buttonVariants({ variant: "outline" })}
              >
                Vista previa
              </Link>
              <Link
                href={`/admin/tecnicas/${form.id}/preguntas`}
                className={buttonVariants({ variant: "outline" })}
              >
                Preguntas
              </Link>
            </>
          ) : null}
          <Button type="submit" form="technique-editor-form" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      <form id="technique-editor-form" onSubmit={submit} className="space-y-4" noValidate>
        {saveState && "error" in saveState ? <Alert>{saveState.error}</Alert> : null}
        {saveState && "success" in saveState ? (
          <Alert variant="success">{saveState.success}</Alert>
        ) : null}

        {form.published ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
            <input
              id="notify-students"
              type="checkbox"
              checked={notifyStudents}
              onChange={(event) => setNotifyStudents(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            />
            <div className="space-y-0.5">
              <Label htmlFor="notify-students" className="text-sm font-semibold">
                Avisar a estudiantes al guardar
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Se notifica a quienes ya completaron la técnica o tienen un avance
                guardado. Al guardar se crea la versión {form.version + 1}.
              </p>
            </div>
          </div>
        ) : null}

      <Section title="Datos generales">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setField("slug", slugify(form.title))}
              >
                Generar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minúsculas, números y guiones. Se usa en la URL de la técnica.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Resumen</Label>
            <Input
              id="summary"
              value={form.summary ?? ""}
              onChange={(event) => setField("summary", event.target.value)}
              maxLength={240}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="definition">Definición</Label>
            <Textarea
              id="definition"
              value={form.definition}
              onChange={(event) => setField("definition", event.target.value)}
              rows={5}
              required
            />
          </div>
        </div>
      </Section>

      <Section title="Objetivos" description="Generales o específicos de la técnica.">
        <div className="space-y-3">
          {form.objectives.map((objective, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row">
              <select
                value={objective.kind}
                onChange={(event) => {
                  const kind = event.target.value as "GENERAL" | "SPECIFIC";
                  setField(
                    "objectives",
                    form.objectives.map((item, position) =>
                      position === index ? { ...item, kind } : item,
                    ),
                  );
                }}
                aria-label={`Tipo del objetivo ${index + 1}`}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="SPECIFIC">Específico</option>
                <option value="GENERAL">General</option>
              </select>
              <Input
                value={objective.text}
                onChange={(event) =>
                  setField(
                    "objectives",
                    form.objectives.map((item, position) =>
                      position === index ? { ...item, text: event.target.value } : item,
                    ),
                  )
                }
                aria-label={`Objetivo ${index + 1}`}
                className="h-9"
              />
              <ItemControls
                index={index}
                length={form.objectives.length}
                label="objetivo"
                onMove={(from, direction) =>
                  setField("objectives", moveItem(form.objectives, from, direction))
                }
                onRemove={() =>
                  setField(
                    "objectives",
                    form.objectives.filter((_, position) => position !== index),
                  )
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setField("objectives", [...form.objectives, { kind: "SPECIFIC", text: "" }])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar objetivo
          </Button>
        </div>
      </Section>

      <Section title="Materiales">
        <div className="space-y-2">
          {form.materials.map((material, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={material}
                onChange={(event) =>
                  setField(
                    "materials",
                    form.materials.map((item, position) =>
                      position === index ? event.target.value : item,
                    ),
                  )
                }
                aria-label={`Material ${index + 1}`}
                className="h-9"
              />
              <ItemControls
                index={index}
                length={form.materials.length}
                label="material"
                onMove={(from, direction) =>
                  setField("materials", moveItem(form.materials, from, direction))
                }
                onRemove={() =>
                  setField(
                    "materials",
                    form.materials.filter((_, position) => position !== index),
                  )
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setField("materials", [...form.materials, ""])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar material
          </Button>
        </div>
      </Section>

      <Section title="Técnica paso a paso" description="Los pasos marcados se muestran en negrita.">
        <div className="space-y-3">
          {form.steps.map((step, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Paso {index + 1}</span>
                <ItemControls
                  index={index}
                  length={form.steps.length}
                  label="paso"
                  onMove={(from, direction) =>
                    setField("steps", moveItem(form.steps, from, direction))
                  }
                  onRemove={() =>
                    setField(
                      "steps",
                      form.steps.filter((_, position) => position !== index),
                    )
                  }
                />
              </div>
              <Textarea
                value={step.text}
                onChange={(event) =>
                  setField(
                    "steps",
                    form.steps.map((item, position) =>
                      position === index ? { ...item, text: event.target.value } : item,
                    ),
                  )
                }
                aria-label={`Texto del paso ${index + 1}`}
                rows={2}
              />
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={step.emphasis}
                  onChange={(event) =>
                    setField(
                      "steps",
                      form.steps.map((item, position) =>
                        position === index ? { ...item, emphasis: event.target.checked } : item,
                      ),
                    )
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Mostrar en negrita
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setField("steps", [...form.steps, { text: "", emphasis: false }])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar paso
          </Button>
        </div>
      </Section>

      <Section
        title="Imágenes"
        description="El texto alternativo y el crédito son obligatorios."
      >
        <div className="space-y-4">
          {form.images.map((image, index) => (
            <ImageField
              key={index}
              image={image}
              index={index}
              length={form.images.length}
              onChange={(value) =>
                setField(
                  "images",
                  form.images.map((item, position) => (position === index ? value : item)),
                )
              }
              onMove={(from, direction) => setField("images", moveItem(form.images, from, direction))}
              onRemove={() =>
                setField(
                  "images",
                  form.images.filter((_, position) => position !== index),
                )
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField("images", [...form.images, { url: "", alt: "", credit: "" }])
            }
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Agregar imagen
          </Button>
        </div>
      </Section>

      <Section title="Videos" description="Solo se aceptan enlaces de YouTube.">
        <div className="space-y-3">
          {form.videos.map((video, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Video {index + 1}</span>
                <ItemControls
                  index={index}
                  length={form.videos.length}
                  label="video"
                  onMove={(from, direction) =>
                    setField("videos", moveItem(form.videos, from, direction))
                  }
                  onRemove={() =>
                    setField(
                      "videos",
                      form.videos.filter((_, position) => position !== index),
                    )
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={video.title}
                  onChange={(event) =>
                    setField(
                      "videos",
                      form.videos.map((item, position) =>
                        position === index ? { ...item, title: event.target.value } : item,
                      ),
                    )
                  }
                  aria-label={`Título del video ${index + 1}`}
                  placeholder="Título"
                  className="h-9"
                />
                <Input
                  value={video.url}
                  onChange={(event) =>
                    setField(
                      "videos",
                      form.videos.map((item, position) =>
                        position === index ? { ...item, url: event.target.value } : item,
                      ),
                    )
                  }
                  aria-label={`URL del video ${index + 1}`}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-9"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={video.institutional}
                  onChange={(event) =>
                    setField(
                      "videos",
                      form.videos.map((item, position) =>
                        position === index
                          ? { ...item, institutional: event.target.checked }
                          : item,
                      ),
                    )
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Es material institucional de la UNLa
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField("videos", [
                ...form.videos,
                { title: "", url: "", institutional: false },
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar video
          </Button>
        </div>
      </Section>

      <Section title="Check list">
        <div className="space-y-2">
          {form.checklist.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(event) =>
                  setField(
                    "checklist",
                    form.checklist.map((value, position) =>
                      position === index ? event.target.value : value,
                    ),
                  )
                }
                aria-label={`Ítem del check list ${index + 1}`}
                className="h-9"
              />
              <ItemControls
                index={index}
                length={form.checklist.length}
                label="ítem"
                onMove={(from, direction) =>
                  setField("checklist", moveItem(form.checklist, from, direction))
                }
                onRemove={() =>
                  setField(
                    "checklist",
                    form.checklist.filter((_, position) => position !== index),
                  )
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setField("checklist", [...form.checklist, ""])}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar ítem
          </Button>
        </div>
      </Section>

      </form>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white/95 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" form="technique-editor-form" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          {form.id ? (
            <Link
              href={`/admin/tecnicas/${form.id}/preview`}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Vista previa
            </Link>
          ) : null}
        </div>

        {form.id ? (
          <form action={toggleTechniquePublishedAction}>
            <input type="hidden" name="id" value={form.id} />
            <button
              type="submit"
              className="rounded-md border border-input px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              {form.published ? "Despublicar" : "Publicar"}
            </button>
          </form>
        ) : (
          <span className="text-xs text-muted-foreground">
            Guardá el borrador para poder publicarlo.
          </span>
        )}
      </div>
    </div>
  );
}
