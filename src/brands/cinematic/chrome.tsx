import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../engine/brand";
import { useLightTone, V } from "./media";

const useF = () => ({ f: useCurrentFrame(), fps: useVideoConfig().fps });
const useMotion = () => useTheme().motionScale ?? 1;

/** Ink colors over media, chosen by tone. */
export const useMediaInk = () => {
  const light = useLightTone();
  const t = useTheme();
  return {
    strong: light ? t.ink : "#ffffff",
    soft: light ? t.ink2 : "rgba(255,255,255,0.82)",
    faint: light ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)",
    line: light ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.22)",
    accent: t.accent,
  };
};

export const Reveal: React.FC<{ delaySec?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> =
({ delaySec = 0, y = 16, children, style }) => {
  const { f, fps } = useF();
  const s = spring({ frame: f - delaySec * useMotion() * fps, fps, config: { damping: 200 } });
  return <div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [y, 0])}px)`, ...style }}>{children}</div>;
};

export const Wipe: React.FC<{ delaySec?: number; children: React.ReactNode }> = ({ delaySec = 0, children }) => {
  const { f, fps } = useF();
  const s = spring({ frame: f - delaySec * useMotion() * fps, fps, config: { damping: 200 } });
  return (
    <span style={{ display: "block", overflow: "hidden" }}>
      <span style={{ display: "block", transform: `translateY(${interpolate(s, [0, 1], [110, 0])}%)` }}>{children}</span>
    </span>
  );
};

/** Number that counts up to `to`, firing at delaySec. */
export const CountUp: React.FC<{ to: number; delaySec?: number; prefix?: string; suffix?: string; plain?: boolean; style?: React.CSSProperties }> =
({ to, delaySec = 0, prefix = "", suffix = "", plain, style }) => {
  const { f, fps } = useF();
  const d = delaySec * fps;
  const v = interpolate(f, [d, d + fps * 0.9], [0, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shown = to % 1 === 0 ? (plain ? String(Math.round(v)) : Math.round(v).toLocaleString()) : v.toFixed(1);
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{prefix}{shown}{suffix}</span>;
};

export const Kicker: React.FC<{ children: React.ReactNode; accent?: boolean }> = ({ children, accent }) => {
  const ink = useMediaInk();
  return <span style={{ fontFamily: V("font-mono"), fontSize: 19, letterSpacing: ".18em", textTransform: "uppercase", color: accent ? ink.accent : ink.soft }}>{children}</span>;
};

export const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ink = useMediaInk();
  return <span style={{ fontFamily: V("font-mono"), fontSize: 19, letterSpacing: ".04em", padding: "8px 16px", borderRadius: 999, color: ink.strong, border: `1px solid ${ink.line}`, background: useLightTone() ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)" }}>{children}</span>;
};

/** The persistent pollar-style chrome: corner context labels, a source credit,
 *  the publication watermark, and a segment progress bar. */
export const DispatchChrome: React.FC<{
  topLeft?: string; topRight?: string; source?: string; progressLabel?: string; index?: number; total?: number;
}> = ({ topLeft, topRight, source, progressLabel, index, total }) => {
  const t = useTheme();
  const ink = useMediaInk();
  const { f, fps } = useF();
  const { durationInFrames } = useVideoConfig();
  const prog = Math.min(1, f / Math.max(1, durationInFrames));
  const monoBase: React.CSSProperties = { fontFamily: V("font-mono"), fontSize: 15, letterSpacing: ".16em", textTransform: "uppercase" };
  return (
    <>
      {/* top row */}
      <div style={{ position: "absolute", left: 44, right: 44, top: 46, display: "flex", justifyContent: "space-between", zIndex: 8, ...monoBase, color: ink.soft }}>
        <span>{topLeft}</span>
        {topRight ? <span style={{ color: ink.accent }}>{topRight}</span> : <span />}
      </div>
      {/* segment counter + progress */}
      <div style={{ position: "absolute", left: 44, right: 44, top: 78, zIndex: 8 }}>
        <div style={{ height: 2, background: ink.line, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${prog * 100}%`, background: ink.accent }} />
        </div>
      </div>
      {/* watermark */}
      <div style={{ position: "absolute", right: 44, bottom: 118, display: "flex", alignItems: "center", gap: 8, zIndex: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: ink.accent, display: "grid", placeItems: "center", color: t.accentInk, fontFamily: V("font-display"), fontWeight: 800, fontSize: 16 }}>
          {(t.publication || "•").slice(0, 1)}
        </span>
        <span style={{ fontFamily: V("font-mono"), fontSize: 17, letterSpacing: ".06em", color: ink.strong }}>{t.handle}</span>
      </div>
      {/* source credit */}
      <div style={{ position: "absolute", left: 44, right: 200, bottom: 74, zIndex: 8, ...monoBase, fontSize: 12, letterSpacing: ".1em", color: ink.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {source}
      </div>
      {/* footer progress label */}
      <div style={{ position: "absolute", left: 44, right: 44, bottom: 44, display: "flex", justifyContent: "space-between", zIndex: 8, ...monoBase, fontSize: 13, letterSpacing: ".1em", color: ink.faint }}>
        <span>{progressLabel}</span>
        {index && total ? <span>{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</span> : <span />}
      </div>
    </>
  );
};
