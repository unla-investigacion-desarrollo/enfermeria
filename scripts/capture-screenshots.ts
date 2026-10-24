/**
 * Captura las imágenes de docs/screenshots para el README.
 *
 * Requisitos: base migrada + seed + `npm run db:demo` y un servidor de
 * producción en CAPTURE_BASE_URL (por defecto http://localhost:3001).
 *
 *   npm run build && npm start -- -p 3001
 *   npx tsx scripts/capture-screenshots.ts
 *
 * El script reinicia el progreso de la cuenta demo para que las capturas sean
 * deterministas y crea preguntas ficticias de trivia mientras dura la captura.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  FIXTURE_COUNT,
  TECHNIQUE_SLUG,
  correctText,
  createTriviaFixtures,
} from "../tests/e2e/trivia-fixtures";

const prisma = new PrismaClient();
const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://localhost:3001";
const outputDir = path.join(process.cwd(), "docs", "screenshots");
const demoEmail = process.env.SEED_DEMO_EMAIL ?? "estudiante.demo@unla.edu.ar";
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Demo1234!";

async function resetDemoProgress() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { email: demoEmail },
    select: { id: true },
  });

  await prisma.userBadge.deleteMany({ where: { userId: demo.id } });
  await prisma.activityAttempt.deleteMany({ where: { userId: demo.id } });
  await prisma.videoView.deleteMany({ where: { userId: demo.id } });
  await prisma.readingCompletion.deleteMany({ where: { userId: demo.id } });
  await prisma.xpEvent.deleteMany({ where: { userId: demo.id } });
}

async function login(page: Page, email: string, password: string, expected = /\/inicio/) {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(expected);
}

async function visibleIds(page: Page): Promise<string[]> {
  return page
    .getByRole("list", { name: "Pasos para ordenar" })
    .getByRole("listitem")
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-step-id") ?? ""));
}

async function correctOrder(ids: string[]): Promise<string[]> {
  const steps = await prisma.step.findMany({
    where: { technique: { slug: TECHNIQUE_SLUG } },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const position = new Map(steps.map((step, index) => [step.id, index]));

  return [...ids].sort((a, b) => (position.get(a) ?? 0) - (position.get(b) ?? 0));
}

async function solveOrder(page: Page) {
  const expected = await correctOrder(await visibleIds(page));

  for (let target = 0; target < expected.length; target += 1) {
    let source = (await visibleIds(page)).findIndex(
      (id, index) => index >= target && id === expected[target],
    );

    while (source > target) {
      await page
        .getByRole("button", { name: `Subir paso ${source + 1}`, exact: true })
        .click();
      source -= 1;
      await page.waitForTimeout(120);
    }
  }

  await page.getByRole("button", { name: "Comprobar orden", exact: true }).click();
  await page.getByRole("heading", { name: "¡Aprobaste!" }).waitFor();
}

async function answerTrivia(page: Page, fixtures: Awaited<ReturnType<typeof createTriviaFixtures>>) {
  for (let index = 0; index < FIXTURE_COUNT; index += 1) {
    await page
      .getByText(`Pregunta ${index + 1} de ${FIXTURE_COUNT}`, { exact: true })
      .waitFor();
    const prompt = (await page.locator("#trivia-pregunta").textContent())?.trim();
    const question = fixtures.questions.find((item) => item.prompt === prompt);
    if (!question) throw new Error(`No se encontró la pregunta: ${prompt}`);

    await page.getByRole("radio", { name: correctText(question), exact: true }).check();
    await page
      .getByRole("button", {
        name: index === FIXTURE_COUNT - 1 ? "Responder trivia" : "Siguiente",
        exact: true,
      })
      .click();
  }

  await page.getByRole("heading", { name: "¡Aprobaste la trivia!" }).waitFor();
}

async function screenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {},
) {
  // En capturas de página completa la barra inferior fija se superpone al
  // contenido; la volvemos estática para que quede al final del documento.
  await page.addStyleTag({
    content: 'nav[aria-label="Navegación principal"] { position: static !important; }',
  });
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: options.fullPage ?? true,
    type: "jpeg",
    quality: 82,
  });
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await resetDemoProgress();
  const fixtures = await createTriviaFixtures(prisma);

  const browser = await chromium.launch();
  const mobile = await browser.newContext({
    ...devices["iPhone 13"],
    deviceScaleFactor: 2,
    locale: "es-AR",
  });
  const page = await mobile.newPage();

  try {
    await page.goto(`${baseUrl}/login`);
    await page.getByRole("heading", { name: "Ingresá al manual" }).waitFor();
    await screenshot(page, "01-login.jpg");

    await page.getByLabel("Email").fill(demoEmail);
    await page.getByLabel("Contraseña", { exact: true }).fill(demoPassword);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL(/\/inicio/);
    await page.getByRole("heading", { name: /Hola,/ }).waitFor();

    await page.goto(`${baseUrl}/tecnicas/${TECHNIQUE_SLUG}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await screenshot(page, "03-tecnica.jpg", { fullPage: false });

    const steps = page.locator("#pasos");
    await steps.scrollIntoViewIfNeeded();
    await steps.screenshot({ path: path.join(outputDir, "04-paso-a-paso.jpg"), type: "jpeg", quality: 82 });

    await page.getByRole("button", { name: "Terminé la lectura" }).click();
    await page.getByText(/Lectura registrada/).waitFor();

    await page
      .getByRole("button", { name: /Reproducir: Colocación de venoclisis/ })
      .click();
    await page.getByText("Visto", { exact: true }).waitFor();

    await page.goto(`${baseUrl}/tecnicas/${TECHNIQUE_SLUG}/jugar/ordenar`);
    await page.locator('[data-game-ready="true"]').waitFor();
    await screenshot(page, "05-ordenar.jpg");
    await solveOrder(page);
    await screenshot(page, "06-ordenar-resultado.jpg");

    // La trivia se juega con el banco ficticio de e2e para completar el demo.
    // Después se restaura el banco real (vacío) y se captura el estado vacío,
    // que es el que ve el estudiantado hasta que llegue el Apéndice B.
    await page.goto(`${baseUrl}/tecnicas/${TECHNIQUE_SLUG}/jugar/trivia`);
    await page.locator('[data-trivia-ready="true"]').waitFor();
    await answerTrivia(page, fixtures);
    await fixtures.restore();

    await page.goto(`${baseUrl}/tecnicas/${TECHNIQUE_SLUG}/jugar/trivia`);
    await page.getByText("La trivia todavía no está disponible.").waitFor();
    await screenshot(page, "07-trivia.jpg");

    await page.goto(`${baseUrl}/perfil`);
    await page.getByRole("heading", { name: "Mi perfil" }).waitFor();
    await screenshot(page, "08-perfil.jpg");

    await page.goto(`${baseUrl}/inicio`);
    await page.getByText("1 de 1 técnica", { exact: true }).waitFor();
    await screenshot(page, "02-inicio.jpg");
  } finally {
    await mobile.close();
  }

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-AR" });
  const admin = await desktop.newPage();

  try {
    await login(admin, "admin.gestion@unla.edu.ar", "Gestion1234!", /\/admin\/estudiantes/);
    await admin.getByRole("heading", { name: "Estudiantes", exact: true }).waitFor();
    await screenshot(admin, "09-admin-estudiantes.jpg", { fullPage: false });

    await admin.goto(`${baseUrl}/admin/tecnicas`);
    await admin.getByRole("heading", { name: "Técnicas", exact: true }).waitFor();
    await screenshot(admin, "10-admin-tecnicas.jpg", { fullPage: false });

    await admin.getByRole("link", { name: "Editar" }).first().click();
    await admin.getByRole("link", { name: "Preguntas" }).click();
    await admin.getByRole("heading", { name: "Preguntas de trivia" }).waitFor();
    await screenshot(admin, "11-admin-preguntas.jpg", { fullPage: false });
  } finally {
    await desktop.close();
    await browser.close();
    await fixtures.restore();
    await prisma.$disconnect();
  }

  console.log(`Capturas guardadas en ${path.relative(process.cwd(), outputDir)}`);
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exit(1);
});
