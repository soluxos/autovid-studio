import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../engine/brand";

const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2) || "0", 16), g = parseInt(h.slice(2, 4) || "0", 16), b = parseInt(h.slice(4, 6) || "0", 16);
  return `rgba(${r},${g},${b},${a})`;
};

/** Crumpled aged-paper surface: a baked crumple texture (lit folds) multiplied
 *  over the brand's parchment, with a slow parallax drift and edge vignette.
 *  Cheap (static image) so it renders fast. */
export const CrumpledPaper: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / Math.max(1, durationInFrames);
  const drift = interpolate(p, [0, 1], [1, -2]);
  const zoom = 1.06 + p * 0.03;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 95% at 44% 32%, ${shift(t.paper, 6)}, ${t.paper} 55%, ${shift(t.paper, -8)} 100%)` }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) translate(${drift}%, ${drift * 0.6}%)`, mixBlendMode: "multiply", opacity: 0.6 }}>
        <Img src={staticFile("images/minard/crumple.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom}) translate(${drift}%, ${drift * 0.6}%)`, mixBlendMode: "soft-light", opacity: 0.5 }}>
        <Img src={staticFile("images/minard/crumple.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(125% 105% at 50% 40%, transparent 50%, ${hexA(t.ink, 0.16)} 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

function shift(hex: string, amt: number) {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2) || "0", 16) + Math.round(amt * 2.55))));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
