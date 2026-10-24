export const MASTER_BADGE_PREFIX = "MASTER_";

export function masterBadgeCode(slug: string): string {
  return `${MASTER_BADGE_PREFIX}${slug}`;
}

export function masterBadgeData(title: string) {
  return {
    name: `Dominaste: ${title}`,
    description: "Completaste la lectura y aprobaste los dos juegos de la técnica.",
    icon: "award",
  };
}
