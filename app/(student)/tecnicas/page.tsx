import type { Metadata } from "next";

export const metadata: Metadata = { title: "Técnicas" };

export default function TecnicasPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-navy">Técnicas</h1>
      <p className="text-sm text-muted-foreground">
        El listado de técnicas se habilita en la Fase 5.
      </p>
    </div>
  );
}
