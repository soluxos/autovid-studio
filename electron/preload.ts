import { contextBridge, ipcRenderer } from "electron";

const invoke = (ch: string, payload?: unknown) => ipcRenderer.invoke(ch, payload);
contextBridge.exposeInMainWorld("api", {
  getState: () => invoke("state:get"),
  saveBrand: (preset: unknown) => invoke("brand:save", preset),
  deleteBrand: (id: string) => invoke("brand:delete", { id }),
  setActiveBrand: (id: string) => invoke("brand:setActive", { id }),
  render: (spec: unknown, themeOverride?: unknown, meta?: unknown) => invoke("render:spec", { spec, themeOverride, meta }),
  saveChannel: (channel: unknown) => invoke("channel:save", channel),
  deleteChannel: (id: string) => invoke("channel:delete", { id }),
  setChannelEnabled: (id: string, enabled: boolean) => invoke("channel:setEnabled", { id, enabled }),
  runChannel: (id: string) => invoke("channel:run", { id }),
  storyList: () => invoke("story:list"),
  storyGet: (slug: string) => invoke("story:get", { slug }),
  storySave: (slug: string, json: string) => invoke("story:save", { slug, json }),
  storyGetTimings: (slug: string) => invoke("story:timings", { slug }),
  storyGenerate: (slug: string) => invoke("story:generate", { slug }),
  storyQa: (slug: string) => invoke("story:qa", { slug }),
  storyFootage: (slug: string) => invoke("story:footage", { slug }),
  storyRender: (slug: string) => invoke("story:render", { slug }),
  keysStatus: () => invoke("keys:status"),
  keysSave: (keys: unknown) => invoke("keys:save", { keys }),
  pickMedia: () => invoke("media:pick"),
  openPath: (p: string) => invoke("path:open", { path: p }),
});
