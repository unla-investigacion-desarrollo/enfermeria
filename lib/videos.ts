import { youtubeVideoId, youtubeUrlSchema } from "@/lib/validation/techniques";

export function toEmbedUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export { youtubeUrlSchema };
