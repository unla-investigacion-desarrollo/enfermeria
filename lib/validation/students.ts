import { z } from "zod";
import { emailSchema } from "@/lib/validation/auth";

export const dniSchema = z
  .string()
  .trim()
  .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos");

const passwordSchema = z
  .string()
  .min(8, "La contraseña provisoria debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

const personNameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `Ingresá ${label}`)
    .max(60, `${label} es demasiado largo`);

export const createStudentSchema = z.object({
  firstName: personNameSchema("el nombre"),
  lastName: personNameSchema("el apellido"),
  dni: dniSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const resetStudentPasswordSchema = z.object({
  userId: z.string().min(1, "Falta el estudiante"),
  password: passwordSchema,
});

export const studentIdSchema = z.object({
  userId: z.string().min(1, "Falta el estudiante"),
});

export const studentSearchSchema = z
  .string()
  .trim()
  .max(60, "La búsqueda es demasiado larga")
  .optional();
