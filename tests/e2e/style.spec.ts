import { test, expect, openBrand, openTab } from "./fixtures";

test("Style tab edits a brand — palette, identity, voice, music and surfaces — and saves", async ({ page }) => {
  await openBrand(page, "minard");
  await openTab(page, "style");

  // Existing editor fields.
  await page.fill("[data-testid=hex-accent]", "#ff3ba7");
  await page.fill("[data-testid=publication]", "Arcade Weekly");
  await page.fill("[data-testid=handle]", "@arcade");

  // New BrandPreset fields: voice, music mood, surfaces.
  await page.fill("[data-testid=brand-voice]", "voice_abc123");
  await page.fill("[data-testid=brand-music]", "somber strings, slow");
  // Minard ships with all five surfaces on; toggle one off.
  await expect(page.locator("[data-testid=surface-newsprint]")).toBeChecked();
  await page.locator("[data-testid=surface-newsprint]").click();
  await expect(page.locator("[data-testid=surface-newsprint]")).not.toBeChecked();

  await page.click("[data-testid=brand-save]");
  await expect(page.locator("[data-testid=screen-style]")).toContainText("All changes saved");

  // Values survive leaving and returning to the tab (state round-trips the store).
  await openTab(page, "stories");
  await openTab(page, "style");
  await expect(page.locator("[data-testid=hex-accent]")).toHaveValue("#ff3ba7");
  await expect(page.locator("[data-testid=brand-voice]")).toHaveValue("voice_abc123");
  await expect(page.locator("[data-testid=brand-music]")).toHaveValue("somber strings, slow");
  await expect(page.locator("[data-testid=surface-newsprint]")).not.toBeChecked();
  await expect(page.locator("[data-testid=surface-parchment]")).toBeChecked();
  await expect(page.locator("[data-testid=brand-preview]")).toBeVisible();
});

test("brands are created from the sidebar, duplicated and deleted from Style", async ({ page }) => {
  // Five seeded brands.
  await expect(page.locator('[data-testid^="nav-brand-"]')).toHaveCount(6);

  // "+ New brand" creates one and jumps to its Style tab.
  await page.click("[data-testid=brand-new]");
  await expect(page.locator('[data-testid^="nav-brand-"]')).toHaveCount(7);
  await expect(page.locator("[data-testid=screen-style]")).toBeVisible();
  await page.fill("[data-testid=brand-name]", "Neon Arcade");
  await page.click("[data-testid=brand-save]");
  await expect(page.locator('[data-testid^="nav-brand-"]').filter({ hasText: "Neon Arcade" })).toBeVisible();

  // Duplicate it -> 7 brands, the copy is selected.
  await page.click("[data-testid=brand-duplicate]");
  await expect(page.locator('[data-testid^="nav-brand-"]')).toHaveCount(8);
  await expect(page.locator("[data-testid=brand-name]")).toHaveValue("Neon Arcade copy");

  // Delete the copy (accept the confirm dialog) -> back to 6.
  page.once("dialog", (d) => d.accept());
  await page.click("[data-testid=brand-delete]");
  await expect(page.locator('[data-testid^="nav-brand-"]')).toHaveCount(7);
});
