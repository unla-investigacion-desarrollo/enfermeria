import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TECHNIQUE_SLUG = "via-periferica-adulto";
const STUDENT_EMAIL = "notif.e2e@unla.edu.ar";
const STUDENT_PASSWORD = "Notif1234!";

test.describe.configure({ mode: "serial" });

async function login(page: Page, email: string, password: string, expected: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(expected);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("una actualización avisa a quien ya leyó y a quien está leyendo", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "La escritura se verifica en desktop");

  const technique = await prisma.technique.findUniqueOrThrow({
    where: { slug: TECHNIQUE_SLUG },
    select: { id: true, slug: true, title: true, summary: true, version: true },
  });
  const student = await prisma.user.findUniqueOrThrow({
    where: { email: STUDENT_EMAIL },
    select: { id: true },
  });

  // La estudiante ya completó la versión actual y además tiene un avance guardado.
  await prisma.readingCompletion.create({
    data: {
      userId: student.id,
      techniqueId: technique.id,
      version: technique.version,
    },
  });
  await prisma.readingProgress.create({
    data: {
      userId: student.id,
      techniqueId: technique.id,
      phaseIndex: 1,
      stepIndex: 9,
    },
  });

  try {
    // El admin guarda una técnica publicada: se crea una versión nueva y el aviso.
    await login(
      page,
      "admin.gestion@unla.edu.ar",
      "Gestion1234!",
      /\/admin\/estudiantes/,
    );
    await page.goto(`/admin/tecnicas/${technique.id}/editar`);

    const marker = `Actualización e2e ${Date.now()}`;
    await page.getByLabel("Resumen", { exact: true }).fill(marker);
    await expect(
      page.getByLabel("Avisar a estudiantes al guardar"),
    ).toBeChecked();
    await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
    await expect(
      page.getByText(new RegExp(`Técnica guardada\\. Versión ${technique.version + 1}`)),
    ).toBeVisible();

    const updated = await prisma.technique.findUniqueOrThrow({
      where: { id: technique.id },
      select: { version: true },
    });
    expect(updated.version).toBe(technique.version + 1);

    const notification = await prisma.notification.findUnique({
      where: {
        userId_techniqueId_type: {
          userId: student.id,
          techniqueId: technique.id,
          type: "TECHNIQUE_UPDATED",
        },
      },
      select: { readAt: true, version: true },
    });
    expect(notification?.readAt).toBeNull();
    expect(notification?.version).toBe(technique.version + 1);

    // La estudiante ve el aviso en el inicio y en la campana.
    await signOut(page);
    await login(page, STUDENT_EMAIL, STUDENT_PASSWORD, /\/inicio/);

    await expect(
      page.getByRole("link", { name: /Notificaciones \(1 sin leer\)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `Nueva versión de ${technique.title}` }),
    ).toBeVisible();

    // Al entrar a la técnica, el aviso de versión nueva es visible.
    await page.getByRole("link", { name: "Releer ahora" }).click();
    await expect(page).toHaveURL(new RegExp(`/tecnicas/${technique.slug}`));
    await expect(
      page.getByText("Hay una versión nueva de esta técnica"),
    ).toBeVisible();
    await expect(page.getByText(`Publicamos la versión ${technique.version + 1}.`)).toBeVisible();

    // La bandeja permite marcar el aviso como leído.
    await page.goto("/notificaciones");
    await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible();
    await expect(page.getByText("Sin leer", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Marcar como leída" }).click();
    await expect(
      page.getByText("Estás al día: no tenés avisos pendientes."),
    ).toBeVisible();

    const read = await prisma.notification.findUnique({
      where: {
        userId_techniqueId_type: {
          userId: student.id,
          techniqueId: technique.id,
          type: "TECHNIQUE_UPDATED",
        },
      },
      select: { readAt: true },
    });
    expect(read?.readAt).not.toBeNull();
  } finally {
    await prisma.notification.deleteMany({
      where: { userId: student.id, techniqueId: technique.id },
    });
    await prisma.readingCompletion.deleteMany({
      where: { userId: student.id, techniqueId: technique.id },
    });
    await prisma.readingProgress.deleteMany({
      where: { userId: student.id, techniqueId: technique.id },
    });
    await prisma.technique.update({
      where: { id: technique.id },
      data: { summary: technique.summary, version: technique.version },
    });
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
