import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { EngineVideo } from "@engine/engine/Video";
import { getKit } from "@engine/engine/registry";
import { api } from "./api";

// TEXT-OVERLAP QA PROBE — the automated enforcement of the design law
// ".claude/skills/video-design/SKILL.md §5: no label may ever collide with
// another label". Loaded instead of the normal UI when location.hash is
// "#qa/<slug>". It mounts the exact same Remotion <Player> composition that
// story:render encodes, steps deterministic sample times through every beat,
// measures every rendered text box in the player DOM, and reports pairwise
// intersections on window.__QA_RESULT. Drivers: scripts/qa-story.mjs (CLI),
// electron/services/qa.ts (hidden window behind the story:qa IPC / render gate).

export interface QaOverlap { time: number; textA: string; textB: string; overlapPx: number }

declare global { interface Window { __QA_RESULT?: any } }

const W = 1080, H = 1920, FPS = 30;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
/** Two paints if the compositor is ticking; a timeout fallback so a hidden
 *  (non-painting) window can never stall the probe — layout is what we measure
 *  and getBoundingClientRect forces it synchronously. */
async function paintSettle() {
  await Promise.race([(async () => { await raf(); await raf(); })(), sleep(150)]);
  await sleep(40);
}

/** SAMPLE TIMES — per beat: just after the entrance has landed (start+0.45s),
 *  mid-beat (everything settled), and just before the exit (end-0.6s). */
function sampleTimes(timings: { total: number; beats: { start: number; end: number }[] }): number[] {
  const out: number[] = [];
  for (const b of timings.beats) {
    const dur = b.end - b.start;
    const c = [b.start + 0.45, b.start + dur / 2, b.end - 0.6]
      .filter((t) => t > b.start + 0.02 && t < b.end - 0.02 && t < timings.total);
    if (c.length === 0 && dur > 0.1) c.push(b.start + dur / 2);
    out.push(...c);
  }
  // dedupe on frame boundaries, keep chronological
  const frames = Array.from(new Set(out.map((t) => Math.round(t * FPS))));
  return frames.sort((a, b) => a - b).map((f) => f / FPS);
}

interface Box { el: Element; text: string; r: { left: number; top: number; right: number; bottom: number }; inline: boolean }

const intersect = (a: Box["r"], b: Box["r"]) => {
  const left = Math.max(a.left, b.left), top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right), bottom = Math.min(a.bottom, b.bottom);
  return right > left && bottom > top ? { left, top, right, bottom } : null;
};
const area = (r: Box["r"]) => (r.right - r.left) * (r.bottom - r.top);

/** Multiply opacity up the ancestor chain; display:none / visibility:hidden
 *  anywhere kills the element (this is what hides CountNumber's invisible
 *  width-reservation span). */
function effectiveOpacity(el: Element, stage: Element): number {
  let o = 1;
  for (let n: Element | null = el; n && n !== stage.parentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden") return 0;
    o *= parseFloat(cs.opacity || "1") || 0;
    if (o <= 0.05) return o;
  }
  return o;
}

/** BoundingClientRect clipped by every overflow-hiding ancestor (so a caption
 *  line mid-entrance, translated inside its overflow:hidden line box, is only
 *  measured where it is actually visible) and by the stage itself. */
function clippedRect(el: Element, stage: Element): Box["r"] | null {
  let r: Box["r"] | null = el.getBoundingClientRect();
  for (let n = el.parentElement; n && r; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") r = intersect(r, n.getBoundingClientRect());
    if (n === stage) break;
  }
  return r ? intersect(r, stage.getBoundingClientRect()) : null;
}

/** All TEXT carriers: elements with a direct non-empty text node, plus SVG
 *  <text> (its tspans are covered by the <text> box itself). */
function collectTextElements(stage: Element): { el: Element; text: string }[] {
  const out: { el: Element; text: string }[] = [];
  for (const el of Array.from(stage.querySelectorAll("*"))) {
    if (el instanceof SVGElement) {
      if (!(el instanceof SVGTextElement)) continue;
    } else {
      let direct = false;
      for (const n of Array.from(el.childNodes))
        if (n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim()) { direct = true; break; }
      if (!direct) continue;
    }
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (text) out.push({ el, text });
  }
  return out;
}

/** One sample: measure every visible text box, report pairwise intersections
 *  over 4% of the smaller box. Ancestor/descendant pairs and inline siblings
 *  flowing in the same line box are legitimate, not overlaps. */
function scanOverlaps(stage: Element, time: number, scale: number): { hits: QaOverlap[]; boxCount: number } {
  const boxes: Box[] = [];
  for (const { el, text } of collectTextElements(stage)) {
    if (effectiveOpacity(el, stage) <= 0.05) continue;
    const r = clippedRect(el, stage);
    if (!r || r.right - r.left <= 2 || r.bottom - r.top <= 2) continue;
    boxes.push({ el, text, r, inline: !(el instanceof SVGElement) && getComputedStyle(el).display === "inline" });
  }
  const hits: QaOverlap[] = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const A = boxes[i], B = boxes[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    if (A.inline && B.inline && A.el.parentElement === B.el.parentElement) continue;
    const ix = intersect(A.r, B.r);
    if (!ix) continue;
    const overlap = area(ix);
    if (overlap <= 0.04 * Math.min(area(A.r), area(B.r))) continue;
    hits.push({
      time: +time.toFixed(2),
      textA: A.text.slice(0, 48), textB: B.text.slice(0, 48),
      overlapPx: Math.round(overlap / (scale * scale)),   // composition px²
    });
  }
  return { hits, boxCount: boxes.length };
}

const finish = (data: object) => { window.__QA_RESULT = { done: true, ...data }; };

const PlayerComp: React.FC<{ spec: any; themeOverride?: any }> = ({ spec, themeOverride }) => (
  <EngineVideo spec={spec} brand={getKit(spec.kit)} themeOverride={themeOverride} />
);

export const QAProbe: React.FC = () => {
  const slug = useMemo(() => window.location.hash.replace(/^#qa\/?/, "").trim(), []);
  const [payload, setPayload] = useState<{ spec: any; theme: any; samples: number[] } | null>(null);
  const [status, setStatus] = useState("loading story…");
  const playerRef = useRef<PlayerRef>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // 1. load script + timings + brand theme; build the same spec story:render uses
  useEffect(() => {
    (async () => {
      try {
        if (!slug) throw new Error("No story in hash — expected #qa/<slug>.");
        const [st, sr, tr] = await Promise.all([api.getState(), api.storyGet(slug), api.storyGetTimings(slug)]);
        if (!sr.ok) throw new Error(sr.error);
        if (!tr.ok) throw new Error(tr.error);
        const script = JSON.parse(sr.json);
        const timings = tr.timings;
        const preset = st.brands.find((b) => b.id === (script.brand || "minard")) ?? st.brands[0];
        const theme = { ...preset.theme, edition: script.context || preset.theme.edition };
        // Same spec as electron/services/stories.ts>renderStory, minus audio:
        // the probe measures TEXT and a missing/looping audio source would put
        // the Player into a fatal error state.
        const spec = {
          fps: FPS, width: W, height: H, brand: script.brand || "minard", kit: "story", words: [],
          scenes: [{ id: "s0", type: "doc", startSec: 0, endSec: timings.total, props: { script, timings } }],
        };
        window.__QA_RESULT = { done: false, status: "mounting player" };
        setPayload({ spec, theme, samples: sampleTimes(timings) });
      } catch (e: any) {
        setStatus("error: " + (e?.message ?? String(e)));
        finish({ slug, error: e?.message ?? String(e) });
      }
    })();
  }, [slug]);

  // 2. step the sample times through the player and measure
  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    (async () => {
      try {
        await (document as any).fonts?.ready;
        await sleep(700); // player mount + first frame + font swap settle
        const stage = stageRef.current;
        const player = playerRef.current;
        if (!stage || !player) throw new Error("QA player did not mount.");
        player.pause();
        const scale = stage.getBoundingClientRect().width / W;
        const overlaps: QaOverlap[] = [];
        const boxCounts: number[] = [];   // measured text boxes per sample — a sanity signal against vacuous passes
        for (let i = 0; i < payload.samples.length; i++) {
          if (cancelled) return;
          const t = payload.samples[i];
          player.seekTo(Math.round(t * FPS));
          await paintSettle();
          const { hits, boxCount } = scanOverlaps(stage, t, scale);
          overlaps.push(...hits);
          boxCounts.push(boxCount);
          window.__QA_RESULT = { done: false, status: `sampled ${i + 1}/${payload.samples.length}` };
          setStatus(`sampled ${i + 1}/${payload.samples.length} · ${overlaps.length} overlap(s)`);
        }
        setStatus(overlaps.length ? `FAIL — ${overlaps.length} overlap(s)` : "PASS — no overlapping text");
        finish({ slug, samples: payload.samples.length, overlaps, boxCounts });
      } catch (e: any) {
        setStatus("error: " + (e?.message ?? String(e)));
        finish({ slug, error: e?.message ?? String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [payload]);

  // Fit the 1080x1920 composition into the window; measurements normalize by
  // the actual on-screen scale so results are in composition pixels.
  const fit = Math.min((window.innerWidth - 32) / W, (window.innerHeight - 64) / H);
  return (
    <div style={{ fontFamily: "system-ui", background: "#141416", color: "#ddd", minHeight: "100vh", padding: 8 }}>
      <div data-testid="qa-status" style={{ fontSize: 12, padding: "4px 6px 8px" }}>QA {slug} — {status}</div>
      {payload && (
        <div ref={stageRef} style={{ width: Math.floor(W * fit), height: Math.floor(H * fit), position: "relative" }}>
          <Player
            ref={playerRef}
            component={PlayerComp as any}
            inputProps={{ spec: payload.spec, themeOverride: payload.theme }}
            durationInFrames={Math.max(1, Math.round(payload.spec.scenes[0].endSec * FPS) + 1)}
            fps={FPS} compositionWidth={W} compositionHeight={H}
            style={{ width: "100%", height: "100%" }}
            controls={false} autoPlay={false} loop={false} doubleClickToFullscreen={false}
          />
        </div>
      )}
    </div>
  );
};
