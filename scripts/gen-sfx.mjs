// Manual SFX generator (ElevenLabs sound-generation). Run once:
//   node scripts/gen-sfx.mjs
// Bakes a small, subtle sound-effect library to public/audio/sfx/. These are
// triggered quietly under text and infographic animations to make them feel
// animated. Key from .env.local (gitignored).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/audio/sfx");
mkdirSync(OUT, { recursive: true });

const p = join(ROOT, ".env.local"); const env = { ...process.env };
if (existsSync(p)) for (const line of readFileSync(p, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const KEY = env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("Missing ELEVENLABS_API_KEY in .env.local"); process.exit(1); }

const SFX = [
  { name: "tick", prompt: "single short dry tactile paper flick, crisp light click, close mic, no reverb, no music", duration: 0.5 },
  { name: "whoosh", prompt: "quick soft paper page turn swoosh, dry, short, no music", duration: 0.6 },
  { name: "thud", prompt: "soft muffled old book closing on a desk, low dry thud, short, no music", duration: 1.0 },
  { name: "riser", prompt: "soft dry paper rustle building quietly, subtle texture, no tone, no music", duration: 3.0 },
  { name: "swell", prompt: "gentle airy paper unfolding reveal, soft breathy, short, no music", duration: 2.5 },
];

for (const s of SFX) {
  process.stdout.write(`generating ${s.name}... `);
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text: s.prompt, duration_seconds: s.duration, prompt_influence: 0.45 }),
  });
  if (!res.ok) { console.error("\nerror", res.status, (await res.text()).slice(0, 200)); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(OUT, `${s.name}.mp3`), buf);
  console.log(`ok (${(buf.length / 1024).toFixed(0)}kb)`);
}
console.log("SFX library written to public/audio/sfx/");
