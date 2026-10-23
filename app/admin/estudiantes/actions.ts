"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import {
  createStudentSchema,
  resetStudentPasswordSchema,
  studentIdSchema,
} from "@/lib/validation/students";

export type StudentActionState = { error?: string; success?: string } | null;

function mapUniqueError(error: Prisma.PrismaClientKnownRequestError): string {
  const target = Array.isArray(error.meta?.target)
    ? (error.meta.target as string[]).join(",")
    : String(error.meta?.target ?? "");

  if (target.includes("email")) return "Ya existe un usuario con ese email.";
  if (target.includes("dni")) return "Ya existe un usuario con ese DNI.";
  return "Ya existe un usuario con esos datos.";
}

export async function createStudentAction(
  _previousState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  await requireAdmin();

  const parsed = createStudentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dni: formData.get("dni"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  try {
    await prisma.user.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        dni: parsed.data.dni,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "STUDENT",
        mustChangePassword: true,
        active: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: mapUniqueError(error) };
    }
    throw error;
  }

  revalidatePath("/admin/estudiantes");
  return { success: `Estudiante creado: ${parsed.data.firstName} ${parsed.data.lastName}.` };
}

export async function toggleStudentActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = studentIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return;

  const student = await prisma.user.findFirst({
    where: { id: parsed.data.userId, role: "STUDENT" },
    select: { id: true, active: true },
  });
  if (!student) return;

  await prisma.user.update({
    where: { id: student.id },
    data: { active: !student.active },
  });

  revalidatePath("/admin/estudiantes");
}

export async function resetStudentPasswordAction(
  _previousState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  await requireAdmin();

  const parsed = resetStudentPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá la contraseña." };
  }

  const student = await prisma.user.findFirst({
    where: { id: parsed.data.userId, role: "STUDENT" },
    select: { id: true },
  });
  if (!student) {
    return { error: "No se encontró el estudiante." };
  }

  await prisma.user.update({
    where: { id: student.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      mustChangePassword: true,
    },
  });

  revalidatePath("/admin/estudiantes");
  return {
    success:
      "Contraseña restablecida. El estudiante deberá cambiarla en el próximo ingreso. Comunicásela por un canal seguro.",
  };
}
