import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { passRefKey, perfectRefKey } from "@/lib/gamification/xp";

const prisma = new PrismaClient();
const PLAYER_EMAIL = "jugador.e2e@unla.edu.ar";
const TECHNIQUE_SLUG = "via-periferica-adulto";

test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(PLAYER_EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill("Jugador1234!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

async function visibleIds(page: Page): Promise<string[]> {
  return page
    .getByRole("list", { name: "Pasos para ordenar" })
    .getByRole("listitem")
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-step-id") ?? ""));
}

async function waitReady(page: Page) {
  await expect(page.locator('[data-game-ready="true"]')).toBeVisible();
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

async function solveWithKeyboard(page: Page) {
  const ids = await visibleIds(page);
  const expected = await correctOrder(ids);

  for (let target = 0; target < expected.length; target += 1) {
    let current = await visibleIds(page);
    if (current[target] === expected[target]) continue;

    let source = current.findIndex(
      (id, index) => index > target && id === expected[target],
    );
    expect(source).toBeGreaterThan(target);

    while (source > target) {
      const up = page.getByRole("button", {
        name: `Subir paso ${source + 1}`,
        exact: true,
      });
      await up.focus();
      await page.keyboard.press("Enter");
      await expect
        .poll(async () => (await visibleIds(page))[source - 1])
        .toBe(expected[target]);
      source -= 1;
    }

    current = await visibleIds(page);
    expect(current[target]).toBe(expected[target]);
  }

  await page.getByRole("button", { name: "Comprobar orden", exact: true }).focus();
  await page.keyboard.press("Enter");
}

test("el juego se completa con teclado y da XP una sola vez", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "El juego se verifica en desktop");

  await login(page);
  await page.goto(`/tecnicas/${TECHNIQUE_SLUG}/jugar/ordenar`);

  await expect(page.getByRole("heading", { name: "Ordená los pasos" })).toBeVisible();
  await waitReady(page);

  const initial = await visibleIds(page);
  expect(initial).toHaveLength(8);
  expect(initial).not.toEqual(await correctOrder(initial));

  await solveWithKeyboard(page);

  await expect(page.getByRole("heading", { name: "¡Aprobaste!" })).toBeVisible();
  await expect(page.getByText("100 / 100")).toBeVisible();
  await expect(page.getByText("Sumaste 200 XP en este intento.")).toBeVisible();
  await expect(page.getByText("Mente ordenada")).toBeVisible();

  const player = await prisma.user.findUniqueOrThrow({
    where: { email: PLAYER_EMAIL },
    select: { id: true },
  });
  const activity = await prisma.activity.findFirstOrThrow({
    where: { technique: { slug: TECHNIQUE_SLUG }, type: "ORDER_STEPS" },
    select: { id: true },
  });

  const firstAttempts = await prisma.activityAttempt.findMany({
    where: { userId: player.id, activityId: activity.id },
    select: { score: true, passed: true },
  });
  expect(firstAttempts).toHaveLength(1);
  expect(firstAttempts[0]?.score).toBe(100);
  expect(firstAttempts[0]?.passed).toBe(true);

  const xpAfterFirst = await prisma.xpEvent.aggregate({
    where: {
      userId: player.id,
      refKey: { in: [passRefKey(activity.id), perfectRefKey(activity.id)] },
    },
    _sum: { amount: true },
  });
  expect(xpAfterFirst._sum.amount).toBe(200);

  const badgesAfterFirst = await prisma.userBadge.count({
    where: { userId: player.id, badge: { code: "ORDERED_MIND" } },
  });
  expect(badgesAfterFirst).toBe(1);

  // Segundo intento perfecto: se guarda el intento, pero no se repite el XP.
  await page.getByRole("link", { name: "Reintentar" }).click();
  await expect(page.getByRole("heading", { name: "Ordená los pasos" })).toBeVisible();
  await waitReady(page);
  await solveWithKeyboard(page);

  await expect(page.getByRole("heading", { name: "¡Aprobaste!" })).toBeVisible();
  await expect(page.getByText(/Sumaste \d+ XP en este intento\./)).toHaveCount(0);

  const attempts = await prisma.activityAttempt.findMany({
    where: { userId: player.id, activityId: activity.id },
    select: { score: true, passed: true },
  });
  expect(attempts).toHaveLength(2);
  expect(attempts.every((attempt) => attempt.passed && attempt.score === 100)).toBe(true);

  const xpAfterSecond = await prisma.xpEvent.aggregate({
    where: {
      userId: player.id,
      refKey: { in: [passRefKey(activity.id), perfectRefKey(activity.id)] },
    },
    _sum: { amount: true },
  });
  expect(xpAfterSecond._sum.amount).toBe(200);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
