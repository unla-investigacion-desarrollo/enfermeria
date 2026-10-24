import type { TechniquePayload } from "@/lib/validation/techniques";

export type EditorTechnique = TechniquePayload & {
  published: boolean;
  version: number;
};
