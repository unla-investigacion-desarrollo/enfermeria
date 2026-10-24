export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-5xl animate-pulse space-y-6 px-4 py-8"
    >
      <span className="sr-only">Cargando contenido…</span>
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-bordo/15" />
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full max-w-md rounded bg-muted" />
      </div>
      <div className="h-24 rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-44 rounded-xl bg-muted" />
        <div className="h-44 rounded-xl bg-muted" />
      </div>
      <span className="sr-only">Esperá un momento.</span>
    </div>
  );
}
