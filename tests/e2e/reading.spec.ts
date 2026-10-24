import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const READER_EMAIL = "lector.e2e@unla.edu.ar";

test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(READER_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill("Lector1234!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

async function readerId() {
  const reader = await prisma.user.findUniqueOrThrow({
    where: { email: READER_EMAIL },
    select: { id: true },
  });
  return reader.id;
}

test("el inicio muestra la técnica, el buscador y el progreso", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: /Hola, Lectora/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu progreso" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Colocación de vía periférica en adulto" }),
  ).toBeVisible();

  await page.getByLabel("Buscar técnica").fill("via");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\/inicio\?q=via/);
  await expect(page.getByRole("heading", { name: "Resultados para “via”" })).toBeVisible();

  await page.getByLabel("Buscar técnica").fill("zzzz");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText(/No encontramos técnicas para/)).toBeVisible();
});

test("doble lectura registra dos lecturas y 100 XP", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  await login(page);
  await page.goto("/tecnicas");
  await page.getByRole("link", { name: "Leer técnica" }).click();

  await expect(page).toHaveURL(/\/tecnicas\/via-periferica-adulto/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Colocación de vía periférica en adulto" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Técnica paso a paso" })).toBeVisible();

  await page.getByRole("button", { name: "Terminé la lectura" }).click();
  await expect(page.getByText(/Lectura registrada\. Sumaste 100 XP\./)).toBeVisible();

  const reread = page.getByRole("button", { name: "Registrar relectura" });
  await expect(reread).toBeVisible();
  await reread.click();
  await expect(
    page.getByText(/Lectura registrada\. Las relecturas no suman XP\./),
  ).toBeVisible();

  const userId = await readerId();
  const completions = await prisma.readingCompletion.findMany({
    where: { userId },
    select: { version: true },
  });

  expect(completions).toHaveLength(2);
  expect(completions[0]?.version).toBe(completions[1]?.version);

  const readingXp = await prisma.xpEvent.aggregate({
    where: { userId, refKey: { startsWith: "READING_" } },
    _sum: { amount: true },
  });

  expect(readingXp._sum.amount).toBe(100);
});

test("ver el video registra una visualización y 20 XP", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  await login(page);
  await page.goto("/tecnicas/via-periferica-adulto");

  await page
    .getByRole("button", { name: "Reproducir Colocación de venoclisis" })
    .click();
  await expect(page.locator('iframe[title="Colocación de venoclisis"]')).toBeVisible();
  await expect(page.getByText("Visto", { exact: true })).toBeVisible();

  const userId = await readerId();
  const views = await prisma.videoView.count({ where: { userId } });
  expect(views).toBe(1);

  const videoXp = await prisma.xpEvent.aggregate({
    where: { userId, refKey: { startsWith: "VIDEO:" } },
    _sum: { amount: true },
  });
  expect(videoXp._sum.amount).toBe(20);

  // Al volver a entrar, la visualización sigue registrada.
  await page.reload();
  await expect(page.getByText("Visto", { exact: true })).toBeVisible();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
