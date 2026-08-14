import { BrowserWindow } from "electron";
import { join } from "path";

// story:qa — the text-overlap QA gate, run entirely inside the app.
//
// IMPLEMENTATION CHOICE (of the two allowed): the main process opens a HIDDEN
// BrowserWindow on the renderer's "#qa/<slug>" hash (src/ui/QAProbe.tsx mounts
// the same Remotion <Player> composition that story:render encodes, steps
// sample times through every beat and measures the player DOM) and polls
// window.__QA_RESULT via executeJavaScript. Chosen because it is verifiable
// end-to-end from the E2E suite and needs no second process; the Stories tab
// Render button calls this before story:render and refuses on overlaps.
// scripts/qa-story.mjs is the CLI twin (visible window via Playwright).

export interface QaOverlap { time: number; textA: string; textB: string; overlapPx: number }
export interface QaOutcome { pass: boolean; samples: number; overlaps: QaOverlap[] }

const QA_TIMEOUT_MS = 150_000;

export async function qaStory(slug: string): Promise<QaOutcome> {
  if (!/^[a-z0-9_][a-z0-9-_]*$/.test(slug)) throw new Error("Bad story name.");
  const win = new BrowserWindow({
    show: false,
    width: 560, height: 1040,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      // hidden windows must keep painting/ticking or the probe's rAF stalls
      backgroundThrottling: false,
    },
  });
  try {
    if (process.env["ELECTRON_RENDERER_URL"]) await win.loadURL(process.env["ELECTRON_RENDERER_URL"] + `#qa/${slug}`);
    else await win.loadFile(join(__dirname, "../renderer/index.html"), { hash: `qa/${slug}` });
    const deadline = Date.now() + QA_TIMEOUT_MS;
    for (;;) {
      const r = await win.webContents.executeJavaScript("window.__QA_RESULT ?? null", true);
      if (r && r.done) {
        if (r.error) throw new Error(`QA probe failed: ${r.error}`);
        const overlaps: QaOverlap[] = r.overlaps ?? [];
        return { pass: overlaps.length === 0, samples: r.samples ?? 0, overlaps };
      }
      if (Date.now() > deadline) throw new Error("QA probe timed out.");
      await new Promise((res) => setTimeout(res, 350));
    }
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
