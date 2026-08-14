import { ipcMain, dialog, shell } from "electron";
import { store, type AppState } from "./services/store";
import { renderSpec } from "./services/render";
import { runChannel, reschedule } from "./services/channels";
import { listStories, getStory, getStoryTimings, saveStory, generateStory, fetchFootage, renderStory } from "./services/stories";
import { qaStory } from "./services/qa";
import { keyStatus } from "./services/keys";

/** Story handlers serialize failures back as { ok:false, error } so the UI can
 *  show them inline (a thrown IPC error arrives wrapped and unreadable). */
const safe = <T extends object>(fn: (payload: any) => T | Promise<T>) =>
  async (_e: unknown, payload?: any) => {
    try { return { ok: true as const, ...(await fn(payload)) }; }
    catch (e: any) { return { ok: false as const, error: e?.message ?? String(e) }; }
  };

/** Raw API keys never cross to the renderer — it gets the masked keyStatus()
 *  instead, so strip settings.keys from every state payload we hand back. */
const publicState = (s: AppState) => { const { keys, ...settings } = s.settings; return { ...s, settings }; };

export function registerIpc() {
  ipcMain.handle("state:get", () => publicState(store.get()));
  ipcMain.handle("brand:save", (_e, preset) => publicState(store.saveBrand(preset)));
  ipcMain.handle("brand:delete", (_e, { id }) => publicState(store.deleteBrand(id)));
  ipcMain.handle("brand:setActive", (_e, { id }) => publicState(store.setActiveBrand(id)));
  ipcMain.handle("render:spec", async (_e, { spec, themeOverride, meta }) => {
    const out = await renderSpec(spec, themeOverride);
    // Every render is recorded so it shows up in the Library.
    store.addProject({
      id: "p_" + Date.now(),
      title: meta?.title || "Untitled video",
      brand: spec?.brand ?? "editorial",
      template: meta?.template,
      createdAt: Date.now(),
      output: out,
      spec,
    });
    return out;
  });
  ipcMain.handle("channel:save", (_e, channel) => { const r = store.saveChannel(channel); reschedule(); return publicState(r); });
  ipcMain.handle("channel:delete", (_e, { id }) => { const r = store.deleteChannel(id); reschedule(); return publicState(r); });
  ipcMain.handle("channel:setEnabled", (_e, { id, enabled }) => { const r = store.setChannelEnabled(id, enabled); reschedule(); return publicState(r); });
  ipcMain.handle("channel:run", (_e, { id }) => runChannel(id));
  ipcMain.handle("story:list", safe(() => ({ stories: listStories() })));
  ipcMain.handle("story:get", safe(({ slug }) => ({ json: getStory(slug) })));
  ipcMain.handle("story:save", safe(({ slug, json }) => saveStory(slug, json)));
  ipcMain.handle("story:timings", safe(({ slug }) => ({ timings: getStoryTimings(slug) })));
  ipcMain.handle("story:generate", safe(({ slug }) => generateStory(slug)));
  ipcMain.handle("story:qa", safe(({ slug }) => qaStory(slug)));
  ipcMain.handle("story:footage", safe(({ slug }) => fetchFootage(slug)));
  ipcMain.handle("story:render", safe(({ slug }) => renderStory(slug)));
  // API keys: only the masked status ever leaves the main process.
  ipcMain.handle("keys:status", safe(() => ({ status: keyStatus() })));
  ipcMain.handle("keys:save", safe(({ keys }) => { store.setKeys(keys ?? {}); return { status: keyStatus() }; }));
  ipcMain.handle("media:pick", async () => {
    const r = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "Media", extensions: ["mp4", "mov", "webm", "png", "jpg", "jpeg", "webp"] }] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle("path:open", (_e, { path }) => shell.showItemInFolder(path));
}
