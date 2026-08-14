import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
const V = (n: string) => `var(--${n})`;
const DEFAULT_SCRIM = 0.82;

/** Footage layer. Real clip/image via src, else a deterministic drifting
 *  synthetic background so the engine runs with zero assets. */
export const MediaBg: React.FC<{ src?: string; look?: "neon" | "ember" | "forest" }> = ({ src, look = "neon" }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 600], [28, 60], { extrapolateRight: "clamp" });
  const scale = 1.04 + interpolate(frame, [0, 600], [0, 0.06], { extrapolateRight: "clamp" });
  if (src) {
    const isImg = /\.(png|jpe?g|webp|avif)$/i.test(src);
    return (
      <AbsoluteFill>
        {isImg
          ? <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
          : <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </AbsoluteFill>
    );
  }
  const looks: Record<string, string> = {
    neon: `radial-gradient(90% 60% at 25% 12%,rgba(126,60,255,.55),transparent 60%),radial-gradient(80% 60% at 88% 26%,rgba(255,40,170,.45),transparent 60%),radial-gradient(120% 90% at 50% 108%,rgba(0,170,255,.4),transparent 55%),linear-gradient(160deg,#0b0a1e,#160a24 60%,#04060f)`,
    ember: `radial-gradient(80% 60% at 28% 16%,rgba(255,150,60,.5),transparent 60%),radial-gradient(90% 70% at 80% 34%,rgba(20,150,160,.45),transparent 60%),linear-gradient(160deg,#1a0f08,#241109 55%,#070403)`,
    forest: `radial-gradient(80% 60% at 30% 18%,rgba(150,220,120,.4),transparent 60%),radial-gradient(90% 70% at 75% 30%,rgba(60,150,90,.5),transparent 60%),linear-gradient(165deg,#0e1a10,#12220f 55%,#050a06)`,
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ background: looks[look], backgroundSize: "160% 160%", backgroundPosition: `${drift}% ${drift + 8}%`, transform: `scale(${scale})` }} />
      <AbsoluteFill>
        {[[0.1, 0.5], [0.24, 0.72], [0.4, 0.44], [0.66, 0.66], [0.86, 0.52]].map(([l, h], i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left: `${l * 100}%`, width: 46, height: `${h * 46}%`, background: "rgba(0,0,0,0.5)", borderRadius: "4px 4px 0 0" }} />
        ))}
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(120% 100% at 50% 40%,transparent 55%,rgba(0,0,0,0.55))", pointerEvents: "none" }} />
);

export const ScrimBottom: React.FC<{ strength?: number; full?: boolean }> = ({ strength = DEFAULT_SCRIM, full }) => (
  <AbsoluteFill style={{ top: full ? 0 : "38%", background: `linear-gradient(to top,rgba(0,0,0,${strength}),rgba(0,0,0,${strength * 0.5}) 30%,transparent)`, pointerEvents: "none" }} />
);
export const ScrimTop: React.FC = () => (
  <AbsoluteFill style={{ bottom: "74%", background: "linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)", pointerEvents: "none" }} />
);

export const Duotone: React.FC<{ on?: boolean }> = ({ on }) =>
  on ? <AbsoluteFill style={{ background: V("accent"), mixBlendMode: "color", opacity: 0.72, pointerEvents: "none" }} /> : null;

export const OSD: React.FC<{ time?: string; progress?: number }> = ({ time = "0:14 / 2:30", progress = 0.32 }) => (
  <div style={{ position: "absolute", right: 44, top: 92, display: "flex", alignItems: "center", gap: 10, zIndex: 6, fontFamily: V("font-mono"), fontSize: 15, color: "rgba(255,255,255,0.85)" }}>
    {time}
    <span style={{ width: 84, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${progress * 100}%`, background: V("accent") }} />
    </span>
  </div>
);

export const SafeArea: React.FC<{ show?: boolean }> = ({ show }) =>
  show ? (
    <AbsoluteFill style={{ zIndex: 20, pointerEvents: "none" }}>
      <div style={{ position: "absolute", right: 16, top: "34%", bottom: "16%", width: 120, border: "2px dashed rgba(255,80,80,.7)" }} />
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, height: 220, border: "2px dashed rgba(255,80,80,.7)" }} />
    </AbsoluteFill>
  ) : null;
