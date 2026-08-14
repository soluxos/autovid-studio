import { test, expect, openSettings } from "./fixtures";

test("settings shows live status and a default-brand control", async ({ page }) => {
  await openSettings(page);
  await expect(page.locator("[data-testid=stat-brands]")).toHaveText("6");   // Minard, Casefile, Interface, Steam, History, Editorial
  await expect(page.locator("[data-testid=stat-channels]")).toHaveText("3"); // seeded channels
  await expect(page.locator("[data-testid=stat-projects]")).toHaveText("0");
  await expect(page.locator("[data-testid=settings-active-brand]")).toBeVisible();
});
