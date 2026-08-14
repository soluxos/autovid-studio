// Generalised video generator. Usage:
//   node scripts/gen-video.mjs <story>
// Reads src/stories/<story>/script.json, then via ONE ElevenLabs call makes the
// voiceover + per-beat timings (from the character alignment), the music bed,
// and any image cutouts (rembg). Everything else (visuals) is drawn at render
// time from the script. Key/voice from .env.local.
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
if (!name) { console.error("usage: node scripts/gen-video.mjs <story>"); process.exit(1); }
const SRC = join(ROOT, "src/stories", name), PUB = join(ROOT, "public/stories", name);
mkdirSync(PUB, { recursive: true });
const script = JSON.parse(readFileSync(join(SRC, "script.json"), "utf8"));

const env = { ...process.env };
if (existsSync(join(ROOT, ".env.local"))) for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const KEY = env.ELEVENLABS_API_KEY, VOICE = script.voice || env.ELEVENLABS_VOICE_ID;
if (!KEY || !VOICE) { console.error("Missing ELEVENLABS_API_KEY / voice"); process.exit(1); }

// ---- narration (one call, with per-character timings) ----
const beats = script.beats, SEP = " ";
let off = 0; const beatOff = [];
const fullText = beats.map((b) => { beatOff.push(off); off += b.say.length + SEP.length; return b.say; }).join(SEP);
console.log(`[${name}] ${beats.length} beats, ${fullText.length} chars -> ElevenLabs`);
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`, {
  method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ text: fullText, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0, use_speaker_boost: true } }),
});
if (!res.ok) { console.error("ElevenLabs", res.status, (await res.text()).slice(0, 300)); process.exit(1); }
const data = await res.json();
writeFileSync(join(PUB, "narration.mp3"), Buffer.from(data.audio_base64, "base64"));
const al = data.alignment || data.normalized_alignment, starts = al.character_start_times_seconds, ends = al.character_end_times_seconds;
const at = (i) => starts[Math.max(0, Math.min(starts.length - 1, i))];
const total = +(ends[ends.length - 1] + 0.9).toFixed(3);
const timings = beats.map((_, i) => ({ start: +at(beatOff[i]).toFixed(3), end: 0 }));
timings.forEach((tm, i) => { tm.end = i < timings.length - 1 ? timings[i + 1].start : total; });
writeFileSync(join(SRC, "timings.json"), JSON.stringify({ total, beats: timings }, null, 2));
console.log(`  narration.mp3 (${total.toFixed(1)}s), timings.json`);

// ---- image cutouts (rembg) for blocks that ask for one ----
const RB = "/Library/Frameworks/Python.framework/Versions/3.10/bin/rembg";
for (const b of beats) {
  const v = b.visual;
  if (v?.type === "image" && v.cutout && !existsSync(join(ROOT, "public", v.cutout)) && existsSync(RB)) {
    try {
      execFileSync(RB, ["i", "-m", "u2net", "-a", join(ROOT, "public", v.src), join(ROOT, "public", v.cutout)], { env: { ...process.env, U2NET_HOME: join(env.HOME || "", ".u2net") } });
      console.log(`  cutout ${v.cutout}`);
    } catch (e) { console.warn(`  cutout failed for ${v.src}`); }
  }
}

// ---- ambient bed ----
function writeWav(path, { sampleRate, channels, bits }, pcm) {
  const byteRate = sampleRate * channels * (bits / 8), blockAlign = channels * (bits / 8), h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32); h.writeUInt16LE(bits, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}
(function bed(totalSec) {
  const sr = 44100, ch = 2, N = Math.ceil(totalSec * sr), L = new Float32Array(N), R = new Float32Array(N);
  const prog = [[146.83, 174.61, 220], [116.54, 174.61, 220], [130.81, 174.61, 261.63], [110, 164.81, 220]], slotDur = 6, xf = 2.2, partials = [[1, 1], [2, .28], [3, .1]];
  for (let s = 0, idx = 0; s < totalSec + slotDur; s += slotDur, idx++) {
    const chord = prog[idx % prog.length], a = (s - xf) * sr, b = (s + slotDur + xf) * sr;
    for (let m = Math.max(0, Math.floor(a)); m < Math.min(N, Math.ceil(b)); m++) {
      const time = m / sr, local = time - s; let env = local < 0 ? Math.max(0, 1 + local / xf) : local > slotDur ? Math.max(0, 1 - (local - slotDur) / xf) : 1;
      env *= env; if (env <= 0) continue; let l = 0, r = 0;
      for (const f0 of chord) for (const [h, amp] of partials) { l += Math.sin(2 * Math.PI * (f0 * h - .25) * time) * amp; r += Math.sin(2 * Math.PI * (f0 * h + .25) * time) * amp; }
      L[m] += l * env; R[m] += r * env;
    }
  }
  let peak = 0; for (let m = 0; m < N; m++) peak = Math.max(peak, Math.abs(L[m]), Math.abs(R[m]));
  const g = .5 / (peak || 1), fi = 2.5 * sr, fo = 3.5 * sr, pcm = Buffer.alloc(N * ch * 2);
  for (let m = 0; m < N; m++) { let f = 1; if (m < fi) f = m / fi; if (m > N - fo) f = Math.max(0, (N - m) / fo); pcm.writeInt16LE(Math.max(-1, Math.min(1, L[m] * g * f)) * 32767 | 0, m * 4); pcm.writeInt16LE(Math.max(-1, Math.min(1, R[m] * g * f)) * 32767 | 0, m * 4 + 2); }
  writeWav(join(PUB, "bed.wav"), { sampleRate: sr, channels: ch, bits: 16 }, pcm);
})(total);
console.log(`  bed.wav. Done. Now: node scripts/render-story.mjs ${name}`);
