import { test, expect } from "@playwright/test";
import { launchApp } from "./fixtures";
import { statSync } from "fs";

// The one non-faked test: drives the real Remotion bundle + h264 encode through
// the IPC boundary and asserts a real file lands on disk. Slow (bundles once).
test("renders a real MP4 end to end via Remotion", async () => {
  test.setTimeout(180_000);
  const { app, page } = await launchApp({ fakeRender: false });
  try {
    const spec = {
      fps: 30, width: 480, height: 854, brand: "editorial", words: [],
      scenes: [
        { id: "s0", type: "intro", startSec: 0, endSec: 1.2, props: { kicker: "E2E", title: "Real\nrender", markerLine: "test.", sub: "" } },
        { id: "s1", type: "outro", startSec: 1.2, endSec: 2.2, props: { title: "Done", markerLine: "here.", cta: "Follow @e2e" } },
      ],
    };
    const outPath: string = await page.evaluate((s) => (window as any).api.render(s), spec);
    expect(outPath).toMatch(/\.mp4$/);
    expect(statSync(outPath).size).toBeGreaterThan(1000);

    // Also render the cinematic ("dispatch") kit end to end.
    const cine = {
      fps: 30, width: 480, height: 854, brand: "steam", kit: "cinematic", words: [],
      scenes: [
        { id: "c0", type: "opener", startSec: 0, endSec: 1.0, props: { kicker: "STEAM", title: "New\nreleases", sub: "this week", topLeft: "STEAM", topRight: "NEW", source: "placeholder", progressLabel: "steam" } },
        { id: "c1", type: "item", startSec: 1.0, endSec: 2.2, props: { kicker: "Roguelike", title: "Neon Tide", stat: { value: 88, label: "rating", suffix: "%" }, tags: ["PC", "$24.99"], topLeft: "NEW RELEASE", topRight: "OUT NOW", index: 1, total: 1, source: "placeholder gameplay", progressLabel: "neon-tide", seed: 2 } },
      ],
    };
    const cinePath: string = await page.evaluate((s) => (window as any).api.render(s), cine);
    expect(cinePath).toMatch(/\.mp4$/);
    expect(statSync(cinePath).size).toBeGreaterThan(1000);

    // And the bespoke "story" kit (Minard) — a short slice keeps it fast.
    const story = {
      fps: 30, width: 480, height: 854, brand: "minard", kit: "story", words: [],
      scenes: [{ id: "s0", type: "minard", startSec: 0, endSec: 2, props: {} }],
    };
    const storyPath: string = await page.evaluate((s) => (window as any).api.render(s), story);
    expect(storyPath).toMatch(/\.mp4$/);
    expect(statSync(storyPath).size).toBeGreaterThan(1000);
  } finally {
    await app.close();
  }
});
