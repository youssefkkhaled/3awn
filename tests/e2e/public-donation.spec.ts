import { expect, test } from "@playwright/test";

const runE2E = process.env.RUN_E2E === "true";

test.describe("public donation flow", () => {
  test.skip(!runE2E, "Set RUN_E2E=true to exercise the local SQLite-backed app in a real browser.");

  test("meals donation flow updates the projected total", async ({ page }) => {
    await page.goto("/");

    const initialCount = await page.locator(".meal-counter").first().textContent();

    await page.getByRole("button", { name: "🤲 تبرع الآن" }).click();
    await page.getByRole("button", { name: "وجبات للغد" }).click();
    await page.getByRole("button", { name: "متابعة ←" }).click();
    await page.getByRole("button", { name: "✓ تأكيد الدفع" }).click();

    await expect(page.getByText("جزاك الله خيرًا")).toBeVisible();
    await expect(page.locator(".meal-counter").first()).not.toHaveText(initialCount ?? "");
  });

  test("amount donation flow shows the monthly summary copy", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "🤲 تبرع الآن" }).click();
    await page.getByRole("button", { name: "مبلغ للشهر" }).click();
    await page.getByPlaceholder(/المبلغ بالجنيه/).fill("850");
    await page.getByRole("button", { name: "متابعة ←" }).click();
    await expect(page.getByText("طوال شهر رمضان")).toBeVisible();
  });
});
