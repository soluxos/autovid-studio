import { test, expect, openBrand, openTab } from "./fixtures";

test("channels are scoped per brand; create, schedule, run and delete inside a brand", async ({ page }) => {
  await openBrand(page, "minard");
  await openTab(page, "channels");

  // Only minard's seeded channel is listed (steam/editorial channels are hidden).
  await expect(page.locator("[data-testid=screen-channels] .item")).toHaveCount(1);
  await expect(page.locator("[data-testid=channel-ch_minard]")).toBeVisible();
  await expect(page.locator("[data-testid=channel-ch_steam]")).toHaveCount(0);

  // New channel: pre-bound to this brand, so there is no brand picker.
  await page.click("[data-testid=channel-new]");
  await expect(page.locator("[data-testid=channel-editor]")).toBeVisible();
  await expect(page.locator("[data-testid=channel-brand]")).toHaveCount(0);
  await expect(page.locator("[data-testid=channel-editor]")).toContainText("Field Notes (History)");
  await page.fill("[data-testid=channel-name]", "E2E Channel");

  // Pick a schedule preset -> human-readable description updates.
  await page.getByRole("button", { name: "Weekly — Monday 07:00" }).click();
  await expect(page.locator("[data-testid=cron-desc]")).toContainText("Weekly");
  await expect(page.locator("[data-testid=channel-cron]")).toHaveValue("0 7 * * 1");

  await page.click("[data-testid=channel-save]");

  // It shows up in this brand's list.
  const item = page.locator(".item", { hasText: "E2E Channel" });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Weekly");

  // ...but not in another brand's Channels tab.
  await openBrand(page, "steam");
  await openTab(page, "channels");
  await expect(page.locator(".item", { hasText: "E2E Channel" })).toHaveCount(0);
  await expect(page.locator("[data-testid=channel-ch_steam]")).toBeVisible();
  await openBrand(page, "minard");
  await openTab(page, "channels");

  // Run now -> fake render completes quickly.
  await item.getByRole("button", { name: "Run now" }).click();
  await expect(item).toContainText("Rendered.", { timeout: 30_000 });

  // Pause/enable toggles.
  await item.getByRole("button", { name: "Enable" }).click();
  await expect(item).toContainText("Live");

  // Delete via the editor (accept confirm).
  await item.getByRole("button", { name: "Edit" }).click();
  page.once("dialog", (d) => d.accept());
  await page.click("[data-testid=channel-delete]");
  await expect(page.locator(".item", { hasText: "E2E Channel" })).toHaveCount(0);
});

test("invalid cron is flagged and blocks saving", async ({ page }) => {
  await openBrand(page, "minard");
  await openTab(page, "channels");
  await page.click("[data-testid=channel-new]");
  await page.fill("[data-testid=channel-cron]", "not a cron");
  await expect(page.locator("[data-testid=cron-desc]")).toContainText(/not a valid/i);
  await expect(page.locator("[data-testid=channel-save]")).toBeDisabled();
});
