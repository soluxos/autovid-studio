import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import type { BrandPreset, Theme } from "../../src/engine/types";
import { EDITORIAL_THEME } from "../../src/brands/editorial/tokens";

// Two brands on the cinematic ("dispatch") kit, defined as plain data.
const STEAM_THEME: Theme = {
  paper: "#0B0D14", card: "#12151F", ink: "#FFFFFF", ink2: "#9FB2C8", line: "#232A3A",
  accent: "#48C6FF", accentInk: "#041019", tint: "#12233A",
  fontDisplay: "Space Grotesk", fontUi: "Sora", fontMono: "JetBrains Mono",
  radius: 14, durSec: 0.5, stepSec: 0.08, motionScale: 0.9, scrim: 0.85,
  publication: "New on Steam", edition: "New Releases", handle: "@newonsteam",
};
const HISTORY_THEME: Theme = {
  paper: "#EFE7D6", card: "#F6EFE0", ink: "#2A2118", ink2: "#6B5D47", line: "#D8CBB0",
  accent: "#9A6B2F", accentInk: "#FFFDF7", tint: "#E7DCC4",
  fontDisplay: "Fraunces", fontUi: "Work Sans", fontMono: "Space Mono",
  radius: 6, durSec: 0.55, stepSec: 0.09, motionScale: 1.1, scrim: 0.5,
  publication: "Field Notes", edition: "History", handle: "@fieldnotes",
};
// Case File: dark slate "evidence board" for true-crime/investigation stories
// (the dahmer story's brand). Ink flips light via pickInk; red accent.
const CASEFILE_THEME: Theme = {
  paper: "#14171D", card: "#1A1E26", ink: "#EAE4D6", ink2: "#8F959E", line: "#2A2F39",
  accent: "#C2413B", accentInk: "#F8EFE1", tint: "#1F242E",
  fontDisplay: "Fraunces", fontUi: "Work Sans", fontMono: "Space Mono",
  radius: 4, durSec: 0.5, stepSec: 0.08, motionScale: 1, scrim: 0.85,
  publication: "Case File", edition: "", handle: "@casefile",
};
// Interface: a design-studio brand for UI/UX explainers — cool studio paper,
// electric indigo accent, geometric display type. Pairs with the cutting-mat surface.
const INTERFACE_THEME: Theme = {
  paper: "#EFF0EA", card: "#FAFAF6", ink: "#16181D", ink2: "#6B7080", line: "#D6D8CF",
  accent: "#4B3BFF", accentInk: "#F4F3FF", tint: "#E4E5DD",
  fontDisplay: "Archivo", fontUi: "Inter", fontMono: "JetBrains Mono",
  radius: 10, durSec: 0.45, stepSec: 0.08, motionScale: 0.95, scrim: 0.5,
  publication: "Interface", edition: "UX Notes", handle: "@interface",
};
// Minard flagship: the parchment of the 1869 lithograph, ochre + oxblood.
const MINARD_THEME: Theme = {
  paper: "#F1E9D6", card: "#F7F1E2", ink: "#221B12", ink2: "#6E5F49", line: "#D8CBB0",
  accent: "#B23A2E", accentInk: "#FFF7EA", tint: "#E8DCC2",
  fontDisplay: "Fraunces", fontUi: "Work Sans", fontMono: "Space Mono",
  radius: 4, durSec: 0.5, stepSec: 0.08, motionScale: 1.0, scrim: 0.5,
  publication: "Field Notes", edition: "1812", handle: "@fieldnotes",
};

export interface Channel {
  id: string; name: string; brand: string; template: string;
  scheduleCron: string; enabled: boolean; count: number; look: string;
}
export interface Project {
  id: string; title: string; brand: string; template?: string;
  createdAt: number; output?: string; spec: unknown;
}
/** API keys the user pastes in Settings. Stored in this app's own state.json
 *  (userData), never in the repo, and never sent to the renderer — the UI only
 *  ever sees the masked status from services/keys.ts. */
export interface StoredKeys { elevenlabs?: string; pexels?: string }
export interface AppState {
  settings: { activeBrand: string; keys?: StoredKeys };
  brands: BrandPreset[];
  channels: Channel[];
  projects: Project[];
}

const dir = () => { const d = join(app.getPath("userData"), "data"); if (!existsSync(d)) mkdirSync(d, { recursive: true }); return d; };
const file = () => join(dir(), "state.json");

const DEFAULT_BRANDS: BrandPreset[] = [
  {
    id: "minard", name: "Field Notes (History)", kit: "story", theme: MINARD_THEME,
    voiceId: "78U3k8D8W1rkhXUE5SDH",
    surfaces: ["parchment", "paper", "cutting-mat", "newsprint", "blueprint"],
  },
  {
    id: "casefile", name: "Case File (True Crime)", kit: "story", theme: CASEFILE_THEME,
    voiceId: "78U3k8D8W1rkhXUE5SDH", musicMood: "tense",
    surfaces: ["blueprint", "newsprint", "paper", "cutting-mat", "parchment"],
  },
  {
    id: "interface", name: "Interface (UI/UX)", kit: "story", theme: INTERFACE_THEME,
    voiceId: "", musicMood: "bright", surfaces: ["cutting-mat", "paper", "blueprint"],
  },
  { id: "steam", name: "New on Steam", kit: "cinematic", theme: STEAM_THEME },
  { id: "history", name: "Dispatch (History)", kit: "cinematic", theme: HISTORY_THEME },
  { id: "editorial", name: "Editorial", kit: "editorial", theme: EDITORIAL_THEME },
];

const DEFAULT: AppState = {
  settings: { activeBrand: "minard" },
  brands: DEFAULT_BRANDS,
  channels: [
    { id: "ch_minard", name: "History — Napoleon 1812", brand: "minard", template: "minard-story", scheduleCron: "0 8 * * *", enabled: false, count: 1, look: "ember" },
    { id: "ch_steam", name: "New releases on Steam", brand: "steam", template: "steam-new", scheduleCron: "0 17 * * 5", enabled: false, count: 4, look: "neon" },
    { id: "ch_demo", name: "Games — weekly top 5", brand: "editorial", template: "countdown", scheduleCron: "0 7 * * 1", enabled: false, count: 5, look: "neon" },
  ],
  projects: [],
};

function read(): AppState {
  try {
    const parsed = JSON.parse(readFileSync(file(), "utf-8"));
    const s = { ...DEFAULT, ...parsed };
    // Always guarantee at least the default brand exists (migration-safe).
    if (!Array.isArray(s.brands) || s.brands.length === 0) s.brands = DEFAULT_BRANDS;
    else {
      // built-ins shipped after this store was created still appear (the shallow
      // spread above keeps the stored array, so new defaults would be invisible)
      const have = new Set(s.brands.map((b: BrandPreset) => b.id));
      for (const b of DEFAULT_BRANDS) if (!have.has(b.id)) s.brands.push(b);
    }
    return s;
  } catch { return { ...DEFAULT }; }
}
function write(s: AppState) { writeFileSync(file(), JSON.stringify(s, null, 2)); return s; }

export const store = {
  get: read,
  patch(p: Partial<AppState>) { return write({ ...read(), ...p }); },

  brand(id: string): BrandPreset | undefined { return read().brands.find(b => b.id === id); },
  saveBrand(preset: BrandPreset) {
    const s = read(); const i = s.brands.findIndex(b => b.id === preset.id);
    if (i >= 0) s.brands[i] = preset; else s.brands.push(preset); return write(s);
  },
  deleteBrand(id: string) {
    const s = read();
    if (s.brands.length <= 1) return s;               // never delete the last brand
    s.brands = s.brands.filter(b => b.id !== id);
    if (s.settings.activeBrand === id) s.settings.activeBrand = s.brands[0].id;
    return write(s);
  },
  setActiveBrand(id: string) { const s = read(); s.settings.activeBrand = id; return write(s); },

  /** Merge API keys into settings. An omitted field keeps the current value;
   *  an empty string CLEARS it (falling back to .env.local / process.env). */
  setKeys(partial: StoredKeys) {
    const s = read();
    const keys: StoredKeys = { ...(s.settings.keys ?? {}) };
    for (const k of ["elevenlabs", "pexels"] as const) {
      const v = partial?.[k];
      if (v === undefined) continue;
      if (String(v).trim() === "") delete keys[k]; else keys[k] = String(v).trim();
    }
    s.settings = { ...s.settings, keys };
    return write(s);
  },

  addProject(project: Project) { const s = read(); s.projects.unshift(project); return write(s); },
  saveChannel(ch: Channel) {
    const s = read(); const i = s.channels.findIndex(c => c.id === ch.id);
    if (i >= 0) s.channels[i] = ch; else s.channels.push(ch); return write(s);
  },
  deleteChannel(id: string) { const s = read(); s.channels = s.channels.filter(c => c.id !== id); return write(s); },
  setChannelEnabled(id: string, enabled: boolean) {
    const s = read(); const c = s.channels.find(x => x.id === id); if (c) c.enabled = enabled; return write(s);
  },
  rendersDir() { const d = join(dir(), "renders"); if (!existsSync(d)) mkdirSync(d, { recursive: true }); return d; },
  dataDir: dir,
};
