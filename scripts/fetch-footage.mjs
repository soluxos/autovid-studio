// Resolve open-licensed FOOTAGE + bg IMAGERY for a story. Usage:
//   node scripts/fetch-footage.mjs <story>
// For every image beat with a "footage" query and no src yet, searches an open
// source, downloads the best clip into public/stories/<story>/, and writes the
// src back into script.json. Video sources (image beats):
//   1. Pexels  (if PEXELS_API_KEY in .env.local — free key, portrait clips, Pexels license)
//   2. Wikimedia Commons (keyless fallback — CC/PD, quality varies)
// Beat/story `bg` atmosphere queries resolve as IMAGES, public-domain first:
//   1. Library of Congress photos (loc.gov JSON API — PD-heavy, era texture)
//   2. Wikimedia Commons images
//   3. Pexels photos
// Re-run with FORCE=1 to re-resolve beats that already have a src.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
if (!name) { console.error("usage: node scripts/fetch-footage.mjs <story>"); process.exit(1); }
const SRC = join(ROOT, "src/stories", name), PUB = join(ROOT, "public/stories", name);
mkdirSync(PUB, { recursive: true });
const scriptPath = join(SRC, "script.json");
const script = JSON.parse(readFileSync(scriptPath, "utf8"));

const env = { ...process.env };
if (existsSync(join(ROOT, ".env.local"))) for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const UA = { "User-Agent": "autovid-studio/1.0 (research tool)" };
const MAX_BYTES = 90 * 1024 * 1024;

// one flaky provider (socket reset, bad JSON) must never kill the whole loop
const attempt = async (fn) => { try { return await fn(); } catch (e) { console.warn("  provider error:", e.message); return null; } };

async function pexels(query) {
  if (!env.PEXELS_API_KEY) return null;
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=6&orientation=portrait`, { headers: { Authorization: env.PEXELS_API_KEY } });
  if (!r.ok) { console.warn("  pexels", r.status); return null; }
  const d = await r.json();
  // prefer clips long enough to cover a whole beat (>=8s), then fall back
  const ranked = [...(d.videos ?? [])].sort((a, b) => ((b.duration ?? 0) >= 8 ? 1 : 0) - ((a.duration ?? 0) >= 8 ? 1 : 0));
  for (const v of ranked) {
    // prefer portrait ~720-1080 wide mp4
    const files = (v.video_files ?? []).filter((f) => f.file_type === "video/mp4" && f.height >= f.width)
      .sort((a, b) => Math.abs(a.width - 1080) - Math.abs(b.width - 1080));
    if (files[0]) return { url: files[0].link, ext: "mp4", credit: `Pexels · ${v.user?.name ?? "unknown"} · pexels.com/video/${v.id} (${v.duration}s)` };
  }
  return null;
}

async function wikimedia(query) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent("filetype:video " + query)}&gsrlimit=8&gsrnamespace=6&prop=videoinfo&viprop=url|size|mime|derivatives`;
  const r = await fetch(api, { headers: UA });
  if (!r.ok) { console.warn("  wikimedia", r.status); return null; }
  const d = await r.json();
  const pages = Object.values(d.query?.pages ?? {});
  for (const pg of pages) {
    const vi = pg.videoinfo?.[0]; if (!vi) continue;
    // prefer a <=720p transcode; fall back to the original if small enough
    const der = (vi.derivatives ?? []).filter((x) => /video/.test(x.type) && (x.height ?? 0) <= 720 && (x.height ?? 0) >= 360)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
    const pick = der[0] ?? ((vi.size ?? Infinity) < MAX_BYTES ? { src: vi.url, type: vi.mime } : null);
    if (!pick) continue;
    const ext = /webm/.test(pick.type ?? "") ? "webm" : /ogg|ogv/.test(pick.type ?? "") ? "ogv" : "mp4";
    return { url: pick.src, ext, credit: `Wikimedia Commons · ${pg.title}` };
  }
  return null;
}

// ---- bg IMAGE providers (public-domain first) --------------------------------

const extOf = (url, fallback = "jpg") =>
  (url.match(/\.(jpe?g|png|gif|webp)(?=[#?]|$)/i)?.[1] ?? fallback).toLowerCase().replace("jpeg", "jpg");

async function locImage(query) {
  const r = await fetch(`https://www.loc.gov/photos/?q=${encodeURIComponent(query)}&fo=json&c=25`, { headers: UA });
  if (!r.ok) { console.warn("  loc", r.status); return null; }
  const d = await r.json();
  for (const it of d.results ?? []) {
    if (it.access_restricted) continue;
    if (typeof it.rights === "string" && /restrict/i.test(it.rights)) continue;
    // photos only — full-text search also matches book/newspaper page scans,
    // which read as text-noise, never as atmosphere
    const fmt = [it.original_format ?? []].flat().join(" ").toLowerCase();
    if (!/photo/.test(fmt) || /book|periodical|newspaper/.test(fmt)) continue;
    // image_url is ordered small -> large; take the largest real image URL
    const urls = (it.image_url ?? []).filter((u) => /\.(jpe?g|png|gif)/i.test(u));
    if (!urls.length) continue;
    const raw = urls[urls.length - 1];
    const url = raw.startsWith("//") ? "https:" + raw : raw;
    return { url, ext: extOf(url), credit: `Library of Congress · ${String(it.title ?? "").slice(0, 140)} · ${it.id ?? it.url ?? ""}` };
  }
  return null;
}

async function wikimediaImage(query) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent("filetype:bitmap " + query)}&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1600`;
  const r = await fetch(api, { headers: UA });
  if (!r.ok) { console.warn("  wikimedia-img", r.status); return null; }
  const d = await r.json();
  const pages = Object.values(d.query?.pages ?? {}).sort((x, y) => (x.index ?? 99) - (y.index ?? 99));
  for (const pg of pages) {
    const ii = pg.imageinfo?.[0]; if (!ii) continue;
    if (!/image\/(jpe?g|png)/.test(ii.mime ?? "")) continue;
    if ((ii.width ?? 0) < 900) continue;
    const url = ii.thumburl ?? ii.url;   // <=1600px transcode when available
    if (!url) continue;
    return { url, ext: extOf(url), credit: `Wikimedia Commons · ${pg.title}` };
  }
  return null;
}

async function pexelsPhoto(query) {
  if (!env.PEXELS_API_KEY) return null;
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=portrait`, { headers: { Authorization: env.PEXELS_API_KEY } });
  if (!r.ok) { console.warn("  pexels-photo", r.status); return null; }
  const d = await r.json();
  const ph = (d.photos ?? [])[0];
  if (!ph) return null;
  const url = ph.src?.large2x ?? ph.src?.original;
  if (!url) return null;
  return { url, ext: extOf(url), credit: `Pexels · ${ph.photographer ?? "unknown"} · pexels.com/photo/${ph.id}` };
}

let changed = false;
const credits = [];
for (let i = 0; i < script.beats.length; i++) {
  const v = script.beats[i].visual;
  if (!v || v.type !== "image" || !v.footage) continue;
  if (v.src && !process.env.FORCE) { console.log(`beat ${i}: src already set, skipping (FORCE=1 to redo)`); continue; }
  console.log(`beat ${i}: searching "${v.footage}"...`);
  const hit = (await attempt(() => pexels(v.footage))) ?? (await attempt(() => wikimedia(v.footage)));
  if (!hit) { console.warn(`  no clip found for "${v.footage}" — leaving beat as-is`); continue; }
  const rel = `stories/${name}/footage-${i}.${hit.ext}`;
  const dest = join(ROOT, "public", rel);
  const res = await fetch(hit.url, { headers: UA });
  if (!res.ok) { console.warn(`  download failed ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) { console.warn(`  too large (${(buf.length / 1e6).toFixed(0)}MB), skipping`); continue; }
  writeFileSync(dest, buf);
  v.src = rel; changed = true;
  credits.push(`footage-${i}.${hit.ext}: ${hit.credit}`);
  console.log(`  saved ${rel} (${(buf.length / 1e6).toFixed(1)}MB) — ${hit.credit}`);
}

// bg atmosphere queries (per-beat + the story-level fallback): images only
const bgTargets = script.beats.flatMap((b, i) => (b.bg && b.bg.footage ? [{ g: b.bg, file: `bg-${i}` }] : []));
if (script.bg?.footage) bgTargets.push({ g: script.bg, file: "bg-story" });
for (const { g, file } of bgTargets) {
  if (g.src && !process.env.FORCE) { console.log(`${file}: src already set, skipping (FORCE=1 to redo)`); continue; }
  console.log(`${file}: searching "${g.footage}"...`);
  const hit = (await attempt(() => locImage(g.footage))) ?? (await attempt(() => wikimediaImage(g.footage))) ?? (await attempt(() => pexelsPhoto(g.footage)));
  if (!hit) { console.warn(`  no image found for "${g.footage}" — leaving as-is`); continue; }
  const rel = `stories/${name}/${file}.${hit.ext}`;
  const res = await fetch(hit.url, { headers: UA });
  if (!res.ok) { console.warn(`  download failed ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) { console.warn(`  too large (${(buf.length / 1e6).toFixed(0)}MB), skipping`); continue; }
  writeFileSync(join(ROOT, "public", rel), buf);
  g.src = rel; changed = true;
  credits.push(`${file}.${hit.ext}: ${hit.credit}`);
  console.log(`  saved ${rel} (${(buf.length / 1e6).toFixed(1)}MB) — ${hit.credit}`);
}
if (changed) {
  writeFileSync(scriptPath, JSON.stringify(script, null, 2));
  const srcNote = join(PUB, "SOURCES.txt");
  const prev = existsSync(srcNote) ? readFileSync(srcNote, "utf8") + "\n" : "";
  writeFileSync(srcNote, prev + credits.join("\n") + "\n");
  console.log("script.json updated. Next: node scripts/render-story.mjs " + name);
} else console.log("nothing to fetch.");
