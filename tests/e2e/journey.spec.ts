import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  FIXTURE_COUNT,
  TECHNIQUE_SLUG,
  correctText,
  createTriviaFixtures,
  type TriviaFixtures,
} from "./trivia-fixtures";

const prisma = new PrismaClient();

const stamp = Date.now();
const student = {
  firstName: "Recorrido",
  lastName: `Completo${stamp}`,
  dni: String(10_000_000 + (stamp % 60_000_000)),
  email: `e2e.recorrido.${stamp}@unla.edu.ar`,
  provisional: "Provisoria123",
  definitive: "Definitiva123",
};

let fixtures: TriviaFixtures;

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.beforeAll(async () => {
  fixtures = await createTriviaFixtures(prisma);
});

test.afterAll(async () => {
  await fixtures.restore();
  await prisma.$disconnect();
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
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

async function solveOrderGame(page: Page) {
  await expect(page.locator('[data-game-ready="true"]')).toBeVisible();
  const expected = await correctOrder(await visibleIds(page));

  for (let target = 0; target < expected.length; target += 1) {
    const current = await visibleIds(page);
    if (current[target] === expected[target]) continue;

    let source = current.findIndex(
      (id, index) => index > target && id === expected[target],
    );
    expect(source).toBeGreaterThan(target);

    while (source > target) {
      await page
        .getByRole("button", { name: `Subir paso ${source + 1}`, exact: true })
        .click();
      await expect
        .poll(async () => (await visibleIds(page))[source - 1])
        .toBe(expected[target]);
      source -= 1;
    }
  }

  await page.getByRole("button", { name: "Comprobar orden", exact: true }).click();
}

async function answerTrivia(page: Page) {
  await expect(page.locator('[data-trivia-ready="true"]')).toBeVisible();

  for (let index = 0; index < FIXTURE_COUNT; index += 1) {
    await expect(
      page.getByText(`Pregunta ${index + 1} de ${FIXTURE_COUNT}`, { exact: true }),
    ).toBeVisible();

    const prompt = (await page.locator("#trivia-pregunta").textContent())?.trim();
    const question = fixtures.questions.find((item) => item.prompt === prompt);
    expect(question, `No se encontró la pregunta fixture: ${prompt}`).toBeTruthy();
    if (!question) return;

    await page.getByRole("radio", { name: correctText(question), exact: true }).check();
    await page
      .getByRole("button", {
        name: index === FIXTURE_COUNT - 1 ? "Responder trivia" : "Siguiente",
        exact: true,
      })
      .click();
  }
}

test("recorrido completo: alta, cambio de contraseña, lectura, juegos, dominio y perfil", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "El recorrido completo se verifica en desktop");

  // 1. El equipo administrativo da de alta al estudiante.
  await login(page, "admin.gestion@unla.edu.ar", "Gestion1234!");
  await expect(page).toHaveURL(/\/admin\/estudiantes/);

  await page.getByLabel("Nombre", { exact: true }).fill(student.firstName);
  await page.getByLabel("Apellido", { exact: true }).fill(student.lastName);
  await page.getByLabel("DNI").fill(student.dni);
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Contraseña provisoria", { exact: true }).fill(student.provisional);
  await page.getByRole("button", { name: "Crear estudiante" }).click();
  await expect(page.getByText(/Estudiante creado/)).toBeVisible();
  await signOut(page);

  // 2. Primer ingreso: la contraseña provisoria obliga al cambio.
  await login(page, student.email, student.provisional);
  await expect(page).toHaveURL(/\/cambiar-password/);
  await page.getByLabel("Contraseña provisoria actual").fill(student.provisional);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(student.definitive);
  await page.getByLabel("Repetí la nueva contraseña").fill(student.definitive);
  await page.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.getByRole("heading", { name: /Hola, Recorrido/ })).toBeVisible();

  // 3. Lectura de la técnica y video.
  await page.getByRole("link", { name: "Leer técnica" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Colocación de vía periférica en adulto" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Técnica paso a paso" })).toBeVisible();

  await page.getByRole("button", { name: "Terminé la lectura" }).click();
  await expect(page.getByText(/Lectura registrada\. Sumaste 100 XP\./)).toBeVisible();

  await page
    .getByRole("button", { name: /Reproducir: Colocación de venoclisis/ })
    .click();
  await expect(page.locator('iframe[title="Colocación de venoclisis"]')).toBeVisible();
  await expect(page.getByText("Visto", { exact: true })).toBeVisible();

  // 4. Juego de ordenar con teclado.
  await page.goto(`/tecnicas/${TECHNIQUE_SLUG}/jugar/ordenar`);
  await expect(page.getByRole("heading", { name: "Ordená los pasos" })).toBeVisible();
  await solveOrderGame(page);
  await expect(page.getByRole("heading", { name: "¡Aprobaste!" })).toBeVisible();
  await expect(page.getByText("Mente ordenada")).toBeVisible();

  // 5. Trivia completa: dispara la insignia de técnica dominada.
  await page.goto(`/tecnicas/${TECHNIQUE_SLUG}/jugar/trivia`);
  await expect(page.getByRole("heading", { name: "Trivia", level: 1 })).toBeVisible();
  await answerTrivia(page);
  await expect(page.getByRole("heading", { name: "¡Aprobaste la trivia!" })).toBeVisible();
  await expect(
    page.getByText(/Dominaste: Colocación de vía periférica en adulto/),
  ).toBeVisible();

  // 6. El perfil refleja todo el recorrido: 100 + 20 + 200 + 200 + 200 XP.
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  await expect(page.getByText("720 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("Primer paso", { exact: true })).toBeVisible();
  await expect(page.getByText("Mente ordenada", { exact: true })).toBeVisible();
  await expect(page.getByText("Estrella de la trivia", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Dominaste: Colocación de vía periférica en adulto", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("+100 XP")).toBeVisible();
  await expect(page.getByText("+20 XP")).toBeVisible();

  const created = await prisma.user.findUniqueOrThrow({
    where: { email: student.email },
    select: { id: true, mustChangePassword: true },
  });
  expect(created.mustChangePassword).toBe(false);

  const totalXp = await prisma.xpEvent.aggregate({
    where: { userId: created.id },
    _sum: { amount: true },
  });
  expect(totalXp._sum.amount).toBe(720);

  // 7. La contraseña definitiva persiste en un nuevo ingreso.
  await signOut(page);
  await login(page, student.email, student.definitive);
  await expect(page).toHaveURL(/\/inicio/);
});
