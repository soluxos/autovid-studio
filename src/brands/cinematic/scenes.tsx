import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "../../engine/types";
import { timeOfPhrase } from "../../engine/timing";
import { CineMedia, CineScrims, V } from "./media";
import { DispatchChrome, Reveal, Wipe, CountUp, Kicker, Pill, useMediaInk } from "./chrome";

const lines = (s: string) => String(s ?? "").split("\n");

const Stage: React.FC<{ src?: string; seed?: number; children: React.ReactNode; chrome: React.ReactNode }> = ({ src, seed, children, chrome }) => (
  <AbsoluteFill>
    <CineMedia src={src} seed={seed} />
    <CineScrims />
    {children}
    {chrome}
  </AbsoluteFill>
);

const display = (size: number): React.CSSProperties => ({
  fontFamily: V("font-display"), fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: "-.025em", margin: 0,
});

/** Title card that opens a video. */
export const OpenerScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  const ink = useMediaInk();
  return (
    <Stage src={p.mediaSrc} seed={p.seed ?? 1}
      chrome={<DispatchChrome topLeft={p.topLeft} topRight={p.topRight} source={p.source} progressLabel={p.progressLabel} />}>
      <div style={{ position: "absolute", left: 48, right: 48, bottom: 360, zIndex: 7 }}>
        <Reveal delaySec={0.05} style={{ marginBottom: 18 }}><Kicker accent>{p.kicker}</Kicker></Reveal>
        <h1 style={{ ...display(84), color: ink.strong }}>
          {lines(p.title).map((ln: string, i: number) => <Wipe key={i} delaySec={0.12 + i * 0.12}>{ln}</Wipe>)}
        </h1>
        {p.sub ? <Reveal delaySec={0.5} style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 46, height: 3, background: ink.accent }} />
            <span style={{ fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".08em", color: ink.soft }}>{p.sub}</span>
          </div>
        </Reveal> : null}
      </div>
    </Stage>
  );
};

/** The per-item segment: a subject on full-bleed media with a headline, an
 *  animated stat, and tags — the dynamic workhorse (one game, one fact). */
export const ItemScene: React.FC<SceneProps> = ({ scene, spec }) => {
  const p = scene.props as any;
  const ink = useMediaInk();
  const stat = p.stat as undefined | { value: number; label?: string; prefix?: string; suffix?: string; plain?: boolean; statPhrase?: string };
  const phraseAt = stat?.statPhrase ? timeOfPhrase(spec.words, stat.statPhrase) : null;
  const statDelay = phraseAt !== null ? Math.max(0, phraseAt - scene.startSec) : 0.45;
  const tags: string[] = p.tags ?? [];
  return (
    <Stage src={p.mediaSrc} seed={p.seed ?? scene.id.length}
      chrome={<DispatchChrome topLeft={p.topLeft} topRight={p.topRight} source={p.source} progressLabel={p.progressLabel} index={p.index} total={p.total} />}>
      <div style={{ position: "absolute", left: 48, right: 48, bottom: 300, zIndex: 7 }}>
        <Reveal delaySec={0.05} style={{ marginBottom: 12 }}><Kicker>{p.kicker}</Kicker></Reveal>
        <h1 style={{ ...display(66), color: ink.strong }}>
          {lines(p.title).map((ln: string, i: number) => <Wipe key={i} delaySec={0.14 + i * 0.1}>{ln}</Wipe>)}
        </h1>
        {stat ? (
          <Reveal delaySec={statDelay} style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 14 }}>
            <CountUp to={stat.value} delaySec={statDelay} prefix={stat.prefix} suffix={stat.suffix} plain={stat.plain}
              style={{ ...display(64), color: ink.accent }} />
            {stat.label ? <span style={{ fontFamily: V("font-mono"), fontSize: 17, letterSpacing: ".14em", textTransform: "uppercase", color: ink.soft }}>{stat.label}</span> : null}
          </Reveal>
        ) : null}
        {tags.length ? (
          <Reveal delaySec={(stat ? statDelay : 0.3) + 0.18} style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            {tags.map((x, i) => <Pill key={i}>{x}</Pill>)}
          </Reveal>
        ) : null}
      </div>
    </Stage>
  );
};

/** A big centered statement over media — for history beats / punchlines. */
export const StatementScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  const ink = useMediaInk();
  return (
    <Stage src={p.mediaSrc} seed={p.seed ?? 3}
      chrome={<DispatchChrome topLeft={p.topLeft} topRight={p.topRight} source={p.source} progressLabel={p.progressLabel} index={p.index} total={p.total} />}>
      <div style={{ position: "absolute", left: 56, right: 56, top: "50%", transform: "translateY(-50%)", zIndex: 7 }}>
        <Reveal delaySec={0.05} style={{ marginBottom: 16 }}><Kicker accent>{p.kicker}</Kicker></Reveal>
        <h1 style={{ ...display(56), lineHeight: 1.05, color: ink.strong }}>
          {lines(p.text).map((ln: string, i: number) => <Wipe key={i} delaySec={0.12 + i * 0.1}>{ln}</Wipe>)}
        </h1>
        {p.attribution ? <Reveal delaySec={0.5} style={{ marginTop: 20 }}>
          <span style={{ fontFamily: V("font-mono"), fontSize: 18, letterSpacing: ".06em", color: ink.soft }}>— {p.attribution}</span>
        </Reveal> : null}
      </div>
    </Stage>
  );
};

/** Closing CTA. */
export const CloserScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  const ink = useMediaInk();
  return (
    <Stage src={p.mediaSrc} seed={p.seed ?? 5}
      chrome={<DispatchChrome topLeft={p.topLeft} topRight={p.topRight} source={p.source} progressLabel={p.progressLabel} />}>
      <div style={{ position: "absolute", left: 48, right: 48, bottom: 360, zIndex: 7 }}>
        <h1 style={{ ...display(80), color: ink.strong }}>
          {lines(p.title).map((ln: string, i: number) => <Wipe key={i} delaySec={0.1 + i * 0.12}>{ln}</Wipe>)}
        </h1>
        <Reveal delaySec={0.5} style={{ marginTop: 22 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 20px", borderRadius: 999, background: ink.accent, color: "var(--accent-ink)", fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".04em" }}>
            {p.cta}
          </div>
        </Reveal>
      </div>
    </Stage>
  );
};

export const CineFallback: React.FC<SceneProps> = ({ scene }) => (
  <Stage chrome={null}>
    <div style={{ position: "absolute", left: 48, bottom: 300, color: "#fff", fontFamily: V("font-mono") }}>unknown scene: {scene.type}</div>
  </Stage>
);
