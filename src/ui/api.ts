import type { BrandPreset } from "@engine/engine/types";

export interface Channel {
  id: string; name: string; brand: string; template: string;
  scheduleCron: string; enabled: boolean; count: number; look: string;
}
export interface Project {
  id: string; title: string; brand: string; template?: string;
  createdAt: number; output?: string; spec: any;
}
/** Renderer-safe view of one API key — never the raw value (see
 *  electron/services/keys.ts). `masked` shows only the last 4 chars. */
export interface KeyStatus { set: boolean; source: "settings" | "env" | null; masked: string | null }
export interface KeysStatus { elevenlabs: KeyStatus; pexels: KeyStatus }

/** Note: `settings.keys` is stripped by the main process — the renderer only
 *  ever gets the masked `KeysStatus` from `keysStatus()`. */
export interface AppState {
  settings: { activeBrand: string };
  brands: BrandPreset[];
  channels: Channel[];
  projects: Project[];
}

/** One story folder as reported by the main process (story:list). */
export interface StoryInfo {
  slug: string; title: string; brand: string; surface?: string;
  hasTimings: boolean; unresolvedFootage: number;
}
/** Story IPC results carry errors as data so the UI can show them inline. */
export type StoryResult<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

/** One offending text pair from the overlap QA (story:qa). */
export interface QaOverlap { time: number; textA: string; textB: string; overlapPx: number }
export interface StoryTimings { total: number; beats: { start: number; end: number }[] }

declare global {
  interface Window { api: {
    getState(): Promise<AppState>;
    saveBrand(preset: BrandPreset): Promise<AppState>;
    deleteBrand(id: string): Promise<AppState>;
    setActiveBrand(id: string): Promise<AppState>;
    render(spec: any, themeOverride?: any, meta?: { title?: string; template?: string }): Promise<string>;
    saveChannel(c: Channel): Promise<AppState>;
    deleteChannel(id: string): Promise<AppState>;
    setChannelEnabled(id: string, enabled: boolean): Promise<AppState>;
    runChannel(id: string): Promise<string>;
    storyList(): Promise<StoryResult<{ stories: StoryInfo[] }>>;
    storyGet(slug: string): Promise<StoryResult<{ json: string }>>;
    storySave(slug: string, json: string): Promise<StoryResult<{ slug: string }>>;
    storyGetTimings(slug: string): Promise<StoryResult<{ timings: StoryTimings }>>;
    storyGenerate(slug: string): Promise<StoryResult<{ total: number }>>;
    storyQa(slug: string): Promise<StoryResult<{ pass: boolean; samples: number; overlaps: QaOverlap[] }>>;
    storyFootage(slug: string): Promise<StoryResult<{ resolved: number; remaining: number; notes: string[] }>>;
    storyRender(slug: string): Promise<StoryResult<{ output: string }>>;
    keysStatus(): Promise<StoryResult<{ status: KeysStatus }>>;
    keysSave(keys: { elevenlabs?: string; pexels?: string }): Promise<StoryResult<{ status: KeysStatus }>>;
    pickMedia(): Promise<string | null>;
    openPath(p: string): Promise<void>;
  } }
}
export const api = window.api;
