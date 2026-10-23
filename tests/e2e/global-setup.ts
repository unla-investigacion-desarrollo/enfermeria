import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_PASSWORD_COST = 4;

async function upsertTestUser(input: {
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  password: string;
  role: "ADMIN" | "STUDENT";
  mustChangePassword: boolean;
  active?: boolean;
}) {
  const passwordHash = await bcrypt.hash(input.password, TEST_PASSWORD_COST);

  await prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      dni: input.dni,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      role: input.role,
      mustChangePassword: input.mustChangePassword,
      active: input.active ?? true,
    },
    update: {
      passwordHash,
      role: input.role,
      mustChangePassword: input.mustChangePassword,
      active: input.active ?? true,
    },
  });
}

export default async function globalSetup() {
  await upsertTestUser({
    email: "admin.e2e@unla.edu.ar",
    dni: "11111111",
    firstName: "Ada",
    lastName: "Administradora",
    password: "Admin1234!",
    role: "ADMIN",
    mustChangePassword: true,
  });

  await upsertTestUser({
    email: "alumno.e2e@unla.edu.ar",
    dni: "22222222",
    firstName: "Ana",
    lastName: "Alumna",
    password: "Alumno1234!",
    role: "STUDENT",
    mustChangePassword: false,
  });

  await upsertTestUser({
    email: "inactivo.e2e@unla.edu.ar",
    dni: "33333333",
    firstName: "Iván",
    lastName: "Inactivo",
    password: "Alumno1234!",
    role: "STUDENT",
    mustChangePassword: false,
    active: false,
  });

  await prisma.$disconnect();
}
