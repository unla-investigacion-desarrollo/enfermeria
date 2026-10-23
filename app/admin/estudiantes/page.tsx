import type { Metadata } from "next";

export const metadata: Metadata = { title: "Estudiantes" };

export default function AdminEstudiantesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Estudiantes</h1>
      <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        La gestión de estudiantes se habilita en la Fase 3.
      </div>
    </div>
  );
}
