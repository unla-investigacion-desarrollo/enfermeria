import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

test("el admin es obligado a cambiar la contraseña y llega a su panel", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "El cambio de contraseña se verifica en desktop");

  await login(page, "admin.e2e@unla.edu.ar", "Admin1234!");

  await expect(page).toHaveURL(/\/cambiar-password/);
  await expect(page.getByRole("heading", { name: "Cambiá tu contraseña" })).toBeVisible();

  await page.getByLabel("Contraseña provisoria actual").fill("Admin1234!");
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("NuevaAdmin1234!");
  await page.getByLabel("Repetí la nueva contraseña").fill("NuevaAdmin1234!");
  await page.getByRole("button", { name: "Guardar y continuar" }).click();

  await expect(page).toHaveURL(/\/admin\/estudiantes/);
  await expect(page.getByRole("heading", { name: "Estudiantes" })).toBeVisible();

  await page.goto("/cambiar-password");
  await expect(page).toHaveURL(/\/admin\/estudiantes/);
});

test("un estudiante no puede abrir /admin", async ({ page }) => {
  await login(page, "alumno.e2e@unla.edu.ar", "Alumno1234!");

  await expect(page).toHaveURL(/\/inicio/);
  await page.goto("/admin/estudiantes");
  await expect(page).toHaveURL(/\/inicio/);
});

test("un usuario desactivado no puede iniciar sesión", async ({ page }) => {
  await login(page, "inactivo.e2e@unla.edu.ar", "Alumno1234!");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();
});

test("credenciales inválidas muestran un mensaje genérico", async ({ page }) => {
  await login(page, "alumno.e2e@unla.edu.ar", "clave-incorrecta");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();
});
