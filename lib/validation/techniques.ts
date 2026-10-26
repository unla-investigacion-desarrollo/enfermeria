import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (!["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return /^[\w-]{6,}$/.test(id) ? id : null;
  }

  if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  }

  const match = parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,})$/);
  return match?.[1] ?? null;
}

export const youtubeUrlSchema = z
  .string()
  .trim()
  .url("Ingresá una URL válida")
  .refine((url) => youtubeVideoId(url) !== null, "Ingresá una URL de YouTube válida");

export const techniquePayloadSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(3, "El título es demasiado corto").max(160),
  slug: z
    .string()
    .trim()
    .min(3, "El slug es demasiado corto")
    .max(80)
    .regex(slugRegex, "El slug solo admite minúsculas, números y guiones"),
  summary: z.string().trim().max(240, "El resumen es demasiado largo").optional(),
  definition: z.string().trim().min(20, "La definición es demasiado corta").max(5000),
  coverImage: z.string().trim().max(500).optional(),
  objectives: z
    .array(
      z.object({
        kind: z.enum(["GENERAL", "SPECIFIC"]),
        text: z.string().trim().min(3).max(500),
      }),
    )
    .max(30),
  materials: z.array(z.string().trim().min(1).max(500)).max(50),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(3, "Un paso está vacío").max(2000),
        emphasis: z.boolean(),
      }),
    )
    .min(1, "La técnica necesita al menos un paso")
    .max(100),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1, "Falta la URL de la imagen").max(500),
        alt: z.string().trim().min(3, "La descripción de la imagen es obligatoria").max(300),
        credit: z.string().trim().min(3, "El crédito de la imagen es obligatorio").max(500),
      }),
    )
    .max(30),
  videos: z
    .array(
      z.object({
        title: z.string().trim().min(3, "El título del video es obligatorio").max(160),
        url: youtubeUrlSchema,
        institutional: z.boolean(),
      }),
    )
    .max(20),
  checklist: z.array(z.string().trim().min(1).max(500)).max(50),
  notifyStudents: z.boolean().optional(),
});

export type TechniquePayload = z.infer<typeof techniquePayloadSchema>;

export const techniqueIdSchema = z.object({ id: z.string().min(1) });
