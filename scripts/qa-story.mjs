#!/usr/bin/env node
// Text-overlap QA driver: launches the BUILT app (npm run build first) with the
// window booted into the "#qa/<slug>" probe (src/ui/QAProbe.tsx), waits for
// window.__QA_RESULT, prints a report. Exit 1 on any overlapping text.
//
//   node scripts/qa-story.mjs <slug>
//
// The same probe backs the in-app story:qa IPC (electron/services/qa.ts) that
// gates the Stories tab Render button.
import { _electron } from "@playwright/test";
import { existsSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/qa-story.mjs <slug>"); process.exit(2); }
if (!existsSync(join(ROOT, "out", "main", "index.js"))) {
  console.error("No build found — run `npm run build` first.");
  process.exit(2);
}

const app = await _electron.launch({
  args: [ROOT, `--user-data-dir=${mkdtempSync(join(tmpdir(), "autovid-qa-"))}`],
  cwd: ROOT,
  env: { ...process.env, AUTOVID_NO_SCHEDULER: "1", AUTOVID_QA_SLUG: slug, NODE_ENV: "production" },
});

let result = null;
try {
  const page = await app.firstWindow();
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    result = await page.evaluate(() => window.__QA_RESULT ?? null).catch(() => null);
    if (result && result.done) break;
    await new Promise((r) => setTimeout(r, 400));
  }
} finally {
  await app.close().catch(() => {});
}

if (!result || !result.done) { console.error(`FAIL  ${slug}: QA probe timed out`); process.exit(1); }
if (result.error) { console.error(`FAIL  ${slug}: ${result.error}`); process.exit(1); }

const { overlaps, samples, boxCounts = [] } = result;
const boxes = boxCounts.reduce((a, b) => a + b, 0);
if (!overlaps.length) {
  console.log(`PASS  ${slug}: no overlapping text (${samples} sample frames, ${boxes} text boxes measured)`);
  process.exit(0);
}
console.error(`FAIL  ${slug}: ${overlaps.length} overlapping text pair(s) across ${samples} sample frames`);
for (const o of overlaps) {
  console.error(`  at ${o.time.toFixed(2).padStart(6)}s  "${o.textA}"  x  "${o.textB}"  (${o.overlapPx}px2 of overlap)`);
}
process.exit(1);
