import { test, expect } from "@playwright/test";
import { launchApp, openSettings } from "./fixtures";

// The suite launches the app with the repo as its app path, so the developer's
// own .env.local IS visible — a key can legitimately start out "From .env.local".
// Assert on the saved-in-Settings transition, never on an absolute "Not set".
const FAKE = "test-not-a-real-key-9244";

test("API keys can be saved in Settings, persist across a relaunch, and cleared", async () => {
  const first = await launchApp();
  const { userDataDir } = first;
  try {
    await openSettings(first.page);
    const status = (p: typeof first.page, id: string) => p.locator(`[data-testid=key-status-${id}]`);

    // Both providers report a status before anything is typed.
    await expect(status(first.page, "elevenlabs")).toBeVisible();
    await expect(status(first.page, "pexels")).toBeVisible();
    await expect(status(first.page, "elevenlabs")).not.toHaveText("Saved");
    const elevenBefore = await status(first.page, "elevenlabs").textContent();

    // Save a fake key -> badge flips to Saved, placeholder masks to the last 4.
    await first.page.fill("[data-testid=key-elevenlabs]", FAKE);
    await first.page.click("[data-testid=keys-save]");
    await expect(status(first.page, "elevenlabs")).toHaveText("Saved");
    await expect(first.page.locator("[data-testid=key-elevenlabs]")).toHaveAttribute("placeholder", "••••9244");
    // The input is cleared after saving, and the raw key is never in the DOM.
    await expect(first.page.locator("[data-testid=key-elevenlabs]")).toHaveValue("");
    expect(await first.page.content()).not.toContain(FAKE);
    // Saving one key must not disturb the other.
    const pexelsBefore = await status(first.page, "pexels").textContent();
    await first.app.close();

    // Relaunch against the same userData dir: the key persisted.
    const second = await launchApp({ userDataDir });
    try {
      await openSettings(second.page);
      await expect(status(second.page, "elevenlabs")).toHaveText("Saved");
      await expect(second.page.locator("[data-testid=key-elevenlabs]")).toHaveAttribute("placeholder", "••••9244");
      expect(await status(second.page, "pexels").textContent()).toBe(pexelsBefore);

      // Clear puts it back to whatever the environment supplies (or Not set).
      await second.page.click("[data-testid=key-clear-elevenlabs]");
      await expect(status(second.page, "elevenlabs")).not.toHaveText("Saved");
      await expect(status(second.page, "elevenlabs")).toHaveText(/Not set|From \.env\.local/);
      // back to exactly the pre-save state, whatever the environment supplies
      expect(await status(second.page, "elevenlabs").textContent()).toBe(elevenBefore);
    } finally {
      await second.app.close();
    }
  } catch (e) {
    await first.app.close().catch(() => {});
    throw e;
  }
});
