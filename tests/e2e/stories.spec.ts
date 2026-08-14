import { test, expect, launchApp, openBrand, openTab } from "./fixtures";
import { mkdtempSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

test("Stories tab lists this brand's stories with pipeline status chips", async ({ page }) => {
  await openBrand(page, "minard");
  // Stories is the default tab; repo stories (all brand=minard) are listed.
  await expect(page.locator("[data-testid=story-krakatoa]")).toBeVisible();
  await expect(page.locator("[data-testid=story-krakatoa]")).toContainText("Krakatoa");

  // Krakatoa has timings.json and fully-resolved footage.
  await expect(page.locator("[data-testid=chip-voiceover-krakatoa]")).toHaveAttribute("data-on", "1");
  await expect(page.locator("[data-testid=chip-footage-krakatoa]")).toHaveAttribute("data-on", "1");
  await expect(page.locator("[data-testid=chip-rendered-krakatoa]")).toHaveAttribute("data-on", "0");

  // Another brand shows none of them.
  await openBrand(page, "steam");
  await expect(page.locator("[data-testid=stories-empty]")).toBeVisible();
});

test("story render round-trip: Render on a story lands in the brand Library", async ({ page }) => {
  await openBrand(page, "minard");
  await page.click("[data-testid=story-render-krakatoa]");
  await expect(page.locator("[data-testid=story-msg-krakatoa]")).toContainText("Rendered", { timeout: 30_000 });
  await expect(page.locator("[data-testid=chip-rendered-krakatoa]")).toHaveAttribute("data-on", "1");

  // The render is recorded as a project in this brand's Library.
  await openTab(page, "library");
  const item = page.locator("[data-testid=screen-library] .item", { hasText: "Krakatoa" });
  await expect(item).toBeVisible();
  await expect(item.getByRole("button", { name: "Reveal file" })).toBeVisible();

  // ...and not in another brand's Library.
  await openBrand(page, "steam");
  await openTab(page, "library");
  await expect(page.locator("[data-testid=screen-library] .item", { hasText: "Krakatoa" })).toHaveCount(0);
});

test("new story: template prefilled for the brand, JSON validated live, saved via story:save", async () => {
  // Hermetic: the story service writes into temp dirs, not the repo.
  const storiesDir = mkdtempSync(join(tmpdir(), "autovid-stories-"));
  const publicDir = mkdtempSync(join(tmpdir(), "autovid-public-"));
  const { app, page } = await launchApp({ storiesDir, publicDir });
  try {
    await openBrand(page, "minard");
    await expect(page.locator("[data-testid=stories-empty]")).toBeVisible();

    await page.click("[data-testid=story-new]");
    await expect(page.locator("[data-testid=story-editor]")).toBeVisible();

    // The template is prefilled with this brand and is valid.
    await expect(page.locator("[data-testid=story-json]")).toHaveValue(/"brand": "minard"/);
    await expect(page.locator("[data-testid=story-json-status]")).toContainText("Valid script");

    // Breaking the JSON flags it and disables save.
    await page.fill("[data-testid=story-json]", "{ not json");
    await expect(page.locator("[data-testid=story-json-status]")).toContainText("Not valid JSON");
    await expect(page.locator("[data-testid=story-save]")).toBeDisabled();

    // Restore a valid script, name it, save.
    await page.fill("[data-testid=story-json]", JSON.stringify({
      title: "E2E Story", brand: "minard", context: "2026 · E2E", status: "Data story",
      beats: [{ say: "Hello from the end to end test.", lines: ["Hello"], visual: { type: "statement" } }],
    }, null, 2));
    await expect(page.locator("[data-testid=story-json-status]")).toContainText("Valid script");
    await page.fill("[data-testid=story-slug]", "e2e-story");
    await page.click("[data-testid=story-save]");

    // The row appears; the script landed on disk in the temp dir.
    await expect(page.locator("[data-testid=story-e2e-story]")).toBeVisible();
    await expect(page.locator("[data-testid=story-e2e-story]")).toContainText("E2E Story");
    await expect(page.locator("[data-testid=chip-voiceover-e2e-story]")).toHaveAttribute("data-on", "0");
    expect(existsSync(join(storiesDir, "e2e-story", "script.json"))).toBe(true);
    expect(JSON.parse(readFileSync(join(storiesDir, "e2e-story", "script.json"), "utf8")).title).toBe("E2E Story");
    expect(existsSync(join(publicDir, "stories", "e2e-story"))).toBe(true);

    // Render is gated until a voiceover exists.
    await expect(page.locator("[data-testid=story-render-e2e-story]")).toBeDisabled();

    // Edit reopens the same script.
    await page.click("[data-testid=story-edit-e2e-story]");
    await expect(page.locator("[data-testid=story-editor]")).toContainText("e2e-story");
    await expect(page.locator("[data-testid=story-json]")).toHaveValue(/E2E Story/);
  } finally {
    await app.close();
  }
});
