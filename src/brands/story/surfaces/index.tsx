import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../../engine/brand";
import { CrumpledPaper } from "../CrumpledPaper";

// SURFACES — the physical world a video lives in (docs/BRAND-SYSTEM.md §2).
// All token-driven: they read the brand theme, so every brand recolors every
// surface. A script picks one via "surface"; default = parchment.

const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2) || "0", 16)},${parseInt(h.slice(2, 4) || "0", 16)},${parseInt(h.slice(4, 6) || "0", 16)},${a})`;
};
const shift = (hex: string, amt: number) => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2) || "0", 16) + Math.round(amt * 2.55))));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
};
const FIBRE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='0.6'/></svg>\")";

const useDrift = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame / Math.max(1, durationInFrames), [0, 1], [0.6, -1.2]);
};

/** Clean studio paper: soft top light, fine fibre, calm. */
const PaperSurface: React.FC = () => {
  const t = useTheme();
  const d = useDrift();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(178deg, ${shift(t.paper, 5)} 0%, ${t.paper} 40%, ${shift(t.paper, -4)} 100%)` }}>
      <AbsoluteFill style={{ transform: `scale(1.05) translate(${d}%, ${d * 0.5}%)`, backgroundImage: FIBRE, backgroundSize: "220px 220px", mixBlendMode: "multiply", opacity: 0.22 }} />
      <AbsoluteFill style={{ background: `radial-gradient(130% 90% at 50% -10%, ${hexA("#ffffff", 0.16)}, transparent 55%)`, pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(130% 105% at 50% 45%, transparent 60%, ${hexA(t.ink, 0.1)} 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

/** Artist's cutting mat: tinted base, working grid, heavier rules, rotated
 *  tape strips in the corners. */
const CuttingMatSurface: React.FC = () => {
  const t = useTheme();
  const d = useDrift();
  const base = shift(t.tint, -3);
  const line = hexA(t.ink, 0.1), heavy = hexA(t.ink, 0.18);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(175deg, ${shift(base, 4)}, ${base} 50%, ${shift(base, -5)})` }}>
      <AbsoluteFill style={{ transform: `scale(1.06) translate(${d}%, ${d * 0.4}%)` }}>
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${heavy} 1px, transparent 1px), linear-gradient(90deg, ${heavy} 1px, transparent 1px)`, backgroundSize: "300px 300px" }} />
        {/* diagonal guides */}
        <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <line x1={0} y1={480} x2={520} y2={0} stroke={heavy} strokeWidth={1} />
          <line x1={560} y1={1920} x2={1080} y2={1440} stroke={heavy} strokeWidth={1} />
          {[3, 6, 9, 12, 15, 18, 21, 24, 27].map((n, i) => (
            <text key={n} x={36} y={128 + i * 180} fontFamily="var(--font-mono)" fontSize={15} fill={hexA(t.ink, 0.3)}>{n}</text>
          ))}
        </svg>
        {/* tape strips */}
        <div style={{ position: "absolute", left: -30, top: 128, width: 190, height: 46, background: hexA(t.paper, 0.55), transform: "rotate(-7deg)", boxShadow: `0 1px 3px ${hexA(t.ink, 0.12)}` }} />
        <div style={{ position: "absolute", right: -34, bottom: 210, width: 210, height: 46, background: hexA(t.paper, 0.5), transform: "rotate(5deg)", boxShadow: `0 1px 3px ${hexA(t.ink, 0.12)}` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundImage: FIBRE, backgroundSize: "220px 220px", mixBlendMode: "multiply", opacity: 0.14 }} />
      <AbsoluteFill style={{ background: `radial-gradient(130% 105% at 50% 42%, transparent 58%, ${hexA(t.ink, 0.13)} 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

/** Newsprint: halftone dot screens (two classic angles), thin column rules,
 *  a slight ink-bleed vignette. Duller base than studio paper. */
const NewsprintSurface: React.FC = () => {
  const t = useTheme();
  const d = useDrift();
  const base = shift(t.paper, -2);
  const dot = hexA(t.ink, 0.075), dot2 = hexA(t.ink, 0.05);
  const rule = hexA(t.ink, 0.13);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(177deg, ${shift(base, 3)} 0%, ${base} 45%, ${shift(base, -4)} 100%)` }}>
      {/* halftone screens — the second layer rotated 15° so the pair forms the
          classic press rosette rather than a flat dot grid */}
      <AbsoluteFill style={{ transform: `scale(1.06) translate(${d}%, ${d * 0.5}%)` }}>
        <AbsoluteFill style={{ backgroundImage: `radial-gradient(${dot} 1.1px, transparent 1.6px)`, backgroundSize: "9px 9px" }} />
        <AbsoluteFill style={{ top: "-25%", left: "-25%", width: "150%", height: "150%", transform: "rotate(15deg)", backgroundImage: `radial-gradient(${dot2} 1.1px, transparent 1.6px)`, backgroundSize: "11px 11px" }} />
      </AbsoluteFill>
      {/* thin column rules, drifting with the sheet */}
      <AbsoluteFill style={{ transform: `translate(${d * 0.6}%, 0)`, backgroundImage: `linear-gradient(90deg, transparent calc(50% - 0.5px), ${rule} calc(50% - 0.5px), ${rule} calc(50% + 0.5px), transparent calc(50% + 0.5px))`, backgroundSize: "270px 100%", backgroundPosition: "135px 0" }} />
      <AbsoluteFill style={{ backgroundImage: FIBRE, backgroundSize: "220px 220px", mixBlendMode: "multiply", opacity: 0.18 }} />
      {/* ink bleed: uneven edge soak — heavier in two corners, like a worn press sheet */}
      <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 48% 44%, transparent 55%, ${hexA(t.ink, 0.12)} 100%)`, pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 0% 100%, ${hexA(t.ink, 0.07)}, transparent 70%), radial-gradient(55% 35% at 100% 0%, ${hexA(t.ink, 0.06)}, transparent 70%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

/** Drafting board: fine line-work grid, a double border frame with corner
 *  registration marks and edge ticks, chalky grain. Fully token-driven —
 *  it takes its base from theme.paper and draws line-work in theme ink, so
 *  it reads as a classic blueprint on dark-paper brands and as a drafting
 *  sheet on light ones. */
const BlueprintSurface: React.FC = () => {
  const t = useTheme();
  const d = useDrift();
  const fine = hexA(t.ink, 0.06), major = hexA(t.ink, 0.12);
  const frame = hexA(t.ink, 0.3), frame2 = hexA(t.ink, 0.14);
  const W = 1080, H = 1920, M = 38, M2 = 52; // border frame insets
  return (
    <AbsoluteFill style={{ background: `linear-gradient(176deg, ${shift(t.paper, 4)} 0%, ${t.paper} 50%, ${shift(t.paper, -5)} 100%)` }}>
      {/* line-work grid drifts gently under the fixed frame */}
      <AbsoluteFill style={{ transform: `scale(1.05) translate(${d}%, ${d * 0.4}%)` }}>
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${fine} 1px, transparent 1px), linear-gradient(90deg, ${fine} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${major} 1px, transparent 1px), linear-gradient(90deg, ${major} 1px, transparent 1px)`, backgroundSize: "160px 160px" }} />
      </AbsoluteFill>
      {/* border frame: double rule + corner crosshairs + edge ticks (no text) */}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <rect x={M} y={M} width={W - M * 2} height={H - M * 2} fill="none" stroke={frame} strokeWidth={2} />
        <rect x={M2} y={M2} width={W - M2 * 2} height={H - M2 * 2} fill="none" stroke={frame2} strokeWidth={1} />
        {/* corner crosshair registration marks */}
        {[[M, M], [W - M, M], [M, H - M], [W - M, H - M]].map(([x, y], i) => (
          <g key={i} stroke={frame} strokeWidth={1.5}>
            <line x1={x - 14} y1={y} x2={x + 14} y2={y} />
            <line x1={x} y1={y - 14} x2={x} y2={y + 14} />
          </g>
        ))}
        {/* dimension ticks along the left + right frame rules */}
        {Array.from({ length: 11 }, (_, i) => M2 + ((H - M2 * 2) / 10) * i).map((y, i) => (
          <g key={i} stroke={frame2} strokeWidth={1}>
            <line x1={M} y1={y} x2={M + (i % 5 === 0 ? 12 : 7)} y2={y} />
            <line x1={W - M} y1={y} x2={W - M - (i % 5 === 0 ? 12 : 7)} y2={y} />
          </g>
        ))}
      </svg>
      {/* chalky grain: a multiply pass for light papers + a soft-light pass so
          the dust also reads on dark papers */}
      <AbsoluteFill style={{ backgroundImage: FIBRE, backgroundSize: "220px 220px", mixBlendMode: "multiply", opacity: 0.12 }} />
      <AbsoluteFill style={{ transform: "scale(-1, 1)", backgroundImage: FIBRE, backgroundSize: "260px 260px", mixBlendMode: "soft-light", opacity: 0.3 }} />
      <AbsoluteFill style={{ background: `radial-gradient(130% 105% at 50% 42%, transparent 60%, ${hexA(t.ink, 0.11)} 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const SURFACES: Record<string, React.FC> = {
  parchment: CrumpledPaper,
  paper: PaperSurface,
  "cutting-mat": CuttingMatSurface,
  newsprint: NewsprintSurface,
  blueprint: BlueprintSurface,
};
export const SURFACE_IDS = Object.keys(SURFACES);

/** Resolve a surface: explicit id, else deterministic rotation by seed string
 *  (story title) so a brand's stories vary without repeating mechanically. */
export function getSurface(id?: string, seed?: string): React.FC {
  if (id && SURFACES[id]) return SURFACES[id];
  if (seed) {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return SURFACES[SURFACE_IDS[h % SURFACE_IDS.length]];
  }
  return CrumpledPaper;
}
