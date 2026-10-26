import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { masterBadgeCode } from "@/lib/techniques/badges";
import { masteredRefKey, passRefKey, perfectRefKey } from "@/lib/gamification/xp";
import {
  FIXTURE_COUNT,
  TECHNIQUE_SLUG,
  correctText,
  createTriviaFixtures,
  type TriviaFixtures,
  wrongText,
} from "./trivia-fixtures";

const prisma = new PrismaClient();

const TRIVIA_EMAIL = "trivia.e2e@unla.edu.ar";
const MASTER_EMAIL = "master.e2e@unla.edu.ar";
const ADMIN_EMAIL = "admin.gestion@unla.edu.ar";

let fixtures: TriviaFixtures;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  fixtures = await createTriviaFixtures(prisma);
});

test.afterAll(async () => {
  await fixtures.restore();
  await prisma.$disconnect();
});

async function login(
  page: Page,
  email: string,
  password: string,
  expected: RegExp = /\/inicio/,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(expected);
}

async function openTrivia(page: Page) {
  await page.goto(`/tecnicas/${TECHNIQUE_SLUG}/jugar/trivia`);
  await expect(page.locator('[data-trivia-ready="true"]')).toBeVisible();
}

/**
 * Responde la trivia por texto de opción. `correctCount` permite aprobar con
 * menos del 100% para verificar que el XP de aprobación no se repite.
 */
async function answerTrivia(page: Page, correctCount = FIXTURE_COUNT) {
  for (let index = 0; index < FIXTURE_COUNT; index += 1) {
    await expect(
      page.getByText(`Pregunta ${index + 1} de ${FIXTURE_COUNT}`, { exact: true }),
    ).toBeVisible();

    const prompt = (await page.locator("#trivia-pregunta").textContent())?.trim();
    const question = fixtures.questions.find((item) => item.prompt === prompt);
    expect(question, `No se encontró la pregunta fixture: ${prompt}`).toBeTruthy();
    if (!question) return;

    const option = index < correctCount ? correctText(question) : wrongText(question);
    await page.getByRole("radio", { name: option, exact: true }).check();

    const isLast = index === FIXTURE_COUNT - 1;
    await page
      .getByRole("button", { name: isLast ? "Responder trivia" : "Siguiente", exact: true })
      .click();
  }
}

async function triviaActivityId(): Promise<string> {
  const activity = await prisma.activity.findFirstOrThrow({
    where: { technique: { slug: TECHNIQUE_SLUG }, type: "TRIVIA" },
    select: { id: true },
  });
  return activity.id;
}

test("la respuesta correcta no llega antes de responder y aprobar da XP una vez", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  await login(page, TRIVIA_EMAIL, "Trivia1234!");
  await openTrivia(page);

  // Antes de responder, el HTML no debe contener la respuesta ni la explicación.
  const html = await page.content();
  expect(html).not.toContain("correctIdx");
  expect(html).not.toContain("explanation");
  for (const question of fixtures.questions) {
    expect(html).not.toContain(question.explanation);
  }
  await expect(page.getByRole("heading", { name: "Trivia", level: 1 })).toBeVisible();

  await answerTrivia(page);

  await expect(page.getByRole("heading", { name: "¡Aprobaste la trivia!" })).toBeVisible();
  await expect(page.getByText("100 / 100")).toBeVisible();
  await expect(page.getByText("Sumaste 200 XP en este intento.")).toBeVisible();
  await expect(page.getByText("Estrella de la trivia")).toBeVisible();
  await expect(
    page.getByText("Pregunta pendiente de revisión por Enfermería."),
  ).toHaveCount(1);

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: TRIVIA_EMAIL },
    select: { id: true },
  });
  const activityId = await triviaActivityId();

  const attempts = await prisma.activityAttempt.findMany({
    where: { userId: user.id, activityId },
    select: { score: true, passed: true },
  });
  expect(attempts).toEqual([{ score: 100, passed: true }]);

  const xp = await prisma.xpEvent.aggregate({
    where: {
      userId: user.id,
      refKey: { in: [passRefKey(activityId), perfectRefKey(activityId)] },
    },
    _sum: { amount: true },
  });
  expect(xp._sum.amount).toBe(200);

  const star = await prisma.userBadge.count({
    where: { userId: user.id, badge: { code: "TRIVIA_STAR" } },
  });
  expect(star).toBe(1);

  // Segundo intento aprobado con 80%: se guarda, pero no repite XP.
  await page.getByRole("link", { name: "Reintentar" }).click();
  await expect(page.locator('[data-trivia-ready="true"]')).toBeVisible();
  await answerTrivia(page, 8);

  await expect(page.getByRole("heading", { name: "¡Aprobaste la trivia!" })).toBeVisible();
  await expect(page.getByText("80 / 100")).toBeVisible();
  await expect(page.getByText(/Sumaste \d+ XP en este intento\./)).toHaveCount(0);

  // La revisión arranca en las respuestas incorrectas y permite ver todas.
  const review = page.locator('section[aria-labelledby="trivia-revision"]');
  await expect(review.getByRole("button", { name: "Para repasar (2)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(review.locator("li")).toHaveCount(2);
  await review.getByRole("button", { name: `Ver todas (${FIXTURE_COUNT})` }).click();
  await expect(review.locator("li")).toHaveCount(FIXTURE_COUNT);
  await review.getByRole("button", { name: "Para repasar (2)" }).click();
  await expect(review.locator("li")).toHaveCount(2);

  const secondAttempts = await prisma.activityAttempt.findMany({
    where: { userId: user.id, activityId },
    select: { score: true, passed: true },
  });
  expect(secondAttempts).toHaveLength(2);
  expect(secondAttempts.every((attempt) => attempt.passed)).toBe(true);

  const xpAfterSecond = await prisma.xpEvent.aggregate({
    where: {
      userId: user.id,
      refKey: { in: [passRefKey(activityId), perfectRefKey(activityId)] },
    },
    _sum: { amount: true },
  });
  expect(xpAfterSecond._sum.amount).toBe(200);
});

test("el admin crea, edita, activa y elimina preguntas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  const prompt = "[e2e] Pregunta creada desde el panel";
  const explanation = "Explicación inicial creada desde el panel de prueba.";
  const updatedExplanation = "Explicación actualizada desde el panel de prueba.";

  await login(page, ADMIN_EMAIL, "Gestion1234!", /\/admin\/estudiantes/);
  await page.goto("/admin/tecnicas");
  await page.getByRole("link", { name: "Editar" }).first().click();
  await page.getByRole("link", { name: "Preguntas" }).click();

  await expect(
    page.getByRole("heading", { name: "Preguntas de trivia" }),
  ).toBeVisible();
  await expect(page.getByText(/Hay 1 pregunta activa sin revisar/)).toBeVisible();

  const createForm = page.getByRole("form", { name: "Nueva pregunta" });
  await createForm.getByLabel("Enunciado", { exact: true }).fill(prompt);
  await createForm.getByLabel("Opción 1", { exact: true }).fill("Primera opción e2e");
  await createForm.getByLabel("Opción 2", { exact: true }).fill("Segunda opción e2e");
  await createForm
    .getByRole("radio", { name: "Marcar la opción 2 como correcta" })
    .check();
  await createForm
    .getByLabel("Explicación de la respuesta", { exact: true })
    .fill(explanation);
  await createForm.getByRole("button", { name: "Agregar pregunta" }).click();

  await expect(page.getByText(/Pregunta agregada/)).toBeVisible();
  await expect(page.getByText(/Hay 2 preguntas activas sin revisar/)).toBeVisible();

  const created = await prisma.triviaQuestion.findFirstOrThrow({
    where: { prompt },
    select: { id: true, reviewed: true, active: true, correctIdx: true, options: true },
  });
  expect(created.reviewed).toBe(false);
  expect(created.active).toBe(true);
  expect(created.correctIdx).toBe(1);
  expect(created.options).toEqual(["Primera opción e2e", "Segunda opción e2e"]);

  const row = () =>
    page.getByRole("listitem").filter({ hasText: prompt }).first();

  await row().getByText("Editar pregunta").click();
  const editForm = page.getByRole("form", {
    name: `Editar pregunta: ${prompt}`,
  });
  await editForm
    .getByLabel("Explicación de la respuesta", { exact: true })
    .fill(updatedExplanation);
  await editForm
    .getByRole("checkbox", { name: /Revisada por Enfermería/ })
    .check();
  await editForm.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Pregunta actualizada.")).toBeVisible();
  const updated = await prisma.triviaQuestion.findUniqueOrThrow({
    where: { id: created.id },
    select: { reviewed: true, explanation: true },
  });
  expect(updated.reviewed).toBe(true);
  expect(updated.explanation).toBe(updatedExplanation);

  await row().getByRole("button", { name: "Desactivar" }).click();
  await expect
    .poll(async () =>
      (
        await prisma.triviaQuestion.findUniqueOrThrow({
          where: { id: created.id },
          select: { active: true },
        })
      ).active,
    )
    .toBe(false);

  await row().getByRole("button", { name: "Activar" }).click();
  await expect
    .poll(async () =>
      (
        await prisma.triviaQuestion.findUniqueOrThrow({
          where: { id: created.id },
          select: { active: true },
        })
      ).active,
    )
    .toBe(true);

  page.once("dialog", (dialog) => dialog.accept());
  await row().getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText(prompt)).toHaveCount(0);
  expect(
    await prisma.triviaQuestion.count({ where: { id: created.id } }),
  ).toBe(0);
});

test("lectura + ordenar + trivia otorga la insignia de técnica dominada y +200 XP", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  const technique = await prisma.technique.findUniqueOrThrow({
    where: { slug: TECHNIQUE_SLUG },
    select: { id: true, version: true },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: MASTER_EMAIL },
    select: { id: true },
  });
  const orderActivity = await prisma.activity.findFirstOrThrow({
    where: { techniqueId: technique.id, type: "ORDER_STEPS" },
    select: { id: true },
  });

  // La lectura y el juego de ordenar ya están aprobados; la trivia se juega
  // completa por la interfaz y debe disparar la insignia maestra.
  await prisma.readingCompletion.create({
    data: { userId: user.id, techniqueId: technique.id, version: technique.version },
  });
  await prisma.activityAttempt.create({
    data: {
      userId: user.id,
      activityId: orderActivity.id,
      score: 100,
      passed: true,
      detail: { source: "e2e" },
    },
  });

  await login(page, MASTER_EMAIL, "Master1234!");
  await openTrivia(page);
  await answerTrivia(page);

  await expect(page.getByRole("heading", { name: "¡Aprobaste la trivia!" })).toBeVisible();
  await expect(
    page.getByText(/Dominaste: Colocación de vía periférica en adulto/),
  ).toBeVisible();

  const badge = await prisma.badge.findUniqueOrThrow({
    where: { code: masterBadgeCode(TECHNIQUE_SLUG) },
    select: { id: true },
  });
  const userBadge = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
  });
  expect(userBadge).not.toBeNull();

  const masteredEvents = await prisma.xpEvent.findMany({
    where: { userId: user.id, refKey: masteredRefKey(technique.id) },
    select: { amount: true },
  });
  expect(masteredEvents).toHaveLength(1);
  expect(masteredEvents[0]?.amount).toBe(200);

  const masterXp = await prisma.xpEvent.aggregate({
    where: { userId: user.id, refKey: masteredRefKey(technique.id) },
    _sum: { amount: true },
  });
  expect(masterXp._sum.amount).toBe(200);
});
