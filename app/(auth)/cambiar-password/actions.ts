"use server";

import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getHomeForUser } from "@/lib/auth/navigation";
import { changePasswordSchema } from "@/lib/validation/auth";

export type ChangePasswordState = { error: string } | null;

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.active) {
    redirect("/login");
  }

  const currentIsValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!currentIsValid) {
    return { error: "La contraseña actual no es correcta" };
  }

  const samePassword = await verifyPassword(parsed.data.newPassword, user.passwordHash);
  if (samePassword) {
    return { error: "La nueva contraseña debe ser distinta de la actual" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    },
  });

  await unstable_update({ user: { mustChangePassword: false } });
  redirect(getHomeForUser(user.role, false));
}
