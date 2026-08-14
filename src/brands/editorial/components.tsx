import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../engine/brand";

const useF = () => ({ f: useCurrentFrame(), fps: useVideoConfig().fps });
/** Entrance delays scale with the brand's motion feel. */
const useMotion = () => useTheme().motionScale ?? 1;
const V = (n: string) => `var(--${n})`;

export const Reveal: React.FC<{ delaySec?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> =
({ delaySec = 0, y = 12, children, style }) => {
  const { f, fps } = useF();
  const s = spring({ frame: f - delaySec * useMotion() * fps, fps, config: { damping: 200 } });
  return <div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [y, 0])}px)`, ...style }}>{children}</div>;
};

export const LineMask: React.FC<{ delaySec?: number; children: React.ReactNode }> = ({ delaySec = 0, children }) => {
  const { f, fps } = useF();
  const s = spring({ frame: f - delaySec * useMotion() * fps, fps, config: { damping: 200 } });
  return (
    <span style={{ display: "block", overflow: "hidden" }}>
      <span style={{ display: "block", transform: `translateY(${interpolate(s, [0, 1], [105, 0])}%)` }}>{children}</span>
    </span>
  );
};

export const Marker: React.FC<{ delaySec?: number; children: React.ReactNode }> = ({ delaySec = 0, children }) => {
  const { f, fps } = useF();
  const s = spring({ frame: f - delaySec * useMotion() * fps, fps, config: { damping: 200 } });
  return (
    <span style={{ position: "relative", display: "inline-block", color: V("accent-ink"), padding: "0 .12em" }}>
      <span style={{ position: "absolute", inset: ".06em -.02em .04em", background: V("accent"), borderRadius: 4, zIndex: -1, transform: `scaleX(${s})`, transformOrigin: "left" }} />
      {children}
    </span>
  );
};

export const Kicker: React.FC<{ children: React.ReactNode; onMedia?: boolean }> = ({ children, onMedia }) => (
  <span style={{ fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".18em", textTransform: "uppercase", color: onMedia ? "rgba(255,255,255,0.85)" : V("ink-2") }}>{children}</span>
);

export const Pill: React.FC<{ children: React.ReactNode; onMedia?: boolean }> = ({ children, onMedia }) => (
  <span style={{ fontFamily: V("font-mono"), fontSize: 20, letterSpacing: ".04em", padding: "8px 18px", borderRadius: 999, color: onMedia ? "#fff" : V("ink-2"), border: `1px solid ${onMedia ? "rgba(255,255,255,0.4)" : V("line")}`, background: onMedia ? "rgba(255,255,255,0.06)" : "transparent" }}>{children}</span>
);

export const ScoreCount: React.FC<{ to: number; delaySec?: number; size?: number; color?: string }> =
({ to, delaySec = 0, size = 120, color = V("ink") }) => {
  const { f, fps } = useF();
  const d = delaySec * fps;
  const v = Math.round(interpolate(f, [d, d + fps], [0, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return <span style={{ fontFamily: V("font-display"), fontWeight: 800, fontSize: size, letterSpacing: "-.03em", color, fontVariantNumeric: "tabular-nums", lineHeight: 0.9 }}>{v}</span>;
};

export const RankRow: React.FC<{ rank: number; name: string; meta: string; score: number; delaySec: number }> =
({ rank, name, meta, score, delaySec }) => {
  const { f, fps } = useF();
  const d = delaySec * useMotion();
  const s = spring({ frame: f - d * fps, fps, config: { damping: 200 } });
  const score0 = Math.round(interpolate(f, [d * fps + 6, d * fps + fps], [0, score], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", alignItems: "center", gap: 20, padding: "20px 0", borderTop: `1px solid ${V("line")}`, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-24, 0])}px)` }}>
      <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 42, letterSpacing: "-.02em", color: V("ink"), fontVariantNumeric: "tabular-nums" }}>{rank}</span>
      <div>
        <div style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 26, color: V("ink") }}>{name}</div>
        <div style={{ fontFamily: V("font-mono"), fontSize: 16, letterSpacing: ".04em", color: V("ink-2"), marginTop: 4 }}>{meta}</div>
      </div>
      <span style={{ fontFamily: V("font-mono"), fontSize: 22, color: V("accent"), fontVariantNumeric: "tabular-nums" }}>{score0}</span>
    </div>
  );
};

export const Chrome: React.FC<{ left: string; right?: string; pageNo?: string; onMedia?: boolean }> =
({ left, right, pageNo, onMedia }) => {
  const t = useTheme();
  const ink = onMedia ? "rgba(255,255,255,0.85)" : V("ink-2");
  const lineC = onMedia ? "rgba(255,255,255,0.25)" : V("line");
  const spine = [t.publication, t.edition].filter(Boolean).join(" — ");
  return (
    <>
      <div style={{ position: "absolute", left: 52, right: 44, top: 40, zIndex: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 18, letterSpacing: ".14em", textTransform: "uppercase", color: ink }}>
          <span>{left}</span><span>{right ?? t.edition}</span>
        </div>
        <div style={{ height: 1, background: lineC, marginTop: 12 }} />
      </div>
      <div style={{ position: "absolute", left: 30, top: 96, bottom: 92, width: 1, background: lineC, zIndex: 6 }}>
        <span style={{ position: "absolute", left: -6, bottom: 0, transformOrigin: "left bottom", transform: "rotate(-90deg)", whiteSpace: "nowrap", fontFamily: V("font-mono"), fontSize: 13, letterSpacing: ".24em", textTransform: "uppercase", color: ink }}>{spine}</span>
      </div>
      <div style={{ position: "absolute", left: 52, right: 44, bottom: 40, display: "flex", justifyContent: "space-between", fontFamily: V("font-mono"), fontSize: 18, letterSpacing: ".1em", color: ink, zIndex: 6 }}>
        <span>{t.handle}</span><span>{pageNo}</span>
      </div>
    </>
  );
};

export const displayH1: React.CSSProperties = {
  fontFamily: V("font-display"), fontWeight: 800, fontSize: 78, lineHeight: 0.99, letterSpacing: "-.03em", margin: 0, color: V("ink"),
};
