import "./esbuild-env";   // must come first: sets ESBUILD_BINARY_PATH before esbuild loads
import { app, BrowserWindow, protocol, shell } from "electron";
import { join } from "path";
import { existsSync } from "fs";
import { registerIpc } from "./ipc";
import { startScheduler } from "./services/channels";
import { publicRoot } from "./services/stories";

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 720,
    backgroundColor: "#0e0e10", show: false,
    webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: false },
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });

  // AUTOVID_QA_SLUG boots the window straight into the text-overlap QA probe
  // (src/ui/QAProbe.tsx) — used by scripts/qa-story.mjs.
  const qaSlug = process.env.AUTOVID_QA_SLUG;
  if (process.env["ELECTRON_RENDERER_URL"]) win.loadURL(process.env["ELECTRON_RENDERER_URL"] + (qaSlug ? `#qa/${qaSlug}` : ""));
  else win.loadFile(join(__dirname, "../renderer/index.html"), qaSlug ? { hash: `qa/${qaSlug}` } : undefined);
  return win;
}

/** The in-app Remotion <Player> resolves staticFile() to root-absolute paths
 *  ("/stories/…", "/audio/…"). Under file:// those don't exist relative to the
 *  built renderer, and a failed <Img> is fatal to the Player (cancelRender) —
 *  which would break the preview and the QA probe. Fall back to the Remotion
 *  public dir for any file:// request that misses. */
function registerStaticFileFallback() {
  protocol.interceptFileProtocol("file", (request, callback) => {
    let p = decodeURIComponent(new URL(request.url).pathname);
    if (process.platform === "win32" && /^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
    if (!existsSync(p)) {
      const alt = join(publicRoot(), p);
      if (existsSync(alt)) return callback({ path: alt });
    }
    callback({ path: p });
  });
}

app.whenReady().then(() => {
  registerStaticFileFallback();
  registerIpc();
  createWindow();
  if (process.env.AUTOVID_NO_SCHEDULER !== "1") startScheduler();   // runs enabled channels while the app is open
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
