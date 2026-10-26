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
    page.getByRole("heading", {
      level: 2,
      name: "Colocación de vía periférica en adulto",
    }),
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
  await expect(page.getByText("Sumaste 100 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("Nueva insignia:")).toBeVisible();

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
    .getByRole("button", { name: /Reproducir: Colocación de venoclisis/ })
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

test("el check list permite autoevaluar cada paso y reiniciar", async ({ page }) => {
  await login(page);
  await page.goto("/tecnicas/via-periferica-adulto");

  const checklist = page.locator("#checklist");
  await expect(checklist.getByRole("heading", { name: "Check list" })).toBeVisible();
  const status = checklist.getByRole("status");
  await expect(status).toHaveText("0 de 15 ítems evaluados");

  const firstItem = checklist.getByRole("listitem").first();
  await firstItem.getByRole("radio", { name: "Lo realizo correctamente" }).check();
  await expect(status).toHaveText("1 de 15 ítems evaluados");

  // Cambiar la valoración del mismo ítem no aumenta el total.
  await firstItem.getByRole("radio", { name: "No lo realiza" }).check();
  await expect(status).toHaveText("1 de 15 ítems evaluados");

  await checklist.getByRole("button", { name: "Reiniciar" }).click();
  await expect(status).toHaveText("0 de 15 ítems evaluados");
});

test("el perfil muestra nivel, XP e insignias", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "El perfil se verifica en desktop");

  await login(page);
  await page.goto("/perfil");

  await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  await expect(page.getByText("120 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("Ingresante", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Insignias" })).toBeVisible();
  await expect(page.getByText("Primer paso", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historial de XP" })).toBeVisible();
  await expect(page.getByText("+100 XP")).toBeVisible();
  await expect(page.getByText("+20 XP")).toBeVisible();
});

test("la lectura guiada avanza por fases, guarda el progreso y evalúa checkpoints", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  await login(page);
  await page.goto("/tecnicas/via-periferica-adulto");

  await expect(page.getByRole("heading", { name: "Técnica paso a paso" })).toBeVisible();
  await expect(page.getByText("Paso 1 de 29")).toBeVisible();

  await page.locator("#caso").getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Paso 2 de 29")).toBeVisible();
  await expect(page).toHaveURL(/paso=2/);

  // El avance se guarda con debounce y se restaura al recargar.
  await page.waitForTimeout(900);
  await page.reload();
  await expect(page.getByText("Paso 2 de 29")).toBeVisible();

  // El stepper permite saltar a otra fase.
  await page.getByRole("button", { name: "Punción", exact: true }).click();
  await expect(page).toHaveURL(/fase=3/);
  await expect(page.getByText("Fase 3 · La punción")).toBeVisible();
  await expect(page.getByText("Paso 14 de 29")).toBeVisible();

  const technique = await prisma.technique.findUniqueOrThrow({
    where: { slug: "via-periferica-adulto" },
    select: { id: true },
  });
  const userId = await readerId();

  await expect
    .poll(
      async () => {
        const progress = await prisma.readingProgress.findUnique({
          where: {
            userId_techniqueId: { userId, techniqueId: technique.id },
          },
          select: { phaseIndex: true, stepIndex: true },
        });
        return progress ? `${progress.phaseIndex}:${progress.stepIndex}` : null;
      },
      { timeout: 5000 },
    )
    .toBe("2:13");

  // Un checkpoint se responde sin salir de la lectura y avanza de fase.
  await page.goto("/tecnicas/via-periferica-adulto?fase=1&paso=8");
  await expect(page.getByText("Checkpoint 1 de 1")).toBeVisible();
  await page
    .getByRole("radio", { name: "Lo cierro y dejo el equipo preparado en la bandeja." })
    .check();
  await page.getByRole("button", { name: "Comprobar" }).click();
  await expect(page.getByText("Correcto. Buen ojo clínico.")).toBeVisible();
  await expect(page.getByText(/1 al primer intento/)).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Paso 9 de 29")).toBeVisible();
  await expect(page.getByText("Fase 2 · En la unidad")).toBeVisible();

  // El repaso rápido de pasos también está paginado.
  await page.getByText(/Repaso rápido: los 29 pasos/).click();
  const quickReview = page.locator("details", { hasText: "Repaso rápido: los 29 pasos" });
  await expect(quickReview.getByText("Página 1 de 6")).toBeVisible();
  await quickReview
    .getByRole("navigation", { name: "Paginación del repaso de pasos" })
    .getByRole("button", { name: "Siguiente" })
    .click();
  await expect(quickReview.getByText("Página 2 de 6")).toBeVisible();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
