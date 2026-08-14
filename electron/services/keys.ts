// The single place API keys are resolved. Everything in the main process asks
// getKey() — nothing reads process.env or .env.local on its own.
//
// Resolution order (first hit wins):
//   1. the key saved in Settings -> API keys (this app's own store.json)
//   2. `.env.local` next to the app  (the developer's own keys — this is why
//      the owner's checkout keeps working with nothing pasted into the UI)
//   3. process.env                    (CI / shell-provided)
//
// SECURITY: a raw key must never cross IPC to the renderer. The UI is only ever
// given keyStatus() — a boolean, a source label and a last-4 mask.
import { app } from "electron";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { store } from "./store";

/** Keys this app knows how to resolve. `elevenlabsVoice` is the default voice
 *  ID, resolved the same way (a brand's own voiceId still wins over it). */
export type KeyName = "elevenlabs" | "pexels" | "elevenlabsVoice";

const ENV_VAR: Record<KeyName, string> = {
  elevenlabs: "ELEVENLABS_API_KEY",
  pexels: "PEXELS_API_KEY",
  elevenlabsVoice: "ELEVENLABS_VOICE_ID",
};

/** Names that have a slot in Settings (the voice ID is set per brand, in Style). */
const SETTINGS_KEYS = ["elevenlabs", "pexels"] as const;
export type SettingsKeyName = (typeof SETTINGS_KEYS)[number];

/** Parse `.env.local` in the app path — the developer fallback. Best-effort:
 *  a missing or unreadable file simply means "no developer keys". */
function envLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const f = join(app.getAppPath(), ".env.local");
    if (!existsSync(f)) return out;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["'](.*)["']$/, "$1");
    }
  } catch { /* unreadable .env.local == no developer keys */ }
  return out;
}

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

const fromSettings = (name: KeyName) =>
  SETTINGS_KEYS.includes(name as SettingsKeyName)
    ? clean(store.get().settings.keys?.[name as SettingsKeyName])
    : undefined;

/** The value to actually use, or undefined when nothing supplies it. */
export function getKey(name: KeyName): string | undefined {
  return fromSettings(name) ?? clean(envLocal()[ENV_VAR[name]]) ?? clean(process.env[ENV_VAR[name]]);
}

export interface KeyStatus { set: boolean; source: "settings" | "env" | null; masked: string | null }
export type KeysStatus = Record<SettingsKeyName, KeyStatus>;

/** Show only the last 4 characters: "••••9244". */
const mask = (v: string) => "••••" + (v.length > 4 ? v.slice(-4) : v);

function statusOf(name: SettingsKeyName): KeyStatus {
  const saved = fromSettings(name);
  if (saved) return { set: true, source: "settings", masked: mask(saved) };
  const env = clean(envLocal()[ENV_VAR[name]]) ?? clean(process.env[ENV_VAR[name]]);
  if (env) return { set: true, source: "env", masked: mask(env) };
  return { set: false, source: null, masked: null };
}

/** Renderer-safe view of the keys: never the raw value. */
export function keyStatus(): KeysStatus {
  return { elevenlabs: statusOf("elevenlabs"), pexels: statusOf("pexels") };
}
