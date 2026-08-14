// Story pipeline services — the in-app port of scripts/gen-video.mjs,
// scripts/fetch-footage.mjs and scripts/render-story.mjs (docs/BRAND-SYSTEM.md §5).
// A "story" is a folder under src/stories/<slug>/ with a script.json; generated
// media (narration, bed, footage) lands in public/stories/<slug>/.
import { app } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { execFileSync } from "child_process";
import { store } from "./store";
import { getKey } from "./keys";
import { renderSpec } from "./render";

// ---- paths -----------------------------------------------------------------

const root = () => app.getAppPath();
/** Where story scripts (script.json + timings.json) live. Overridable for tests. */
const storiesRoot = () =>
  process.env.AUTOVID_STORIES_DIR ||
  (app.isPackaged ? join(process.resourcesPath, "engine", "stories") : join(root(), "src", "stories"));
/** The Remotion public dir (narration/bed/footage). Overridable for tests.
 *  Exported: main.ts falls back to it when the packaged renderer requests a
 *  staticFile() asset (e.g. the QA probe's Player loading story footage). */
export const publicRoot = () =>
  process.env.AUTOVID_PUBLIC_DIR ||
  (app.isPackaged ? join(process.resourcesPath, "public") : join(root(), "public"));

const srcDir = (slug: string) => join(storiesRoot(), slug);
const pubDir = (slug: string) => join(publicRoot(), "stories", slug);
const scriptPath = (slug: string) => join(srcDir(slug), "script.json");
const timingsPath = (slug: string) => join(srcDir(slug), "timings.json");

// API keys are resolved by services/keys.ts (Settings -> .env.local -> env);
// nothing here reads the environment directly.

// ---- script shape -----------------------------------------------------------

interface BeatBg { src?: string; footage?: string; start?: number }
interface Beat { say: string; lines?: string[]; visual?: any; bg?: BeatBg | null }
interface StoryScript {
  mood?: string;
  title: string; brand?: string; voice?: string; surface?: string;
  context?: string; status?: string; bg?: BeatBg; beats: Beat[];
}

export interface StoryInfo {
  slug: string; title: string; brand: string; surface?: string;
  hasTimings: boolean; unresolvedFootage: number;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-_]*$/;
/** Read paths also accept internal underscore-prefixed stories (_blocktest). */
const READ_SLUG_RE = /^[a-z0-9_][a-z0-9-_]*$/;

/** Validate a script JSON string; returns the parsed script or throws a
 *  human-readable error. */
export function validateScript(json: string): StoryScript {
  let s: any;
  try { s = JSON.parse(json); } catch (e: any) { throw new Error("Not valid JSON: " + e.message); }
  if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error("Script must be a JSON object.");
  if (typeof s.title !== "string" || !s.title.trim()) throw new Error('Script needs a "title" string.');
  if (!Array.isArray(s.beats) || s.beats.length === 0) throw new Error('Script needs a non-empty "beats" array.');
  s.beats.forEach((b: any, i: number) => {
    if (!b || typeof b !== "object") throw new Error(`Beat ${i} must be an object.`);
    if (typeof b.say !== "string" || !b.say.trim()) throw new Error(`Beat ${i} needs a "say" string (the narration).`);
    if (b.lines !== undefined && (!Array.isArray(b.lines) || b.lines.some((l: any) => typeof l !== "string")))
      throw new Error(`Beat ${i}: "lines" must be an array of strings.`);
    if (b.visual !== undefined && (typeof b.visual !== "object" || typeof b.visual.type !== "string"))
      throw new Error(`Beat ${i}: "visual" must be an object with a "type".`);
  });
  return s as StoryScript;
}

function readScript(slug: string): StoryScript {
  if (!existsSync(scriptPath(slug))) throw new Error(`Story "${slug}" not found (no script.json).`);
  return validateScript(readFileSync(scriptPath(slug), "utf8"));
}

// ---- list / get / save --------------------------------------------------------

export function listStories(): StoryInfo[] {
  const dir = storiesRoot();
  if (!existsSync(dir)) return [];
  const out: StoryInfo[] = [];
  for (const slug of readdirSync(dir)) {
    const p = join(dir, slug, "script.json");
    if (!existsSync(p)) continue;
    try {
      const s = JSON.parse(readFileSync(p, "utf8"));
      const beats: Beat[] = Array.isArray(s.beats) ? s.beats : [];
      const unresolved =
        beats.filter((b) => b?.visual?.type === "image" && b.visual.footage && !b.visual.src).length +
        beats.filter((b) => b?.bg && b.bg.footage && !b.bg.src).length +
        (s.bg?.footage && !s.bg?.src ? 1 : 0);
      out.push({
        slug, title: typeof s.title === "string" ? s.title : slug,
        brand: typeof s.brand === "string" ? s.brand : "minard",
        surface: typeof s.surface === "string" ? s.surface : undefined,
        hasTimings: existsSync(join(dir, slug, "timings.json")),
        unresolvedFootage: unresolved,
      });
    } catch {
      out.push({ slug, title: `${slug} (invalid script.json)`, brand: "", hasTimings: false, unresolvedFootage: 0 });
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getStory(slug: string): string {
  if (!READ_SLUG_RE.test(slug)) throw new Error("Bad story name.");
  if (!existsSync(scriptPath(slug))) throw new Error(`Story "${slug}" not found.`);
  return readFileSync(scriptPath(slug), "utf8");
}

/** Per-beat timings (written by story:generate) — the QA probe replays the
 *  video against exactly these to sample every beat. */
export function getStoryTimings(slug: string): { total: number; beats: { start: number; end: number }[] } {
  if (!READ_SLUG_RE.test(slug)) throw new Error("Bad story name.");
  if (!existsSync(timingsPath(slug))) throw new Error(`No voiceover timings for "${slug}" — run Generate voiceover first.`);
  return JSON.parse(readFileSync(timingsPath(slug), "utf8"));
}

export function saveStory(slug: string, json: string) {
  if (!SLUG_RE.test(slug)) throw new Error("Story name must be a slug: lowercase letters, digits, dashes.");
  const script = validateScript(json);
  mkdirSync(srcDir(slug), { recursive: true });
  mkdirSync(pubDir(slug), { recursive: true });
  writeFileSync(scriptPath(slug), JSON.stringify(script, null, 2));
  return { slug };
}

// ---- story:generate — ElevenLabs VO + per-beat timings + music bed ------------
// Port of scripts/gen-video.mjs.

export async function generateStory(slug: string) {
  const script = readScript(slug);
  const KEY = getKey("elevenlabs");
  // Voice precedence: the script's own voice, then the brand preset's voiceId,
  // then the app default (Settings -> .env.local -> env).
  const preset = script.brand ? store.brand(script.brand) : undefined;
  const VOICE = script.voice || preset?.voiceId || getKey("elevenlabsVoice");
  if (!KEY) throw new Error("No ElevenLabs API key — add one in Settings → API keys.");
  if (!VOICE) throw new Error("No voice — set this brand's voice ID in its Style tab (the API key itself lives in Settings → API keys).");
  mkdirSync(pubDir(slug), { recursive: true });

  // One call: narration audio + per-character timings.
  const beats = script.beats, SEP = " ";
  let off = 0; const beatOff: number[] = [];
  const fullText = beats.map((b) => { beatOff.push(off); off += b.say.length + SEP.length; return b.say; }).join(SEP);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`, {
    method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: fullText, model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data: any = await res.json();
  writeFileSync(join(pubDir(slug), "narration.mp3"), Buffer.from(data.audio_base64, "base64"));
  const al = data.alignment || data.normalized_alignment;
  const starts: number[] = al.character_start_times_seconds, ends: number[] = al.character_end_times_seconds;
  const at = (i: number) => starts[Math.max(0, Math.min(starts.length - 1, i))];
  const total = +(ends[ends.length - 1] + 0.9).toFixed(3);
  const timings = beats.map((_, i) => ({ start: +at(beatOff[i]).toFixed(3), end: 0 }));
  timings.forEach((tm, i) => { tm.end = i < timings.length - 1 ? timings[i + 1].start : total; });
  writeFileSync(timingsPath(slug), JSON.stringify({ total, beats: timings }, null, 2));

  // Image cutouts (rembg) for blocks that ask for one — best-effort.
  const RB = "/Library/Frameworks/Python.framework/Versions/3.10/bin/rembg";
  for (const b of beats) {
    const v = b.visual;
    if (v?.type === "image" && v.cutout && !existsSync(join(publicRoot(), v.cutout)) && existsSync(RB) && v.src) {
      try {
        execFileSync(RB, ["i", "-m", "u2net", "-a", join(publicRoot(), v.src), join(publicRoot(), v.cutout)],
          { env: { ...process.env, U2NET_HOME: join(process.env.HOME || "", ".u2net") } });
      } catch { /* cutout is a nice-to-have */ }
    }
  }

  writeBed(join(pubDir(slug), "bed.wav"), total);
  return { total };
}

// ---- ambient music bed (port of gen-video.mjs's bed function) -----------------

function writeWav(path: string, opts: { sampleRate: number; channels: number; bits: number }, pcm: Buffer) {
  const { sampleRate, channels, bits } = opts;
  const byteRate = sampleRate * channels * (bits / 8), blockAlign = channels * (bits / 8), h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32); h.writeUInt16LE(bits, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}

function writeBed(path: string, totalSec: number) {
  const sr = 44100, ch = 2, N = Math.ceil(totalSec * sr), L = new Float32Array(N), R = new Float32Array(N);
  const prog = [[146.83, 174.61, 220], [116.54, 174.61, 220], [130.81, 174.61, 261.63], [110, 164.81, 220]];
  const slotDur = 6, xf = 2.2, partials: [number, number][] = [[1, 1], [2, 0.28], [3, 0.1]];
  for (let s = 0, idx = 0; s < totalSec + slotDur; s += slotDur, idx++) {
    const chord = prog[idx % prog.length], a = (s - xf) * sr, b = (s + slotDur + xf) * sr;
    for (let m = Math.max(0, Math.floor(a)); m < Math.min(N, Math.ceil(b)); m++) {
      const time = m / sr, local = time - s;
      let env = local < 0 ? Math.max(0, 1 + local / xf) : local > slotDur ? Math.max(0, 1 - (local - slotDur) / xf) : 1;
      env *= env; if (env <= 0) continue;
      let l = 0, r = 0;
      for (const f0 of chord) for (const [h, amp] of partials) {
        l += Math.sin(2 * Math.PI * (f0 * h - 0.25) * time) * amp;
        r += Math.sin(2 * Math.PI * (f0 * h + 0.25) * time) * amp;
      }
      L[m] += l * env; R[m] += r * env;
    }
  }
  let peak = 0; for (let m = 0; m < N; m++) peak = Math.max(peak, Math.abs(L[m]), Math.abs(R[m]));
  const g = 0.5 / (peak || 1), fi = 2.5 * sr, fo = 3.5 * sr, pcm = Buffer.alloc(N * ch * 2);
  for (let m = 0; m < N; m++) {
    let f = 1; if (m < fi) f = m / fi; if (m > N - fo) f = Math.max(0, (N - m) / fo);
    pcm.writeInt16LE((Math.max(-1, Math.min(1, L[m] * g * f)) * 32767) | 0, m * 4);
    pcm.writeInt16LE((Math.max(-1, Math.min(1, R[m] * g * f)) * 32767) | 0, m * 4 + 2);
  }
  writeWav(path, { sampleRate: sr, channels: ch, bits: 16 }, pcm);
}

// ---- story:footage — Pexels then Wikimedia (port of fetch-footage.mjs) --------

const UA = { "User-Agent": "autovid-studio/1.0 (research tool)" };
const MAX_BYTES = 90 * 1024 * 1024;

/** One flaky provider (socket reset, malformed JSON) must never kill the whole
 *  resolve loop — treat it as "no result" and fall through to the next. */
const attempt = async <T>(fn: () => Promise<T | null>): Promise<T | null> => {
  try { return await fn(); } catch { return null; }
};

async function pexels(query: string, key?: string) {
  if (!key) return null;
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6&orientation=portrait`,
    { headers: { Authorization: key } });
  if (!r.ok) return null;
  const d: any = await r.json();
  // Prefer clips long enough to cover a whole beat (>=8s), then fall back.
  const ranked = [...(d.videos ?? [])].sort(
    (a: any, b: any) => (((b.duration ?? 0) >= 8 ? 1 : 0) as number) - (((a.duration ?? 0) >= 8 ? 1 : 0) as number));
  for (const v of ranked) {
    // Prefer portrait ~720-1080-wide mp4.
    const files = (v.video_files ?? [])
      .filter((f: any) => f.file_type === "video/mp4" && f.height >= f.width)
      .sort((a: any, b: any) => Math.abs(a.width - 1080) - Math.abs(b.width - 1080));
    if (files[0]) return { url: files[0].link as string, ext: "mp4", credit: `Pexels · ${v.user?.name ?? "unknown"} · pexels.com/video/${v.id} (${v.duration}s)` };
  }
  return null;
}

async function wikimedia(query: string) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent("filetype:video " + query)}&gsrlimit=8&gsrnamespace=6&prop=videoinfo&viprop=url|size|mime|derivatives`;
  const r = await fetch(api, { headers: UA });
  if (!r.ok) return null;
  const d: any = await r.json();
  const pages: any[] = Object.values(d.query?.pages ?? {});
  for (const pg of pages) {
    const vi = pg.videoinfo?.[0]; if (!vi) continue;
    // Prefer a <=720p transcode; fall back to the original if small enough.
    const der = (vi.derivatives ?? [])
      .filter((x: any) => /video/.test(x.type) && (x.height ?? 0) <= 720 && (x.height ?? 0) >= 360)
      .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0));
    const pick = der[0] ?? ((vi.size ?? Infinity) < MAX_BYTES ? { src: vi.url, type: vi.mime } : null);
    if (!pick) continue;
    const ext = /webm/.test(pick.type ?? "") ? "webm" : /ogg|ogv/.test(pick.type ?? "") ? "ogv" : "mp4";
    return { url: pick.src as string, ext, credit: `Wikimedia Commons · ${pg.title}` };
  }
  return null;
}

// ---- bg IMAGE providers — public-domain first --------------------------------
// Resolve `bg` atmosphere queries: Library of Congress photos (PD-heavy, era
// texture) -> Wikimedia Commons images -> Pexels PHOTOS. Image-beat `footage`
// queries keep the VIDEO provider order above (Pexels videos -> Wikimedia).

const extOf = (url: string, fallback = "jpg") =>
  (url.match(/\.(jpe?g|png|gif|webp)(?=[#?]|$)/i)?.[1] ?? fallback).toLowerCase().replace("jpeg", "jpg");

async function locImage(query: string) {
  const r = await fetch(`https://www.loc.gov/photos/?q=${encodeURIComponent(query)}&fo=json&c=25`, { headers: UA });
  if (!r.ok) return null;
  const d: any = await r.json();
  for (const it of d.results ?? []) {
    if (it.access_restricted) continue;
    if (typeof it.rights === "string" && /restrict/i.test(it.rights)) continue;
    // photos only — full-text search also matches book/newspaper page scans,
    // which read as text-noise, never as atmosphere
    const fmt = [it.original_format ?? []].flat().join(" ").toLowerCase();
    if (!/photo/.test(fmt) || /book|periodical|newspaper/.test(fmt)) continue;
    // image_url is ordered small -> large; take the largest real image URL
    const urls: string[] = (it.image_url ?? []).filter((u: string) => /\.(jpe?g|png|gif)/i.test(u));
    if (!urls.length) continue;
    const raw = urls[urls.length - 1];
    const url = raw.startsWith("//") ? "https:" + raw : raw;
    return { url, ext: extOf(url), credit: `Library of Congress · ${String(it.title ?? "").slice(0, 140)} · ${it.id ?? it.url ?? ""}` };
  }
  return null;
}

async function wikimediaImage(query: string) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent("filetype:bitmap " + query)}&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1600`;
  const r = await fetch(api, { headers: UA });
  if (!r.ok) return null;
  const d: any = await r.json();
  const pages: any[] = Object.values(d.query?.pages ?? {}).sort((x: any, y: any) => (x.index ?? 99) - (y.index ?? 99));
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0]; if (!ii) continue;
    if (!/image\/(jpe?g|png)/.test(ii.mime ?? "")) continue;
    if ((ii.width ?? 0) < 900) continue;
    const url: string = ii.thumburl ?? ii.url;   // <=1600px transcode when available
    if (!url) continue;
    return { url, ext: extOf(url), credit: `Wikimedia Commons · ${pg.title}` };
  }
  return null;
}

async function pexelsPhoto(query: string, key?: string) {
  if (!key) return null;
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=portrait`,
    { headers: { Authorization: key } });
  if (!r.ok) return null;
  const d: any = await r.json();
  const ph = (d.photos ?? [])[0];
  if (!ph) return null;
  const url: string = ph.src?.large2x ?? ph.src?.original;
  if (!url) return null;
  return { url, ext: extOf(url), credit: `Pexels · ${ph.photographer ?? "unknown"} · pexels.com/photo/${ph.id}` };
}

export async function fetchFootage(slug: string) {
  const script = readScript(slug);
  // No Pexels key is fine: pexels()/pexelsPhoto() return null and the loop falls
  // through to Wikimedia / Library of Congress.
  const pexelsKey = getKey("pexels");
  mkdirSync(pubDir(slug), { recursive: true });
  let resolved = 0;
  const credits: string[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < script.beats.length; i++) {
    const v = script.beats[i].visual;
    if (!v || v.type !== "image" || !v.footage) continue;
    if (v.src) continue; // already resolved
    const hit = (await attempt(() => pexels(v.footage, pexelsKey))) ?? (await attempt(() => wikimedia(v.footage)));
    if (!hit) { skipped.push(`beat ${i}: nothing found for "${v.footage}"`); continue; }
    const rel = `stories/${slug}/footage-${i}.${hit.ext}`;
    const res = await fetch(hit.url, { headers: UA });
    if (!res.ok) { skipped.push(`beat ${i}: download failed (${res.status})`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) { skipped.push(`beat ${i}: clip too large`); continue; }
    writeFileSync(join(publicRoot(), rel), buf);
    v.src = rel; resolved++;
    credits.push(`footage-${i}.${hit.ext}: ${hit.credit}`);
  }
  // bg atmosphere queries (per-beat + the story-level fallback): images only
  const bgTargets: { g: BeatBg; name: string }[] = [];
  script.beats.forEach((b, i) => { if (b.bg && b.bg.footage && !b.bg.src) bgTargets.push({ g: b.bg, name: `bg-${i}` }); });
  if (script.bg?.footage && !script.bg.src) bgTargets.push({ g: script.bg, name: "bg-story" });
  for (const { g, name } of bgTargets) {
    const hit = (await attempt(() => locImage(g.footage!))) ?? (await attempt(() => wikimediaImage(g.footage!))) ?? (await attempt(() => pexelsPhoto(g.footage!, pexelsKey)));
    if (!hit) { skipped.push(`${name}: nothing found for "${g.footage}"`); continue; }
    const rel = `stories/${slug}/${name}.${hit.ext}`;
    const res = await fetch(hit.url, { headers: UA });
    if (!res.ok) { skipped.push(`${name}: download failed (${res.status})`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) { skipped.push(`${name}: image too large`); continue; }
    writeFileSync(join(publicRoot(), rel), buf);
    g.src = rel; resolved++;
    credits.push(`${name}.${hit.ext}: ${hit.credit}`);
  }
  if (resolved > 0) {
    writeFileSync(scriptPath(slug), JSON.stringify(script, null, 2));
    const srcNote = join(pubDir(slug), "SOURCES.txt");
    const prev = existsSync(srcNote) ? readFileSync(srcNote, "utf8") + "\n" : "";
    writeFileSync(srcNote, prev + credits.join("\n") + "\n");
  }
  const remaining =
    script.beats.filter((b) => b?.visual?.type === "image" && b.visual.footage && !b.visual.src).length +
    script.beats.filter((b) => b?.bg && b.bg.footage && !b.bg.src).length +
    (script.bg?.footage && !script.bg.src ? 1 : 0);
  return { resolved, remaining, notes: skipped };
}

// ---- story:render — spec exactly like render-story.mjs, theme from the store --

export async function renderStory(slug: string) {
  const script = readScript(slug);
  if (!existsSync(timingsPath(slug)))
    throw new Error("No voiceover yet — run Generate voiceover first.");
  const timings = JSON.parse(readFileSync(timingsPath(slug), "utf8"));

  // Store brands are the in-app source of truth for the look.
  const preset = (script.brand ? store.brand(script.brand) : undefined) ?? store.brand("minard") ?? store.get().brands[0];
  if (!preset) throw new Error("No brand available to style this story.");
  const theme = { ...preset.theme, edition: script.context || preset.theme.edition };

  const spec = {
    fps: 30, width: 1080, height: 1920, brand: script.brand || "minard", kit: "story",
    audioSrc: `stories/${slug}/narration.mp3`, musicSrc: `audio/beds/${(script.mood ?? preset.musicMood ?? "warm")}.mp3`, words: [],
    scenes: [{ id: "s0", type: "doc", startSec: 0, endSec: timings.total + 1.8, props: { script, timings, logo: preset.logo } }],
  };
  const output = await renderSpec(spec, theme);
  store.addProject({
    id: "p_" + Date.now(), title: script.title, brand: script.brand || "minard",
    template: "story", createdAt: Date.now(), output, spec,
  });
  return { output };
}
