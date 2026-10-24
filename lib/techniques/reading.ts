export type ReadingState = "unread" | "read" | "outdated";

export type LatestReading = {
  version: number;
  completedAt: Date;
};

export const READING_STATE_LABELS: Record<ReadingState, string> = {
  unread: "Sin leer",
  read: "Leída",
  outdated: "Nueva versión",
};

/** La lectura está al día si se completó la versión publicada actual. */
export function readingState(
  latestVersion: number | null | undefined,
  currentVersion: number,
): ReadingState {
  if (latestVersion == null) return "unread";
  return latestVersion >= currentVersion ? "read" : "outdated";
}
