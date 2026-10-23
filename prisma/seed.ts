import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // El seed de contenido (técnica de vía periférica) y del admin se agrega en fases posteriores.
  console.log("Seed vacío: no hay datos para cargar en la Fase 1.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
