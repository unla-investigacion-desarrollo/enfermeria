/** Normaliza mayúsculas y acentos para que "via" encuentre "vía". */
export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Búsqueda simple del MVP: todas las palabras deben aparecer en el texto. */
export function matchesQuery(text: string, query: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const normalizedText = normalizeSearch(text);
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => normalizedText.includes(word));
}
