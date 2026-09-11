import path from "node:path";
import type { Page } from "@playwright/test";

export const PHOTO_PATH = path.join(__dirname, "fixtures", "test-photo.png");
export const VIDEO_PATH = path.join(__dirname, "fixtures", "test-video.mp4");

export async function registerAndLogin(page: Page, label: string): Promise<string> {
  const email = `e2e-${label}-${Date.now()}@example.com`;
  await page.goto("/register", { waitUntil: "networkidle" });
  await page.fill("#fullName", `E2E ${label}`);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  return email;
}

/** Walks the handover wizard, uploading whatever step is current until the finish button appears. */
export async function uploadAllRequiredSteps(page: Page) {
  await page.waitForSelector('input[type="file"]');
  for (let i = 0; i < 8; i++) {
    const finishVisible = await page
      .locator('button:has-text("Belgelerini Tamamla")')
      .isVisible()
      .catch(() => false);
    if (finishVisible) break;

    const heading = await page.locator("h2").first().innerText();
    const isVideoStep = heading.includes("video");
    await page.locator('input[type="file"]').setInputFiles(isVideoStep ? VIDEO_PATH : PHOTO_PATH);
    await page.waitForTimeout(500);
  }
}
