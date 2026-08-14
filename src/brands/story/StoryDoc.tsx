import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../../engine/types";
import { useTheme } from "../../engine/brand";
import { getSurface } from "./surfaces";
import { ParallaxDepth, FullBleed, AtmosphereMedia, isVideoSrc } from "./parallax";
import { DataBlock } from "./blocks";
import { StorySfx, Cue } from "./Sfx";
import { pickInk, luminance } from "./a11y";
import type { DocProps, ScriptBeat, VideoScript, DocTimings } from "./doc-types";

const V = (n: string) => `var(--${n})`;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2) || "0", 16), g = parseInt(h.slice(2, 4) || "0", 16), b = parseInt(h.slice(4, 6) || "0", 16);
  return `rgba(${r},${g},${b},${a})`;
};
const fade = (t: number, s: number, e: number, fin = 0.45, fout = 0.5) => clamp((t - s) / fin) * clamp((e - t) / fout);
const isImg = (b?: ScriptBeat["visual"]) => b?.type === "image";
const backOut = (p: number) => { const q = clamp(p) - 1; return 1 + 2.70158 * q ** 3 + 1.70158 * q ** 2; };

// MOTION LAW (hard-learned): the camera moves CONTENT, never the caption or the
// chrome. Text lives in a fixed safe area and can never drift or clip. Every
// move is motivated by the beat itself: images get the cinematic push (inside
// their own layer), a stat gets a slow focus push + a landing kick on the
// number, charts get their entrance cascade, statements stay calm, and the
// final payoff is perfectly still.

/** Decaying landing kick — applied to the stat block only, never the frame. */
function landKick(t: number, at: number): { x: number; y: number } {
  const q = t - at;
  if (q <= 0 || q > 0.4) return { x: 0, y: 0 };
  const d = Math.exp(-q * 11);
  return { x: 4 * d * Math.sin(q * 44), y: 3 * d * Math.cos(q * 36) };
}

// ------------------------------------------------------------ bg atmosphere
// Blended imagery UNDER a beat's blocks/captions (ScriptBeat.bg, else the
// story-level fallback; `bg: null` opts a beat out). Consecutive beats sharing
// one src render as a single run (no re-fade mid-run); adjacent runs with
// DIFFERENT imagery crossfade 0.5s; beats without bg keep the clean surface.
interface BgRun {
  src: string; start?: number;
  s: number; e: number;             // seconds, from the beat timings
  adjBefore: boolean; adjAfter: boolean; // another run touches this edge -> true crossfade
}

function bgRunsOf(script: VideoScript, T: DocTimings["beats"]): BgRun[] {
  const runs: (BgRun & { eIdx: number })[] = [];
  script.beats.forEach((b, i) => {
    const g = b.bg === null ? undefined : (b.bg ?? script.bg);
    if (!g?.src || !T[i]) return;   // unresolved footage query = clean surface
    const prev = runs[runs.length - 1];
    if (prev && prev.eIdx === i - 1 && prev.src === g.src && (prev.start ?? 0) === (g.start ?? 0)) {
      prev.e = T[i].end; prev.eIdx = i; return;
    }
    runs.push({ src: g.src, start: g.start, s: T[i].start, e: T[i].end, eIdx: i, adjBefore: false, adjAfter: false });
  });
  for (let i = 1; i < runs.length; i++) {
    if (Math.abs(runs[i].s - runs[i - 1].e) < 0.05) { runs[i].adjBefore = true; runs[i - 1].adjAfter = true; }
  }
  return runs;
}

// ---------------------------------------------------------------- captions
const EMPH = /(\d[\d,\.]*(?:%|°|k|K)?)/g;
const Caption: React.FC<{ text: string; base: string; accent: string }> = ({ text, base, accent }) => (
  <>{text.split(EMPH).map((seg, i) => i % 2
    ? <span key={i} style={{ background: accent, color: "#fff", padding: "0 .12em", borderRadius: 8, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" } as React.CSSProperties}>{seg}</span>
    : <span key={i} style={{ color: base }}>{seg}</span>)}</>
);
// JITTER LAW: text rides critically-damped springs (no ring) and is never
// scaled continuously — glyphs re-raster under sustained scale and shimmer.
const Line: React.FC<{ text: string; t: number; start: number; base: string; accent: string; size?: number }> = ({ text, t, start, base, accent, size = 58 }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: (t - start) * fps, fps, config: { damping: 200 } });
  return (
    <span style={{ display: "block", overflow: "hidden", padding: "2px 0" }}>
      <span style={{ display: "inline-block", transform: `translateY(${interpolate(s, [0, 1], [110, 0])}%)`, fontFamily: V("font-display"), fontWeight: 700, fontSize: size, lineHeight: 1.16, letterSpacing: "-.02em" }}>
        <Caption text={text} base={base} accent={accent} />
      </span>
    </span>
  );
};

/** Generic data-story renderer. Motion is bespoke to each beat's content;
 *  captions and chrome are locked in a safe area, always fully visible. */
export const StoryDoc: React.FC<DocProps> = ({ script, timings, logo }) => {
  const theme = useTheme();
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const T = timings.beats;
  const winter = theme.accent;

  let bi = script.beats.length - 1;
  for (let i = 0; i < T.length; i++) if (t >= T[i].start && t < T[i].end) { bi = i; break; }
  const beat = script.beats[bi];
  const overImage = isImg(beat.visual) && fade(t, T[bi].start, T[bi].end) > 0.4;
  const ink = pickInk(overImage ? "#151210" : theme.paper, theme.ink);
  const ink2 = overImage ? "rgba(255,255,255,0.72)" : theme.ink2;
  const progress = frame / durationInFrames;
  const isLast = bi === script.beats.length - 1;

  // SFX
  const sfx: Cue[] = [
    ...script.beats.flatMap((b, i) => b.lines.map((_, j) => ({ at: T[i].start + j * 0.09, src: "audio/sfx/tick.mp3", vol: 0.14, len: 0.5 }))),
    ...script.beats.map((b, i) =>
      b.visual?.type === "image" ? { at: T[i].start - 0.1, src: "audio/sfx/whoosh.mp3", vol: 0.17, len: 1.1 } :
      b.visual?.type === "bars" || b.visual?.type === "line" || b.visual?.type === "globezoom" ? { at: T[i].start, src: "audio/sfx/riser.mp3", vol: 0.09, len: 2.4 } :
      b.visual?.type === "stat" ? { at: T[i].start + 0.55, src: "audio/sfx/thud.mp3", vol: 0.14, len: 1.1 } :
      { at: -1, src: "audio/sfx/tick.mp3", vol: 0 }
    ).filter((c) => c.at >= 0),
  ];
  const blockColors = { ink: theme.ink, ink2: theme.ink2, accent: theme.accent };

  return (
    <AbsoluteFill style={{ background: theme.paper }}>
      <StorySfx cues={sfx} />
      {React.createElement(getSurface(script.surface, script.title))}

      {/* bg atmosphere — toned + blended imagery under everything but the
          surface; low effective opacity so blocks/captions stay fully
          legible. NOTE: the media element carries its own blend + opacity —
          a parent opacity would isolate the blend from the surface below. */}
      {(() => {
        const darkPaper = luminance(theme.paper) < 0.5;
        const XF = 0.5, LEAD = 0.25; // fade time; half-overlap for true crossfades
        return bgRunsOf(script, T).map((r, k) => {
          const lead = r.adjBefore ? LEAD : 0, tail = r.adjAfter ? LEAD : 0;
          const o = clamp((t - (r.s - lead)) / XF) * clamp((r.e + tail - t) / XF);
          if (o <= 0.002) return null;
          const drift = clamp((t - r.s) / Math.max(0.1, r.e - r.s));
          const media = (
            <AtmosphereMedia src={r.src} start={r.start} drift={drift} dark={darkPaper}
              opacity={o * (darkPaper ? 0.3 : 0.42)} />
          );
          return (
            <React.Fragment key={"bg" + k}>
              {isVideoSrc(r.src) ? (
                // per-run Sequence so the clip's clock starts AT the run (the
                // same trick image beats use — otherwise it arrives played out)
                <Sequence from={Math.round((r.s - lead) * fps)}
                  durationInFrames={Math.max(1, Math.round((r.e - r.s + lead + tail) * fps) + 1)}>
                  {media}
                </Sequence>
              ) : media}
              {/* paper wash + vignette pull the edges back toward the clean
                  surface (dark themes: this is the ink wash — paper IS ink-dark) */}
              <AbsoluteFill style={{ background: theme.paper, opacity: o * 0.22, pointerEvents: "none" }} />
              <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 42%, transparent 50%, ${hexA(theme.paper, 0.6)} 100%)`, opacity: o, pointerEvents: "none" }} />
            </React.Fragment>
          );
        });
      })()}

      {/* per-beat visuals; each carries its own motivated motion */}
      {script.beats.map((b, i) => {
        const o = fade(t, T[i].start, T[i].end);
        if (o <= 0.002 || !b.visual) return null;
        const tl = t - T[i].start, dur = T[i].end - T[i].start;
        // globezoom is a camera move, not a cascade — give it room to travel
        const ramp = b.visual.type === "globezoom" ? Math.min(3.4, Math.max(2.4, dur * 0.75)) : Math.min(1.3, dur * 0.7);
        const p = clamp(tl / ramp);
        if (b.visual.type === "image") {
          if (!b.visual.src) return null;   // footage query not yet resolved
          const camI = interpolate(t, [T[i].start, T[i].end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
          const layer = b.visual.cutout
            ? <ParallaxDepth bg={b.visual.src} fg={b.visual.cutout} cam={camI} opacity={o} />
            : <FullBleed src={b.visual.src} cam={camI} opacity={o} start={b.visual.start} />;
          // each beat gets its own Sequence so a video clip's clock starts AT
          // the beat (otherwise it plays from composition start and arrives
          // frozen on its last frame by the time the beat appears)
          return (
            <Sequence key={i} from={Math.round(T[i].start * fps)} durationInFrames={Math.max(1, Math.round(dur * fps) + 1)}>
              {layer}
            </Sequence>
          );
        }
        // graphics: rise in with an overshoot settle (translate only — text is
        // never scaled), then hold rock-still; their internal cascade IS the motion
        const enter = backOut(tl / 0.55);
        const leave = clamp((T[i].end - t) / 0.5);
        const kick = b.visual.type === "stat" ? landKick(t, T[i].start + 0.62) : { x: 0, y: 0 };
        const yOff = interpolate(enter, [0, 1], [46, 0]) - (1 - leave) * 16;
        return (
          <AbsoluteFill key={i} style={{ opacity: o, display: "flex", alignItems: "center", justifyContent: "center", padding: "300px 50px 620px" }}>
            <div style={{ transform: `translate(${kick.x}px, ${yOff + kick.y}px)` }}>
              <DataBlock block={b.visual} p={p} c={blockColors} />
            </div>
          </AbsoluteFill>
        );
      })}

      {overImage && <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 18%, transparent 46%, rgba(0,0,0,0.64) 80%, rgba(0,0,0,0.8) 100%)", pointerEvents: "none" }} />}

      {/* caption — FIXED safe area, never transformed, never clipped.
          Statement beats have no visual, so the words become the hero: bigger type. */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: beat.visual && beat.visual.type !== "statement" ? 300 : 560, opacity: clamp((T[bi].end - t) / 0.4) }}>
        {beat.lines.map((ln, i) => (
          <Line key={bi + "-" + i} text={ln} t={t} start={T[bi].start + i * 0.09} base={ink} accent={winter}
            size={beat.visual && beat.visual.type !== "statement" ? 58 : 78} />
        ))}
      </div>

      {/* locked chrome */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 60, display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".16em", textTransform: "uppercase", color: overImage ? "rgba(255,255,255,0.82)" : theme.ink2 }}>
        <span>{script.context ?? script.title}</span><span style={{ color: overImage ? "#ff8a7a" : winter }}>{script.status ?? "Data story"}</span>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 96, height: 2, background: overImage ? "rgba(255,255,255,0.25)" : hexA(theme.ink, 0.13) }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: overImage ? "#ff8a7a" : winter }} />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 58, display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".08em", color: ink2 }}>
        <span>{script.title}</span><span>{theme.handle}</span>
      </div>

      {/* end: everything fades to paper, then the brand mark — small, centred */}
      {t > timings.total - 0.6 && (
        <>
          <AbsoluteFill style={{ background: theme.paper, opacity: clamp((t - (timings.total - 0.55)) / 1.0) }} />
          <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, opacity: clamp((t - (timings.total + 0.05)) / 0.6) }}>
            {logo ? (
              <Img src={staticFile(logo)} style={{ width: 128, height: 128, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 108, height: 108, borderRadius: 28, background: theme.accent, color: theme.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-display"), fontWeight: 800, fontSize: 56 }}>
                {(theme.publication || "•").slice(0, 1)}
              </div>
            )}
            <div style={{ fontFamily: V("font-mono"), fontSize: 22, letterSpacing: ".14em", color: theme.ink2 }}>{theme.handle}</div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

export const DocScene: React.FC<SceneProps> = ({ scene }) => <StoryDoc {...(scene.props as unknown as DocProps)} />;
