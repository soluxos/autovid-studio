import { test as base, _electron, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Launch via the project ROOT (not out/main/index.js directly) so Electron reads
// package.json `main` and app.getAppPath() is the repo root — matching how `npm
// run dev` and the packaged app resolve paths (e.g. the Remotion render entry).
const ROOT = join(__dirname, "..", "..");

export interface LaunchOpts {
  fakeRender?: boolean;
  /** Point the story service at a temp dir (hermetic story:save tests). */
  storiesDir?: string;
  /** Point generated story media at a temp dir. */
  publicDir?: string;
  /** Reuse an existing userData dir (relaunch tests: does state persist?). */
  userDataDir?: string;
}

/** Launch the built Electron app against a throwaway userData dir (full test
 *  isolation). Scheduler is always off; renders are faked unless asked otherwise. */
export async function launchApp(opts: LaunchOpts = {}): Promise<{ app: ElectronApplication; page: Page; userDataDir: string }> {
  const userDataDir = opts.userDataDir ?? mkdtempSync(join(tmpdir(), "autovid-e2e-"));
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    AUTOVID_NO_SCHEDULER: "1",
    NODE_ENV: "production",
  };
  if (opts.fakeRender !== false) env.AUTOVID_FAKE_RENDER = "1";
  if (opts.storiesDir) env.AUTOVID_STORIES_DIR = opts.storiesDir;
  if (opts.publicDir) env.AUTOVID_PUBLIC_DIR = opts.publicDir;
  const app = await _electron.launch({ args: [ROOT, `--user-data-dir=${userDataDir}`], cwd: ROOT, env });
  const page = await app.firstWindow();
  await page.waitForSelector("[data-testid=app]", { timeout: 30_000 });
  return { app, page, userDataDir };
}

/** Default fixture: a fake-render app instance, fresh per test. */
export const test = base.extend<{ app: ElectronApplication; page: Page }>({
  app: async ({}, use) => {
    const { app } = await launchApp();
    await use(app);
    await app.close();
  },
  page: async ({ app }, use) => {
    await use(await app.firstWindow());
  },
});

export const expect = test.expect;

/** Select a brand in the sidebar and wait for its workspace. */
export const openBrand = async (page: Page, brandId: string) => {
  await page.click(`[data-testid=nav-brand-${brandId}]`);
  await page.waitForSelector(`[data-testid=workspace-${brandId}]`);
};

/** Switch to a tab (stories | channels | library | style) inside the open brand. */
export const openTab = async (page: Page, tab: string) => {
  await page.click(`[data-testid=tab-${tab}]`);
  await page.waitForSelector(`[data-testid=screen-${tab}]`);
};

export const openSettings = async (page: Page) => {
  await page.click("[data-testid=nav-settings]");
  await page.waitForSelector("[data-testid=screen-settings]");
};
