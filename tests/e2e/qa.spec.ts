import { test, expect, openBrand } from "./fixtures";

// The text-overlap QA gate (story:qa): the QA button runs the probe in a
// hidden window (electron/services/qa.ts -> src/ui/QAProbe.tsx), which mounts
// the real Remotion Player for the story and measures every beat's text.
// Krakatoa is a repo story with committed timings, so this exercises the whole
// path: IPC -> hidden window -> #qa hash -> probe -> report back to the UI.
test("story QA: krakatoa passes the text-overlap probe", async ({ page }) => {
  await openBrand(page, "minard");
  await expect(page.locator("[data-testid=story-qa-krakatoa]")).toBeEnabled();
  await page.click("[data-testid=story-qa-krakatoa]");
  await expect(page.locator("[data-testid=story-msg-krakatoa]")).toContainText("QA passed", { timeout: 110_000 });
  await expect(page.locator("[data-testid=story-msg-krakatoa]")).toContainText("sample frames");
  // A clean QA never unlocks the override.
  await expect(page.locator("[data-testid=story-render-anyway-krakatoa]")).toHaveCount(0);
});
