import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { buttonVariants } from "@/components/ui/button";
import type { EditorTechnique } from "@/lib/techniques/editor-types";
import { TechniqueEditor } from "../technique-editor";

export const metadata: Metadata = { title: "Nueva técnica" };

const emptyTechnique: EditorTechnique = {
  published: false,
  version: 1,
  title: "",
  slug: "",
  summary: "",
  definition: "",
  coverImage: "",
  objectives: [],
  materials: [],
  steps: [{ text: "", emphasis: false }],
  images: [],
  videos: [],
  checklist: [],
};

export default async function NewTechniquePage() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/tecnicas"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Volver al listado
      </Link>
      <TechniqueEditor initial={emptyTechnique} />
    </div>
  );
}
