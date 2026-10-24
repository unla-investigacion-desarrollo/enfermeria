import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

/**
 * Cuenta de demostración para probar el recorrido del estudiante sin pasar por
 * el alta administrativa. No forma parte del seed de producción: se ejecuta
 * únicamente con `npm run db:demo` en entornos locales o de demostración.
 */
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_DEMO_EMAIL ?? "estudiante.demo@unla.edu.ar")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD ?? "Demo1234!";

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    create: {
      firstName: "Estudiante",
      lastName: "Demo",
      dni: "00999999",
      email,
      passwordHash,
      role: "STUDENT",
      mustChangePassword: false,
      active: true,
    },
    update: {
      passwordHash,
      role: "STUDENT",
      mustChangePassword: false,
      active: true,
    },
  });

  console.log(`Cuenta demo asegurada: ${email}`);
  console.log("Usala solo en entornos locales o de demostración.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
