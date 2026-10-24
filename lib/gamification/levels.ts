export const LEVELS = [
  { level: 1, name: "Ingresante", minXp: 0 },
  { level: 2, name: "Practicante", minXp: 150 },
  { level: 3, name: "Asistente", minXp: 400 },
  { level: 4, name: "Avanzado/a", minXp: 800 },
  { level: 5, name: "Referente", minXp: 1500 },
] as const;

export type LevelInfo = {
  level: number;
  name: string;
  xp: number;
  currentMinXp: number;
  nextLevel: { level: number; name: string; minXp: number } | null;
  xpToNext: number;
  progressPercent: number;
};

export function getLevel(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));

  let index = 0;
  for (let position = 0; position < LEVELS.length; position += 1) {
    const candidate = LEVELS[position];
    if (candidate && xp >= candidate.minXp) index = position;
  }

  const current = LEVELS[index] ?? LEVELS[0];
  const next = LEVELS[index + 1] ?? null;
  const progressPercent = next
    ? Math.min(
        100,
        Math.max(0, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)),
      )
    : 100;

  return {
    level: current.level,
    name: current.name,
    xp,
    currentMinXp: current.minXp,
    nextLevel: next ? { level: next.level, name: next.name, minXp: next.minXp } : null,
    xpToNext: next ? Math.max(0, next.minXp - xp) : 0,
    progressPercent,
  };
}
