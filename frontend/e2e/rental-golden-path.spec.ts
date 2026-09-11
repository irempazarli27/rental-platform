import { expect, test } from "@playwright/test";
import { registerAndLogin, uploadAllRequiredSteps } from "./helpers";

test("full rental lifecycle: list, request, accept, handover both ways, review", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const renterContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const renterPage = await renterContext.newPage();

  await test.step("register both participants", async () => {
    await registerAndLogin(ownerPage, "golden-owner");
    await registerAndLogin(renterPage, "golden-renter");
  });

  let itemUrl = "";
  await test.step("owner creates a listing", async () => {
    await ownerPage.goto("/items/new", { waitUntil: "networkidle" });
    await ownerPage.fill("#item-title", "E2E Golden Path Camera");
    await ownerPage.fill("#item-description", "Created by the automated end-to-end suite.");
    await ownerPage.selectOption("#item-category", { index: 1 });
    await ownerPage.fill("#item-daily-price", "100");
    await ownerPage.fill("#item-deposit", "250");
    await ownerPage.click('button:has-text("Yayınla")');
    await ownerPage.waitForURL(/\/items\/[0-9a-f-]+$/);
    itemUrl = ownerPage.url();
  });

  let rentalUrl = "";
  await test.step("renter requests the rental and owner accepts", async () => {
    await renterPage.goto(itemUrl, { waitUntil: "networkidle" });
    await renterPage.waitForSelector("#rental-start");
    await renterPage.fill("#rental-start", "2029-01-10");
    await renterPage.fill("#rental-end", "2029-01-11");
    await renterPage.click('button:has-text("Kiralama Talebi Gönder")');
    await renterPage.waitForURL(/\/dashboard\/rentals\/[0-9a-f-]+$/);
    rentalUrl = renterPage.url();

    await ownerPage.goto(rentalUrl, { waitUntil: "networkidle" });
    await ownerPage.click('button:has-text("Kabul Et")');
    await expect(ownerPage.getByText("Teslim Belgelerini Doldur")).toBeVisible();
  });

  await test.step("owner documents pickup, renter confirms receipt", async () => {
    await ownerPage.click("text=Teslim Belgelerini Doldur");
    await ownerPage.waitForURL(/\/handover\/pickup$/);
    await uploadAllRequiredSteps(ownerPage);
    await ownerPage.click('button:has-text("Teslim Belgelerini Tamamla")');
    await ownerPage.waitForURL(rentalUrl);
    await expect(ownerPage.getByText("Teslime Hazır")).toBeVisible();

    await renterPage.goto(rentalUrl, { waitUntil: "networkidle" });
    await expect(renterPage.getByText("Teslime Hazır")).toBeVisible();
    await renterPage.click('button:has-text("Teslim Aldım, Onaylıyorum")');
    await expect(renterPage.getByText("Aktif")).toBeVisible();
  });

  await test.step("renter documents return, owner confirms", async () => {
    await renterPage.click("text=İade Belgelerini Doldur");
    await renterPage.waitForURL(/\/handover\/return$/);
    await uploadAllRequiredSteps(renterPage);
    await renterPage.click('button:has-text("İade Belgelerini Tamamla")');
    await renterPage.waitForURL(rentalUrl);
    await expect(renterPage.getByText("İade Bekleniyor")).toBeVisible();

    await ownerPage.goto(rentalUrl, { waitUntil: "networkidle" });
    // Pickup and return galleries should be visible side by side for comparison.
    await expect(ownerPage.getByText("Teslim Belgeleri")).toBeVisible();
    await expect(ownerPage.getByText("İade Belgeleri")).toBeVisible();
    await ownerPage.click('button:has-text("İadeyi Onaylıyorum")');
    await expect(ownerPage.getByText("Tamamlandı").first()).toBeVisible();
  });

  await test.step("renter leaves a review that stays hidden from the owner until they review too", async () => {
    await renterPage.goto(rentalUrl, { waitUntil: "networkidle" });
    await renterPage.locator('button[aria-label="5 yıldız"]').click();
    await renterPage.click('button:has-text("Değerlendirmeyi Gönder")');
    await expect(renterPage.getByText("Senin değerlendirmen")).toBeVisible();

    await ownerPage.goto(rentalUrl, { waitUntil: "networkidle" });
    await expect(ownerPage.getByText("Karşı taraf değerlendirme yaptı")).toBeVisible();

    await ownerPage.locator('button[aria-label="4 yıldız"]').click();
    await ownerPage.click('button:has-text("Değerlendirmeyi Gönder")');
    await expect(ownerPage.getByText("Karşı tarafın değerlendirmesi")).toBeVisible();
  });

  await ownerContext.close();
  await renterContext.close();
});
