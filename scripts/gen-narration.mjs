// Manual narration generator. Run when the script changes:
//   node scripts/gen-narration.mjs
// One ElevenLabs "with-timestamps" call: returns the audio AND per-character
// timings, which we turn into per-beat start times so the visuals re-sync to
// the new voice. Writes public/audio/minard/narration.mp3 + bed.wav and
// src/brands/story/minard-timings.json. Key is read from .env.local (gitignored).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUD = join(ROOT, "public/audio/minard");
mkdirSync(AUD, { recursive: true });

// --- load .env.local (no dependency) ---
function loadEnv() {
  const p = join(ROOT, ".env.local");
  const env = { ...process.env };
  if (existsSync(p)) for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv();
const KEY = env.ELEVENLABS_API_KEY, VOICE = env.ELEVENLABS_VOICE_ID;
if (!KEY || !VOICE) { console.error("Missing ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID in .env.local"); process.exit(1); }

const beats = JSON.parse(readFileSync(join(ROOT, "src/brands/story/minard-beats.json"), "utf8"));

// concatenate the spoken lines; record where each beat begins (char offset)
const SEP = " ";
let offset = 0; const beatOffset = [];
const fullText = beats.map((b, i) => { beatOffset.push(offset); offset += b.say.length + SEP.length; return b.say; }).join(SEP);

console.log(`Requesting ${beats.length} beats (${fullText.length} chars) from ElevenLabs...`);
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps`, {
  method: "POST",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    text: fullText,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
  }),
});
if (!res.ok) { console.error("ElevenLabs error", res.status, (await res.text()).slice(0, 300)); process.exit(1); }
const data = await res.json();

writeFileSync(join(AUD, "narration.mp3"), Buffer.from(data.audio_base64, "base64"));

// map beat offsets -> seconds via the character alignment
const al = data.alignment || data.normalized_alignment;
const starts = al.character_start_times_seconds, ends = al.character_end_times_seconds;
const n = starts.length;
const timeAt = (charIdx) => starts[Math.max(0, Math.min(n - 1, charIdx))];
const TAIL = 0.9;
const total = +(ends[n - 1] + TAIL).toFixed(3);
const timings = beats.map((b, i) => ({ start: +timeAt(beatOffset[i]).toFixed(3), sayEnd: 0 }));
timings.forEach((tm, i) => { tm.end = i < timings.length - 1 ? timings[i + 1].start : total; tm.sayEnd = i < timings.length - 1 ? timings[i + 1].start : total; });
writeFileSync(join(ROOT, "src/brands/story/minard-timings.json"), JSON.stringify({ total, beats: timings }, null, 2));
console.log(`narration.mp3 written, ${total.toFixed(1)}s, ${beats.length} beats timed`);

// --- regenerate the ambient bed at the new length (local, no network) ---
function writeWav(path, { sampleRate, channels, bits }, pcm) {
  const byteRate = sampleRate * channels * (bits / 8), blockAlign = channels * (bits / 8), h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32); h.writeUInt16LE(bits, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}
(function bed(totalSec) {
  const sr = 44100, ch = 2, N = Math.ceil(totalSec * sr), L = new Float32Array(N), R = new Float32Array(N);
  const Dm = [146.83, 174.61, 220], Bb = [116.54, 174.61, 220], F = [130.81, 174.61, 261.63], Am = [110, 164.81, 220];
  const prog = [Dm, Bb, F, Am], slotDur = 6, xf = 2.2, partials = [[1, 1], [2, .28], [3, .1]];
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
  writeWav(join(AUD, "bed.wav"), { sampleRate: sr, channels: ch, bits: 16 }, pcm);
})(total);
console.log("bed.wav regenerated. Done.");
