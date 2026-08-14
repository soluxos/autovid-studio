import { test, expect, openBrand, openTab, openSettings } from "./fixtures";

test("app boots into the default brand and every tab is reachable", async ({ page }) => {
  await expect(page.locator("[data-testid=app]")).toBeVisible();

  // Sidebar lists the four seeded brands plus "+ New brand".
  for (const id of ["minard", "steam", "history", "editorial"]) {
    await expect(page.locator(`[data-testid=nav-brand-${id}]`)).toBeVisible();
  }
  await expect(page.locator("[data-testid=brand-new]")).toBeVisible();

  // Default brand (minard) opens on its Stories tab.
  await expect(page.locator("[data-testid=workspace-minard]")).toBeVisible();
  await expect(page.locator("[data-testid=screen-stories]")).toBeVisible();

  // Every tab of the brand workspace renders.
  for (const tab of ["channels", "library", "style", "stories"]) {
    await openTab(page, tab);
  }

  // Another brand's workspace and Settings are reachable.
  await openBrand(page, "editorial");
  await expect(page.locator("[data-testid=screen-stories]")).toBeVisible();
  await openSettings(page);
  await expect(page.locator("[data-testid=screen-settings]")).toBeVisible();
});
