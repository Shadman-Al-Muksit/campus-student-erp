import { test, expect, type Page } from "@playwright/test";

async function login(
  page: Page,
  role: "student" | "admin" | "study_a" | "study_b" = "student",
) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(role);
  await page
    .getByLabel("Password", { exact: true })
    .fill(role === "admin" ? "CampusAdmin!2026" : "CampusDemo!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(role === "admin" ? /\/admin$/ : /\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("student dashboard uses real records and opens matching progress categories", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Your academic journey", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Credit completion", exact: true }),
  ).toBeVisible();
  const dashboard = await page.request
    .get("/api/v1/me/dashboard/")
    .then((r) => r.json());
  await page
    .locator(".chart-legend")
    .getByRole("link")
    .filter({ hasText: "In progress" })
    .click();
  await expect(page).toHaveURL(/\/progress\?status=in_progress/);
  await expect(
    page.getByRole("button", { name: /In progress/ }),
  ).toHaveAttribute("aria-pressed", "true");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(
    dashboard.progress.courses.filter(
      (c: { status: string }) => c.status === "in_progress",
    ).length,
  );
  await page.getByRole("button", { name: /^Completed/ }).click();
  await expect(rows).toHaveCount(dashboard.progress.completed_courses);
});

test("all student service destinations render and expose no API failure", async ({
  page,
}) => {
  await login(page);
  for (const path of [
    "/courses",
    "/registration",
    "/routine",
    "/results",
    "/attendance",
    "/fees",
    "/notices",
    "/admit-card",
    "/profile",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    await expect(page.locator(".error-state")).toHaveCount(0);
  }
});

test("navigation helper supports known, ambiguous and unsupported questions", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Open campus guide", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Campus guide", exact: true });
  await panel.getByLabel("Ask a navigation question").fill("quantum pizza");
  await panel
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(
    panel.getByText("I can help with the topics below. Please choose one."),
  ).toBeVisible();
  await panel.getByLabel("Ask a navigation question").fill("routine and fees");
  await panel
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(
    panel.getByText("I found a few matching topics. Which one did you mean?"),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Where is my class routine?", exact: true })
    .click();
  await expect(panel.getByText("Academics → Class routine")).toBeVisible();
  await panel
    .getByRole("link", { name: "Open Class routine", exact: true })
    .click();
  await expect(page).toHaveURL(/\/routine$/);
});

test("Bangla navigation, helper and document labels work together", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Switch interface language", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await page
    .getByRole("button", { name: "ক্যাম্পাস গাইড খুলুন", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "ক্যাম্পাস গাইড", exact: true });
  await panel
    .getByLabel("নেভিগেশন সম্পর্কে প্রশ্ন করুন")
    .fill("আমার প্রবেশপত্র কোথায়?");
  await panel.getByRole("button", { name: "প্রশ্ন পাঠান", exact: true }).click();
  await panel.getByRole("link", { name: "প্রবেশপত্র খুলুন", exact: true }).click();
  await expect(page).toHaveURL(/\/admit-card$/);
  await expect(
    page.getByRole("heading", { name: "প্রবেশপত্র", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText("নমুনা — বিশ্ববিদ্যালয়ের আনুষ্ঠানিক নথি নয়"),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
});

test("basic study view retains the same information without charts or helper", async ({
  page,
}) => {
  await login(page, "study_a");
  await page.goto("/study");
  const basic = page.locator(".study-mode").filter({
    has: page.getByRole("heading", { name: "Basic view", exact: true }),
  });
  await basic
    .getByRole("button", { name: "Use this view", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Back to overview", exact: true })
    .click();
  await expect(page.locator(".baseline-banner")).toContainText("Basic view");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open campus guide", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("columnheader", {
      name: "Credits still to earn",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .locator(".academic-progress")
    .getByRole("link", { name: "View details", exact: true })
    .click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("expired sessions return to sign-in and staff pages reject students", async ({
  page,
  context,
}) => {
  await login(page);
  const forbidden = await page.request.get("/api/v1/admin/overview/");
  expect(forbidden.status()).toBe(403);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await context.clearCookies();
  await page.goto("/courses");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("mobile navigation and charts stay within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(
    page.getByRole("progressbar", { name: "Credit completion", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Degree progress", exact: true })
    .click();
  await expect(page).toHaveURL(/\/progress$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("administrator records a demo invoice and partial payment with audit history", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("button", { name: "Financial records", exact: true })
    .click();
  const invoiceForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Create invoice", exact: true }),
  });
  const reference = `E2E-${Date.now()}`;
  await invoiceForm
    .locator("select[name=student_id]")
    .selectOption({ index: 1 });
  await invoiceForm.locator("input[name=reference]").fill(reference);
  await invoiceForm
    .locator("input[name=description]")
    .fill("Browser verification — fictional fee");
  await invoiceForm.locator("input[name=amount]").fill("150.50");
  await invoiceForm
    .locator("input[name=due_date]")
    .fill(new Date(Date.now() + 86400_000).toISOString().slice(0, 10));
  const invoiceResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/admin/invoices/") &&
      r.request().method() === "POST",
  );
  await invoiceForm
    .getByRole("button", { name: "Create invoice", exact: true })
    .click();
  const invoice = await (await invoiceResponse).json();
  const row = page.getByRole("row").filter({ hasText: reference });
  await expect(row).toBeVisible();
  const paymentForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Record payment", exact: true }),
  });
  await paymentForm
    .locator("select[name=invoice_id]")
    .selectOption(String(invoice.id));
  await paymentForm.locator("input[name=reference]").fill(`${reference}-PAY`);
  await paymentForm.locator("input[name=amount]").fill("40.25");
  await paymentForm
    .locator("input[name=date]")
    .fill(new Date().toISOString().slice(0, 10));
  const paymentResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/admin/payments/") &&
      r.request().method() === "POST",
  );
  await paymentForm
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  expect((await paymentResponse).ok()).toBe(true);
  await expect(row).toContainText("110.25");
  await page
    .getByRole("button", { name: "Audit history", exact: true })
    .click();
  await expect(page.locator("tbody")).toContainText(reference);
});
