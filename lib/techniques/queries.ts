import type { Prisma } from "@prisma/client";

export const techniqueContentInclude = {
  objectives: { orderBy: { order: "asc" } },
  materials: { orderBy: { order: "asc" } },
  steps: { orderBy: { order: "asc" } },
  images: { orderBy: { order: "asc" } },
  videos: { orderBy: { order: "asc" } },
  checklist: { orderBy: { order: "asc" } },
} satisfies Prisma.TechniqueInclude;
