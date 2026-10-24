import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function loginAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin.gestion@unla.edu.ar");
  await page.getByLabel("Contraseña", { exact: true }).fill("Gestion1234!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin\/estudiantes/);
}

test("la técnica seed tiene el contenido completo", async () => {
  const technique = await prisma.technique.findUnique({
    where: { slug: "via-periferica-adulto" },
    include: {
      _count: { select: { steps: true, materials: true, checklist: true, activities: true } },
    },
  });

  expect(technique).not.toBeNull();
  expect(technique?.published).toBe(true);
  expect(technique?._count.steps).toBe(29);
  expect(technique?._count.materials).toBe(6);
  expect(technique?._count.checklist).toBe(15);
  expect(technique?._count.activities).toBe(2);
});

test("el admin edita, reordena, publica y sube la versión", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Edición verificada en desktop");

  await loginAdmin(page);
  await page.goto("/admin/tecnicas");

  const row = page.getByRole("row", { name: /Colocación de vía periférica en adulto/ });
  await expect(row.getByText("29 pasos")).toBeVisible();
  await row.getByRole("link", { name: "Editar" }).click();

  await expect(page.getByRole("heading", { name: "Editar técnica" })).toBeVisible();

  const versionLabel = page.getByText(/^Publicada · v\d+$/);
  const before = Number((await versionLabel.innerText()).match(/v(\d+)/)?.[1] ?? 0);
  expect(before).toBeGreaterThan(0);

  const step = page.getByLabel("Texto del paso 1", { exact: true });
  const original = await step.inputValue();
  await step.fill(`${original} (actualizado e2e)`);
  await page.getByRole("button", { name: "Bajar paso 1", exact: true }).click();

  await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
  await expect(page.getByText(new RegExp(`Técnica guardada\\. Versión ${before + 1}`))).toBeVisible();

  await page.getByRole("button", { name: "Despublicar", exact: true }).click();
  await expect(page.getByText(/^Borrador · v\d+$/)).toBeVisible();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText(/^Publicada · v\d+$/)).toBeVisible();

  const saved = await prisma.technique.findUnique({
    where: { slug: "via-periferica-adulto" },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  expect(saved?.version).toBe(before + 1);
  expect(saved?.published).toBe(true);
  expect(saved?.steps[0]?.text).not.toContain("(actualizado e2e)");
  expect(saved?.steps[1]?.text).toBe(`${original} (actualizado e2e)`);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
