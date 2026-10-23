import type { Metadata } from "next";

export const metadata: Metadata = { title: "Técnicas" };

export default function AdminTecnicasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Técnicas</h1>
      <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        El editor de técnicas se habilita en la Fase 4.
      </div>
    </div>
  );
}
