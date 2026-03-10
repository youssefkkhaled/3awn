import { expect, test } from "@playwright/test";

const runE2E = process.env.RUN_E2E === "true";

test.describe("admin flows", () => {
  test.skip(!runE2E, "Set RUN_E2E=true with local admin credentials to run the browser admin checks.");

  test("settings updates are reflected on the public page", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("اسم المستخدم").fill(
      process.env.E2E_ADMIN_USERNAME ?? process.env.E2E_ADMIN_EMAIL ?? "",
    );
    await page.getByLabel("كلمة المرور").fill(process.env.E2E_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "دخول الإدارة" }).click();
    await page.getByRole("link", { name: "الإعدادات" }).click();
    await page.getByLabel("عنوان الصفحة").fill("عنوان اختبار الإدارة");
    await page.getByRole("button", { name: "حفظ الإعدادات" }).click();

    await page.goto("/");
    await expect(page.getByText("عنوان اختبار الإدارة")).toBeVisible();
  });

  test("voiding a donation reduces the visible shared totals", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("اسم المستخدم").fill(
      process.env.E2E_ADMIN_USERNAME ?? process.env.E2E_ADMIN_EMAIL ?? "",
    );
    await page.getByLabel("كلمة المرور").fill(process.env.E2E_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "دخول الإدارة" }).click();
    await page.getByRole("link", { name: "التبرعات" }).click();

    const firstTextarea = page.locator("textarea[name='reason']").first();
    await firstTextarea.fill("إلغاء اختباري");
    await page.getByRole("button", { name: "إلغاء التبرع" }).first().click();

    await expect(page.getByText("تم إلغاء التبرع بنجاح.")).toBeVisible();
  });
});
