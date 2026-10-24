import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { seedBadges, seedTechnique } from "./seed-technique";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

async function main() {
  const email = requireEnv("SEED_ADMIN_EMAIL").trim().toLowerCase();
  const password = requireEnv("SEED_ADMIN_PASSWORD");

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    create: {
      firstName: "Administración",
      lastName: "UNLa",
      dni: "00000000",
      email,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
      active: true,
    },
    update: {
      role: "ADMIN",
      active: true,
    },
  });

  await seedBadges(prisma);
  await seedTechnique(prisma);

  console.log(`Admin asegurado: ${email}`);
  console.log("Técnica de vía periférica cargada.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
