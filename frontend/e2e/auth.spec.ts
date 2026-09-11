import { expect, test } from "@playwright/test";
import { registerAndLogin } from "./helpers";

test("register, edit profile, logout, log back in", async ({ page }) => {
  const email = await registerAndLogin(page, "auth");
  await expect(page.getByText("Panelim").first()).toBeVisible();

  await page.fill("#bio", "Written by the e2e suite.");
  await page.click('button:has-text("Kaydet")');
  await expect(page.getByText("Kaydedildi.")).toBeVisible();

  await page.click('button:has-text("Çıkış Yap")');
  await page.waitForURL("**/login");
  await expect(page.getByText("Giriş Yap").first()).toBeVisible();

  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Written by the e2e suite.")).toBeVisible();
});

test("wrong password is rejected with an inline error", async ({ page }) => {
  const email = await registerAndLogin(page, "wrongpw");
  await page.click('button:has-text("Çıkış Yap")');
  await page.waitForURL("**/login");

  await page.fill("#email", email);
  await page.fill("#password", "not-the-right-password");
  await page.click('button[type="submit"]');

  // Backend error strings aren't localized yet, so match on the actual English
  // message rather than assuming Turkish — the real check is that login failed
  // and the user stayed on /login instead of reaching the dashboard.
  await expect(page.locator("form")).toContainText(/invalid/i);
  await expect(page).toHaveURL(/\/login$/);
});
