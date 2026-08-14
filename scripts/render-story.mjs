// Render a generated story. Usage:
//   node scripts/render-story.mjs <story>
// Builds a spec (kit "story", scene "doc") embedding the script + timings, then
// renders it through the app's real Remotion pipeline. Run gen-video.mjs first.
import { _electron } from "@playwright/test";
import { readFileSync, mkdtempSync, copyFileSync, existsSync } from "fs";
import { tmpdir, homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
if (!name) { console.error("usage: node scripts/render-story.mjs <story>"); process.exit(1); }
const SRC = join(ROOT, "src/stories", name);
const script = JSON.parse(readFileSync(join(SRC, "script.json"), "utf8"));
const timings = JSON.parse(readFileSync(join(SRC, "timings.json"), "utf8"));

// Brand themes, keyed by script.brand (fallback: minard). Tokens mirror the
// app store's DEFAULT_BRANDS (electron/services/store.ts).
const THEMES = {
  // the parchment "Field Notes" look (same tokens as the Minard brand)
  minard: {
    paper: "#F1E9D6", card: "#F7F1E2", ink: "#221B12", ink2: "#6E5F49", line: "#D8CBB0",
    accent: "#B23A2E", accentInk: "#FFF7EA", tint: "#E8DCC2",
    fontDisplay: "Fraunces", fontUi: "Work Sans", fontMono: "Space Mono",
    radius: 4, durSec: 0.5, stepSec: 0.08, motionScale: 1, scrim: 0.5,
    publication: "Field Notes", edition: script.context || "", handle: "@fieldnotes",
  },
  // dark slate "evidence board" for true-crime/investigation stories
  casefile: {
    paper: "#14171D", card: "#1A1E26", ink: "#EAE4D6", ink2: "#8F959E", line: "#2A2F39",
    accent: "#C2413B", accentInk: "#F8EFE1", tint: "#1F242E",
    fontDisplay: "Fraunces", fontUi: "Work Sans", fontMono: "Space Mono",
    radius: 4, durSec: 0.5, stepSec: 0.08, motionScale: 1, scrim: 0.85,
    publication: "Case File", edition: script.context || "", handle: "@casefile",
  },
  // design-studio brand for UI/UX explainers: cool studio paper, electric indigo
  interface: {
    paper: "#EFF0EA", card: "#FAFAF6", ink: "#16181D", ink2: "#6B7080", line: "#D6D8CF",
    accent: "#4B3BFF", accentInk: "#F4F3FF", tint: "#E4E5DD",
    fontDisplay: "Archivo", fontUi: "Inter", fontMono: "JetBrains Mono",
    radius: 10, durSec: 0.45, stepSec: 0.08, motionScale: 0.95, scrim: 0.5,
    publication: "Interface", edition: script.context || "", handle: "@interface",
  },
  // clean minimal light look: near-white paper, near-black ink, cool accent
  ledger: {
    paper: "#F7F7F4", card: "#FFFFFF", ink: "#17181C", ink2: "#6A6D76", line: "#DDDDD6",
    accent: "#2F4BF0", accentInk: "#F4F6FF", tint: "#ECECE6",
    fontDisplay: "Archivo", fontUi: "Inter", fontMono: "JetBrains Mono",
    radius: 6, durSec: 0.5, stepSec: 0.08, motionScale: 1, scrim: 0.5,
    publication: "The Ledger", edition: script.context || "", handle: "@theledger",
  },
};
const THEME = THEMES[script.brand] || THEMES.minard;

const spec = {
  fps: 30, width: 1080, height: 1920, brand: script.brand || "minard", kit: "story",
  audioSrc: `stories/${name}/narration.mp3`, musicSrc: `audio/beds/${script.mood ?? "warm"}.mp3`, words: [],
  scenes: [{ id: "s0", type: "doc", startSec: 0, endSec: timings.total + 1.8, props: { script, timings } }],
};

const app = await _electron.launch({ args: [ROOT, `--user-data-dir=${mkdtempSync(join(tmpdir(), "story-"))}`], cwd: ROOT, env: { ...process.env, AUTOVID_NO_SCHEDULER: "1", NODE_ENV: "production" } });
const page = await app.firstWindow();
await page.waitForSelector("[data-testid=app]");
console.log(`rendering ${name} (${timings.total.toFixed(1)}s)...`);
const out = await page.evaluate(({ spec, theme }) => window.api.render(spec, theme, { title: spec.scenes[0].props.script.title, template: "story-doc" }), { spec, theme: THEME });
await app.close();

const dest = join(homedir(), "Downloads", `${name}.mp4`);
copyFileSync(out, dest);
console.log("rendered:", out);
console.log("saved to:", dest);
