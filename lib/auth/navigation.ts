import type { Role } from "@prisma/client";

export function getHomeForUser(role: Role, mustChangePassword: boolean): string {
  if (mustChangePassword) return "/cambiar-password";
  return role === "ADMIN" ? "/admin/estudiantes" : "/inicio";
}
