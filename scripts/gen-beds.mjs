// Bake looping music beds per mood via ElevenLabs sound-generation. Run once:
//   node scripts/gen-beds.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/audio/beds"); mkdirSync(OUT, { recursive: true });
const env = { ...process.env };
for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const BEDS = [
  { name: "warm", prompt: "warm gentle acoustic documentary underscore, soft felt piano and light strings, hopeful and curious, steady, seamless loop, instrumental, no vocals, no percussion hits" },
  { name: "bright", prompt: "light playful documentary underscore, plucked strings and marimba, curious and optimistic, gentle momentum, seamless loop, instrumental, no vocals" },
  { name: "tense", prompt: "understated suspenseful documentary underscore, soft low string pulse and airy pads, restrained intrigue, seamless loop, instrumental, no vocals" },
];
for (const b of BEDS) {
  process.stdout.write(`bed ${b.name}... `);
  const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text: b.prompt, duration_seconds: 22, prompt_influence: 0.4 }),
  });
  if (!r.ok) { console.error("err", r.status, (await r.text()).slice(0, 160)); process.exit(1); }
  writeFileSync(join(OUT, `${b.name}.mp3`), Buffer.from(await r.arrayBuffer()));
  console.log("ok");
}
console.log("beds baked to public/audio/beds/");
