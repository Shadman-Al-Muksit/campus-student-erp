import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Capture only seeded fictional profiles. No browser account or personal data is used.
const destination = fileURLToPath(
  new URL("../../docs/screenshots/", import.meta.url),
);
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
});
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.BASE_URL ||
  "http://127.0.0.1:5173";
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const files = [];
const page = await context.newPage();
async function login(username) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page
    .getByLabel("Password", { exact: true })
    .fill(username === "admin" ? "CampusAdmin!2026" : "CampusDemo!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(username === "admin" ? "**/admin" : "**/dashboard");
  await page.locator(".stats-grid .stat").first().waitFor();
}
async function capture(filename) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".loading-state").waitFor({ state: "hidden" });
  await page.waitForTimeout(350);
  await page.screenshot({
    path: join(destination, filename),
    fullPage: true,
    animations: "disabled",
  });
  files.push(filename);
}
try {
  await login("student");
  await page.locator(".recharts-wrapper").first().waitFor();
  await capture("dashboard-en.png");
  await page
    .getByRole("button", { name: "Switch interface language", exact: true })
    .click();
  await page.waitForFunction(() => document.documentElement.lang === "bn");
  await capture("dashboard-bn.png");
  await page
    .getByRole("button", { name: "ইন্টারফেসের ভাষা বদলান", exact: true })
    .click();
  await page.goto("/progress");
  await page.locator("tbody tr").first().waitFor();
  await capture("degree-progress.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.locator(".recharts-wrapper").first().waitFor();
  await capture("dashboard-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL("**/login");
  await login("admin");
  await capture("administration.png");
  console.log(JSON.stringify({ directory: destination, files }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
