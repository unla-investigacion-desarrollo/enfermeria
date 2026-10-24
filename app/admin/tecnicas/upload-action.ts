"use server";

import { requireAdmin } from "@/lib/auth/guard";
import { storage } from "@/lib/storage/storage";

export type UploadResult = { url: string } | { error: string };

export async function uploadTechniqueImageAction(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Seleccioná una imagen." };
  }

  try {
    const stored = await storage.saveImage(file);
    return stored;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo subir la imagen." };
  }
}
