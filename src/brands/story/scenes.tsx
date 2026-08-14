import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../../engine/types";
import { useTheme } from "../../engine/brand";
import { MinardMap } from "./MinardMap";
import { ParallaxDepth } from "./parallax";
import { CrumpledPaper } from "./CrumpledPaper";
import { StorySfx, Cue } from "./Sfx";
import { ADVANCE, RETREAT, sampleRoute } from "./minard-data";
import { pickInk } from "./a11y";
import BEATS from "./minard-beats.json";
import TIMING from "./minard-timings.json";

const V = (n: string) => `var(--${n})`;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2) || "0", 16), g = parseInt(h.slice(2, 4) || "0", 16), b = parseInt(h.slice(4, 6) || "0", 16);
  return `rgba(${r},${g},${b},${a})`;
};

const T = TIMING.beats;
const idx = (pred: (b: any) => boolean) => BEATS.map((b, i) => (pred(b) ? i : -1)).filter((i) => i >= 0);
const ADV = idx((b) => b.map === "advance"), RET = idx((b) => b.map === "retreat");
const INTRO_START = T[idx((b) => b.map === "intro")[0]].start;
const ADV_START = T[ADV[0]].start, ADV_END = T[ADV[ADV.length - 1]].end;
const RET_START = T[RET[0]].start, RET_END = T[RET[RET.length - 1]].end;
const REVEAL_START = T[idx((b) => b.map === "reveal")[0]].start;
const NAP = idx((b) => b.image === "napoleon"), RETI = idx((b) => b.image === "retreat")[0];
const NA = { start: T[NAP[0]].start, end: T[NAP[NAP.length - 1]].end };
const REM = { start: T[RETI].start, end: T[RETI].end };
const ann = (key: string) => { const i = idx((b) => b.annot === key)[0]; return i == null ? null : T[i]; };
const A_WIDTH = ann("width"), A_ROUTE = ann("route"), A_RETBAND = ann("retreatband"), A_TEMP = ann("temp");

const fade = (t: number, s: number, e: number, fin = 0.5, fout = 0.6) => clamp((t - s) / fin) * clamp((e - t) / fout);

const EMPH = /(422,000|10,000|quarter|One in forty|three in four)/g;
const Caption: React.FC<{ text: string; base: string; accent: string }> = ({ text, base, accent }) => (
  <>{text.split(EMPH).map((seg, i) => i % 2
    ? <span key={i} style={{ background: accent, color: "#fff", padding: "0 .12em", borderRadius: 8, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" } as React.CSSProperties}>{seg}</span>
    : <span key={i} style={{ color: base }}>{seg}</span>)}</>
);

const Line: React.FC<{ text: string; t: number; start: number; base: string; accent: string }> = ({ text, t, start, base, accent }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: (t - start) * fps, fps, config: { damping: 30, stiffness: 200, mass: 1 } });
  return (
    <span style={{ display: "block", overflow: "hidden", padding: "2px 0" }}>
      <span style={{ display: "inline-block", transform: `translateY(${interpolate(s, [0, 1], [110, 0])}%)`, fontFamily: V("font-display"), fontWeight: 700, fontSize: 58, lineHeight: 1.16, letterSpacing: "-.02em" }}>
        <Caption text={text} base={base} accent={accent} />
      </span>
    </span>
  );
};

export const MinardStory: React.FC<SceneProps> = () => {
  const theme = useTheme();
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  const winter = theme.accent;

  // map draw progress (intro holds a starting chunk so the width reads)
  const pAdv = t < ADV_START
    ? interpolate(t, [INTRO_START, INTRO_START + 0.7], [0, 0.14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(t, [ADV_START, ADV_END], [0.14, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pRet = interpolate(t, [RET_START, RET_END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const naO = fade(t, NA.start, NA.end, 0.6, 0.5);
  const reO = fade(t, REM.start, REM.end);
  const mapOpacity = clamp((t - (INTRO_START - 0.3)) / 0.3) * (1 - reO);
  const showTemp = A_TEMP ? t >= A_TEMP.start - 0.2 : false;

  const mapAnn = {
    width: A_WIDTH ? fade(t, A_WIDTH.start, ADV_START + 0.4, 0.4, 0.4) : 0,
    route: A_ROUTE ? fade(t, A_ROUTE.start, ADV_END + 0.4, 0.4, 0.7) : 0,
    retreat: A_RETBAND ? fade(t, A_RETBAND.start, RET_END, 0.4, 0.7) : 0,
    temp: A_TEMP ? fade(t, A_TEMP.start, RET_END, 0.4, 0.7) : 0,
  };

  // reveal: pull back to show the whole chart, with a title
  const rev = interpolate(t, [REVEAL_START, REVEAL_START + 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  // intro: start zoomed on the first band (the "422,000 men" moment), then pull
  // back to reveal the whole route as the advance draws — fills the frame.
  const introZoom = interpolate(t, [ADV_START - 1.1, ADV_START], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const introTransform = `translate(${introZoom * 360}px, ${introZoom * 250}px) scale(${1 + introZoom * 0.55})`;

  // active beat + surface
  let bi = BEATS.length - 1;
  for (let i = 0; i < T.length; i++) if (t >= T[i].start && t < T[i].end) { bi = i; break; }
  const beat = BEATS[bi];
  const overImage = Math.max(naO, reO) > 0.5;
  const ink = pickInk(overImage ? "#151210" : theme.paper, theme.ink);
  const ink2 = overImage ? "rgba(255,255,255,0.72)" : theme.ink2;

  // counter
  let count: number, label: string, countColor = ink;
  if (t < ADV_START) { count = interpolate(t, [0.4, NA.end], [0, 422000], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); label = "men set out"; }
  else if (t < RET_START) { count = sampleRoute(ADVANCE, pAdv).lead.n; label = pAdv < 1 ? "still marching" : "reached Moscow"; }
  else { count = sampleRoute(RETREAT, pRet).lead.n; label = pRet < 1 ? "still alive" : "came home"; countColor = overImage ? "#ff8a7a" : winter; }
  const curTemp = t >= RET_START ? sampleRoute(RETREAT, pRet).lead.temp : undefined;

  const counterSpring = spring({ frame: (t - 0.3) * fps, fps, config: { damping: 30, stiffness: 200, mass: 1 } });
  const progress = frame / durationInFrames;

  // subtle sound design: a tick as each caption appears, whooshes on scene
  // changes, risers as the infographic draws, impacts on the big numbers.
  const sfx: Cue[] = [
    // a tactile paper click as each caption line wipes in (kept low under the VO)
    ...BEATS.flatMap((b, i) => b.lines.map((_, j) => ({ at: T[i].start + j * 0.09, src: "audio/sfx/tick.mp3", vol: 0.14, len: 0.5 }))),
    { at: 0.35, src: "audio/sfx/thud.mp3", vol: 0.15, len: 1.2 },
    { at: INTRO_START - 0.1, src: "audio/sfx/whoosh.mp3", vol: 0.15, len: 1 },
    { at: ADV_START, src: "audio/sfx/riser.mp3", vol: 0.09, len: 3 },
    { at: REM.start - 0.12, src: "audio/sfx/whoosh.mp3", vol: 0.18, len: 1.2 },
    { at: RET_START, src: "audio/sfx/riser.mp3", vol: 0.08, len: 3 },
    { at: RET_END - 0.3, src: "audio/sfx/thud.mp3", vol: 0.15, len: 1.2 },
    { at: REVEAL_START - 0.1, src: "audio/sfx/swell.mp3", vol: 0.11, len: 3.2 },
  ];

  return (
    <AbsoluteFill>
      <StorySfx cues={sfx} />
      <CrumpledPaper />

      {/* our redrawn infographic — pulls back into a titled chart at the reveal */}
      {mapOpacity > 0 && (
        <div style={{ opacity: mapOpacity, transform: `translateY(${-rev * 24}px) scale(${1 - rev * 0.16})`, transformOrigin: "540px 600px" }}>
          <div style={{ transform: introTransform, transformOrigin: "74px 470px" }}>
            <MinardMap pAdv={pAdv} pRet={pRet} showTemp={showTemp} ann={mapAnn} />
          </div>
        </div>
      )}

      {/* reveal title */}
      {rev > 0.01 && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 180, textAlign: "center", opacity: rev }}>
          <div style={{ fontFamily: V("font-display"), fontStyle: "italic", fontWeight: 600, fontSize: 46, color: theme.ink }}>Carte Figurative</div>
          <div style={{ fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".14em", textTransform: "uppercase", color: theme.ink2, marginTop: 8 }}>Napoleon's Russian campaign · 1869</div>
        </div>
      )}

      {/* layered depth imagery */}
      <ParallaxDepth bg="images/minard/napoleon.jpg" fg="images/minard/napoleon-cutout.png" cam={interpolate(t, [NA.start, NA.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) })} opacity={naO} />
      <ParallaxDepth bg="images/minard/retreat.jpg" fg="images/minard/retreat-rider.png" cam={interpolate(t, [REM.start, REM.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) })} opacity={reO} />

      {overImage && <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 16%, transparent 44%, rgba(0,0,0,0.62) 78%, rgba(0,0,0,0.78) 100%)", pointerEvents: "none" }} />}

      {/* header */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 60, display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".16em", textTransform: "uppercase", color: overImage ? "rgba(255,255,255,0.82)" : theme.ink2 }}>
        <span>1812 · The Russian Campaign</span><span style={{ color: overImage ? "#ff8a7a" : winter }}>Data story</span>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 96, height: 2, background: overImage ? "rgba(255,255,255,0.25)" : hexA(theme.ink, 0.13) }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: overImage ? "#ff8a7a" : winter }} />
      </div>

      {/* narration */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 640, opacity: clamp((T[bi].end - t) / 0.4) }}>
        {beat.lines.map((ln, i) => <Line key={bi + "-" + i} text={ln} t={t} start={T[bi].start + i * 0.09} base={ink} accent={winter} />)}
      </div>

      {/* counter — the number counts on its own; the temperature is a FIXED,
          separate readout so the changing number can never shift it */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 1360, opacity: counterSpring * (1 - rev * 0.85) }}>
        <span style={{ display: "block", fontFamily: V("font-display"), fontWeight: 700, fontSize: 132, lineHeight: 0.9, letterSpacing: "-.04em", color: countColor, fontVariantNumeric: "tabular-nums" }}>{Math.round(count).toLocaleString()}</span>
        <div style={{ fontFamily: V("font-mono"), fontSize: 25, letterSpacing: ".14em", textTransform: "uppercase", color: ink2, marginTop: 10 }}>{label}</div>
        {curTemp != null && (
          <div style={{ position: "absolute", right: 0, top: 8, textAlign: "right" }}>
            <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 72, lineHeight: 0.9, color: overImage ? "#ff8a7a" : winter, fontVariantNumeric: "tabular-nums" }}>{Math.round(curTemp)}°C</div>
            <div style={{ fontFamily: V("font-mono"), fontSize: 22, letterSpacing: ".14em", textTransform: "uppercase", color: ink2, marginTop: 8 }}>Temperature</div>
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 58, display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".08em", color: ink2 }}>
        <span>After Minard, 1869</span><span>{theme.handle}</span>
      </div>
    </AbsoluteFill>
  );
};

export const StoryFallback: React.FC<SceneProps> = ({ scene }) => (
  <AbsoluteFill style={{ background: V("paper"), color: "#a33", fontFamily: V("font-mono"), padding: 60 }}>unknown story scene: {scene.type}</AbsoluteFill>
);
