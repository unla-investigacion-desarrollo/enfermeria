import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const student = {
  firstName: "Lucía",
  lastName: `Pérez${stamp}`,
  dni: String(20_000_000 + (stamp % 70_000_000)),
  email: `e2e.lucia.${stamp}@unla.edu.ar`,
  provisional: "Provisoria123",
  definitive: "Definitiva123",
  reset: "Reseteada123",
};
const fullName = `${student.firstName} ${student.lastName}`;

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

async function loginAdmin(page: Page) {
  await login(page, "admin.gestion@unla.edu.ar", "Gestion1234!");
  await expect(page).toHaveURL(/\/admin\/estudiantes/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function searchStudent(page: Page, query: string) {
  await page.goto("/admin/estudiantes");
  await page.getByLabel("Buscar estudiantes").fill(query);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("row", { name: new RegExp(query) })).toBeVisible();
}

test("el admin crea un estudiante, este cambia la contraseña y puede desactivarse", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Flujo completo verificado en desktop");

  await loginAdmin(page);

  await page.getByLabel("Nombre", { exact: true }).fill(student.firstName);
  await page.getByLabel("Apellido", { exact: true }).fill(student.lastName);
  await page.getByLabel("DNI").fill(student.dni);
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Contraseña provisoria", { exact: true }).fill(student.provisional);
  await page.getByRole("button", { name: "Crear estudiante" }).click();

  await expect(page.getByText(/Estudiante creado/)).toBeVisible();
  await expect(page.getByRole("cell", { name: fullName, exact: true })).toBeVisible();

  await signOut(page);
  await login(page, student.email, student.provisional);
  await expect(page).toHaveURL(/\/cambiar-password/);

  await page.getByLabel("Contraseña provisoria actual").fill(student.provisional);
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(student.definitive);
  await page.getByLabel("Repetí la nueva contraseña").fill(student.definitive);
  await page.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page).toHaveURL(/\/inicio/);

  await signOut(page);
  await loginAdmin(page);
  await searchStudent(page, student.lastName);

  const row = page.getByRole("row", { name: new RegExp(student.lastName) });
  await expect(row.getByText("Activo")).toBeVisible();
  await row.getByRole("button", { name: `Desactivar a ${fullName}` }).click();
  await expect(row.getByText("Inactivo")).toBeVisible();

  await signOut(page);
  await login(page, student.email, student.definitive);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();

  await loginAdmin(page);
  await searchStudent(page, student.lastName);
  await page
    .getByRole("row", { name: new RegExp(student.lastName) })
    .getByRole("button", { name: `Reactivar a ${fullName}` })
    .click();
  await expect(
    page.getByRole("row", { name: new RegExp(student.lastName) }).getByText("Activo"),
  ).toBeVisible();
});

test("el alta muestra errores claros ante email o DNI duplicados", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Flujo completo verificado en desktop");

  await loginAdmin(page);

  await page.getByLabel("Nombre", { exact: true }).fill("Otra");
  await page.getByLabel("Apellido", { exact: true }).fill("Persona");
  await page.getByLabel("DNI").fill("99999999");
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Contraseña provisoria", { exact: true }).fill("Provisoria123");
  await page.getByRole("button", { name: "Crear estudiante" }).click();
  await expect(page.getByText("Ya existe un usuario con ese email.")).toBeVisible();

  await page.getByLabel("DNI").fill(student.dni);
  await page.getByLabel("Email").fill(`e2e.otra.${stamp}@unla.edu.ar`);
  await page.getByRole("button", { name: "Crear estudiante" }).click();
  await expect(page.getByText("Ya existe un usuario con ese DNI.")).toBeVisible();
});

test("el admin puede resetear la contraseña y el estudiante debe cambiarla", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Flujo completo verificado en desktop");

  await loginAdmin(page);
  await searchStudent(page, student.lastName);

  await page
    .getByRole("row", { name: new RegExp(student.lastName) })
    .getByText("Resetear contraseña", { exact: true })
    .click();
  await page.getByLabel(`Nueva provisoria para ${fullName}`).fill(student.reset);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText(/Contraseña restablecida/)).toBeVisible();

  await signOut(page);
  await login(page, student.email, student.reset);
  await expect(page).toHaveURL(/\/cambiar-password/);
});
