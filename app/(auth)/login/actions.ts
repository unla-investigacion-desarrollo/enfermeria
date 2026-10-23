"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getHomeForUser } from "@/lib/auth/navigation";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error: string } | null;

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email o contraseña incorrectos" };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true, mustChangePassword: true, active: true },
  });

  if (!user || !user.active) {
    return { error: "Email o contraseña incorrectos" };
  }

  redirect(getHomeForUser(user.role, user.mustChangePassword));
}
