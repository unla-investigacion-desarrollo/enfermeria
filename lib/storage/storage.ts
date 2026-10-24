import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type StoredFile = { url: string };

export interface StorageService {
  saveImage(file: File): Promise<StoredFile>;
}

export class LocalStorageService implements StorageService {
  async saveImage(file: File): Promise<StoredFile> {
    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) {
      throw new Error("Formato no permitido. Usá JPG, PNG o WebP.");
    }
    if (file.size === 0) {
      throw new Error("El archivo está vacío.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("La imagen supera los 5 MB.");
    }

    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });

    const fileName = `${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(directory, fileName), buffer);

    return { url: `/uploads/${fileName}` };
  }
}

export const storage: StorageService = new LocalStorageService();
