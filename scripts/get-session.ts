import { chromium } from "@playwright/test";

async function main() {
  const base = process.env.CAPTURE_BASE_URL ?? "http://localhost:3001";
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${base}/login`);
  await page
    .getByLabel("Email")
    .fill(process.env.SEED_DEMO_EMAIL ?? "estudiante.demo@unla.edu.ar");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(process.env.SEED_DEMO_PASSWORD ?? "Demo1234!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/inicio/);

  const cookies = await context.cookies(base);
  const header = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  console.log(JSON.stringify({ Cookie: header }));
  console.log(await page.title());

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
