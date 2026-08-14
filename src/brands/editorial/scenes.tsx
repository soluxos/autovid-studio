import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "../../engine/types";
import { timeOfPhrase } from "../../engine/timing";
import { Chrome, Reveal, LineMask, Marker, Kicker, Pill, ScoreCount, RankRow, displayH1 } from "./components";
import { MediaBg, ScrimBottom, ScrimTop, Duotone, OSD } from "./overlays";
const V = (n: string) => `var(--${n})`;

const Clean: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 110 }) => (
  <AbsoluteFill style={{ background: V("paper") }}>
    <div style={{ position: "absolute", left: 52, right: 44, top, bottom: 120 }}>{children}</div>
  </AbsoluteFill>
);
const lines = (title: string) => String(title ?? "").split("\n");

export const IntroScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  return (
    <>
      <Clean top={150}>
        <div style={{ marginBottom: 22 }}><Kicker>{p.kicker}</Kicker></div>
        <h1 style={displayH1}>
          {lines(p.title).map((ln: string, i: number) => <LineMask key={i} delaySec={0.1 + i * 0.12}>{ln}</LineMask>)}
          {p.markerLine ? (
            <LineMask delaySec={0.1 + lines(p.title).length * 0.12}>
              <Marker delaySec={0.1 + lines(p.title).length * 0.12 + 0.3}>{p.markerLine}</Marker>
            </LineMask>
          ) : null}
        </h1>
        <Reveal delaySec={0.7} style={{ marginTop: 24 }}><div style={{ width: 60, height: 4, background: V("accent"), borderRadius: 2 }} /></Reveal>
        {p.sub ? <Reveal delaySec={0.82} style={{ marginTop: 18 }}><span style={{ fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".14em", color: V("ink-2") }}>{p.sub}</span></Reveal> : null}
      </Clean>
      <Chrome left={p.kicker ?? "New this week"} pageNo={p.pageNo ?? "01 / 04"} />
    </>
  );
};

export const RankingScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  const items = (p.items ?? []) as any[];
  return (
    <>
      <Clean top={120}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 16, letterSpacing: ".14em", textTransform: "uppercase", color: V("ink-2"), marginBottom: 6 }}>
          <span>Rank / Title</span><span>Score</span>
        </div>
        {items.map((it, i) => <RankRow key={i} rank={it.rank} name={it.name} meta={it.meta} score={it.score} delaySec={0.12 + i * 0.12} />)}
      </Clean>
      <Chrome left={p.heading ?? "Highest rated"} pageNo={p.pageNo ?? "02 / 04"} />
    </>
  );
};

export const SpotlightScene: React.FC<SceneProps> = ({ scene, spec }) => {
  const { fps } = useVideoConfig();
  const f = useCurrentFrame();
  const p = scene.props as any;
  const tPhrase = p.statPhrase ? timeOfPhrase(spec.words, p.statPhrase) : null;
  const delaySec = tPhrase !== null ? Math.max(0, tPhrase - scene.startSec) : 0.4;
  const pop = spring({ frame: f - delaySec * fps, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <MediaBg src={p.mediaSrc} look={p.look ?? "neon"} />
      <Duotone on={p.duotone} /><ScrimTop /><ScrimBottom /><OSD />
      <div style={{ position: "absolute", left: 44, right: 44, bottom: 150, zIndex: 6 }}>
        <Reveal delaySec={0.05}><Kicker onMedia>{p.kicker ?? "Pick of the week"}</Kicker></Reveal>
        <h1 style={{ ...displayH1, color: "#fff", fontSize: 56, marginTop: 8 }}>
          {lines(p.title).map((ln: string, i: number) => <LineMask key={i} delaySec={0.15 + i * 0.1}>{ln}</LineMask>)}
        </h1>
        <Reveal delaySec={delaySec} style={{ marginTop: 14 }}>
          <span style={{ fontFamily: V("font-mono"), fontSize: 16, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>
            {p.scoreLabel ?? "Aggregate"} <span style={{ display: "inline-block", width: 26, height: 3, background: V("accent"), verticalAlign: "middle", marginLeft: 6 }} />
          </span>
        </Reveal>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`, transformOrigin: "left" }}>
          <ScoreCount to={p.score ?? 0} delaySec={delaySec} size={96} color="#fff" />
          <span style={{ fontFamily: V("font-mono"), fontSize: 20, color: "rgba(255,255,255,0.7)" }}>/ 100</span>
        </div>
        <Reveal delaySec={delaySec + 0.15} style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {(p.pills ?? []).map((x: string, i: number) => <Pill key={i} onMedia>{x}</Pill>)}
        </Reveal>
      </div>
      <Chrome left={p.kicker ?? "Pick of the week"} pageNo={p.pageNo ?? "03 / 04"} onMedia />
    </AbsoluteFill>
  );
};

export const LowerThirdScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  return (
    <AbsoluteFill>
      <MediaBg src={p.mediaSrc} look={p.look ?? "ember"} />
      <Duotone on={p.duotone} /><ScrimTop /><OSD time={p.time ?? "1:02 / 3:18"} progress={0.54} />
      <Reveal delaySec={0.12} style={{ position: "absolute", left: 40, right: 40, bottom: 150, zIndex: 6 }}>
        <div style={{ padding: "18px 20px", borderRadius: V("radius"), background: "rgba(15,15,20,0.44)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.16)" }}>
          <div style={{ width: 34, height: 3, background: V("accent"), borderRadius: 2, marginBottom: 10 }} />
          <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 34, letterSpacing: "-.02em", color: "#fff" }}>{p.name}</div>
          <div style={{ fontFamily: V("font-mono"), fontSize: 16, letterSpacing: ".04em", color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{p.meta}</div>
        </div>
      </Reveal>
      <Chrome left={p.kicker ?? "Now playing"} pageNo={p.pageNo ?? "04 / 05"} onMedia />
    </AbsoluteFill>
  );
};

export const KeyArtScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  return (
    <AbsoluteFill>
      <MediaBg src={p.mediaSrc} look={p.look ?? "neon"} />
      <Duotone on={p.duotone} /><ScrimTop /><ScrimBottom />
      <div style={{ position: "absolute", left: 44, right: 44, bottom: 150, zIndex: 6 }}>
        <Reveal delaySec={0.05}><Kicker onMedia>{p.kicker ?? "Cover reveal"}</Kicker></Reveal>
        <h1 style={{ ...displayH1, color: "#fff", fontSize: 52, marginTop: 8 }}>
          {p.pre ? <LineMask delaySec={0.15}>{p.pre}</LineMask> : null}
          {p.markerWord ? <LineMask delaySec={0.27}><Marker delaySec={0.5}>{p.markerWord}</Marker></LineMask> : null}
        </h1>
        <Reveal delaySec={0.5} style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {(p.pills ?? []).map((x: string, i: number) => <Pill key={i} onMedia>{x}</Pill>)}
        </Reveal>
      </div>
      <Chrome left={p.kicker ?? "Announced"} pageNo={p.pageNo ?? "key art"} onMedia />
    </AbsoluteFill>
  );
};

export const InsetScene: React.FC<SceneProps> = ({ scene }) => {
  const p = scene.props as any;
  return (
    <>
      <Clean top={120}>
        <Reveal delaySec={0.04}><Kicker>{p.kicker ?? "Spotlight"}</Kicker></Reveal>
        <Reveal delaySec={0.12}><div style={{ ...displayH1, fontSize: 44, marginTop: 8 }}>{p.title}</div></Reveal>
        <Reveal delaySec={0.22} style={{ marginTop: 18 }}>
          <div style={{ position: "relative", height: 300, borderRadius: V("radius"), overflow: "hidden", border: `1px solid ${V("line")}` }}>
            <MediaBg src={p.mediaSrc} look={p.look ?? "ember"} /><OSD time="0:22 / 2:30" progress={0.15} />
          </div>
        </Reveal>
        <Reveal delaySec={0.32} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16 }}>
          <ScoreCount to={p.score ?? 0} delaySec={0.32} size={44} />
          <div style={{ display: "flex", gap: 8 }}>{(p.pills ?? []).map((x: string, i: number) => <Pill key={i}>{x}</Pill>)}</div>
        </Reveal>
      </Clean>
      <Chrome left={p.kicker ?? "Spotlight"} pageNo={p.pageNo ?? "03 / 04"} />
    </>
  );
};

export const OutroScene: React.FC<SceneProps> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const f = useCurrentFrame();
  const p = scene.props as any;
  const nudge = Math.sin((f / fps) * 3) * 5;
  return (
    <>
      <Clean top={0}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={displayH1}>
            {lines(p.title).map((ln: string, i: number) => <LineMask key={i} delaySec={0.1 + i * 0.12}>{ln}</LineMask>)}
            {p.markerLine ? <LineMask delaySec={0.1 + lines(p.title).length * 0.12}><Marker delaySec={0.4}>{p.markerLine}</Marker></LineMask> : null}
          </h1>
          <Reveal delaySec={0.55} style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: V("font-mono"), fontSize: 22, color: V("ink") }}>
              <span style={{ color: V("accent"), transform: `translateX(${nudge}px)`, display: "inline-block" }}>→</span> {p.cta ?? "Follow @launchpad"}
            </div>
          </Reveal>
        </div>
      </Clean>
      <Chrome left={p.kicker ?? "That's the week"} pageNo={p.pageNo ?? "05 / 05"} />
    </>
  );
};

export const FallbackScene: React.FC<SceneProps> = ({ scene }) => (
  <Clean><div style={{ fontFamily: V("font-mono"), color: "#c0392b" }}>unknown scene type: {scene.type}</div></Clean>
);
