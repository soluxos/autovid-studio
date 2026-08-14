import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../../engine/brand";

const V = (n: string) => `var(--${n})`;
const isImage = (s: string) => /\.(png|jpe?g|webp|avif|svg)$/i.test(s);

/** True when the brand's paper is light — drives whether media text sits on a
 *  light (dark-text) or dark (light-text) treatment. Historical brands read as
 *  light; gaming/cinematic brands read as dark. */
export const useLightTone = () => {
  const t = useTheme();
  const hex = t.paper.replace("#", "");
  const r = parseInt(hex.slice(0, 2) || "0", 16), g = parseInt(hex.slice(2, 4) || "0", 16), b = parseInt(hex.slice(4, 6) || "0", 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
};

/** Full-bleed footage layer with a slow Ken-Burns push. Accepts a real clip or
 *  image via `src`; otherwise paints a theme-tinted animated backdrop so the
 *  system runs — and looks dynamic — with zero external assets. Drop real
 *  press-kit gameplay into /public/video (or PD imagery into /public/images)
 *  and set `src` to swap it in. */
export const CineMedia: React.FC<{ src?: string; seed?: number }> = ({ src, seed = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = useTheme();
  const p = Math.min(1, frame / Math.max(1, durationInFrames));
  const scale = 1.06 + p * 0.14;                       // slow push in
  const panX = interpolate(p, [0, 1], [seed % 2 ? -3 : 3, seed % 2 ? 3 : -3]);
  const panY = interpolate(p, [0, 1], [2, -4]);

  if (src) {
    const kb: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translate(${panX}%, ${panY}%)` };
    return (
      <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
        {isImage(src)
          ? <Img src={staticFile(src)} style={kb} />
          : <OffthreadVideo src={staticFile(src)} muted style={kb} />}
      </AbsoluteFill>
    );
  }

  // Synthetic backdrop, tinted from the brand accent + a light/dark base.
  const light = useLightTone();
  const drift = interpolate(p, [0, 1], [24, 62]);
  const hueShift = (seed * 47) % 360;
  const base = light
    ? `linear-gradient(160deg, ${t.paper}, ${t.tint} 60%, ${t.paper})`
    : `linear-gradient(160deg,#0a0b12,#12101f 55%,#05060c)`;
  const glow = light
    ? `radial-gradient(70% 50% at 26% 16%, ${hexA(t.accent, .28)}, transparent 60%), radial-gradient(80% 60% at 82% 30%, ${hexA(t.accent, .18)}, transparent 60%)`
    : `radial-gradient(80% 55% at 24% 14%, ${hexA(t.accent, .5)}, transparent 60%), radial-gradient(75% 55% at 84% 30%, ${hexA(shiftHex(t.accent, 40), .42)}, transparent 60%), radial-gradient(120% 90% at 50% 112%, ${hexA(shiftHex(t.accent, -50), .4)}, transparent 55%)`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#04060c" }}>
      <AbsoluteFill style={{ background: base }} />
      <AbsoluteFill style={{ background: glow, backgroundSize: "160% 160%", backgroundPosition: `${drift}% ${drift + 8}%`, transform: `scale(${scale}) rotate(${(hueShift % 6) - 3}deg)`, filter: `hue-rotate(${hueShift}deg)` }} />
      {/* parallax streaks give the backdrop motion, like a moving camera */}
      <AbsoluteFill>
        {[0.14, 0.32, 0.5, 0.7, 0.88].map((x, i) => (
          <div key={i} style={{
            position: "absolute", top: 0, bottom: 0, left: `${x * 100}%`, width: 2,
            background: light ? hexA(t.ink, .06) : "rgba(255,255,255,0.05)",
            transform: `translateX(${interpolate(p, [0, 1], [0, (i % 2 ? 30 : -30)])}px) skewX(-12deg)`,
          }} />
        ))}
      </AbsoluteFill>
      <Grain light={light} />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ light?: boolean }> = ({ light }) => {
  const frame = useCurrentFrame();
  const o = 0.05 + 0.02 * Math.abs(Math.sin(frame / 3));
  return <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: light ? "multiply" : "screen", opacity: o,
    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.5'/></svg>\")" }} />;
};

/** Legibility scrims. In light tone they darken toward paper (dark text stays
 *  readable); in dark tone they deepen to black (light text). */
export const CineScrims: React.FC = () => {
  const light = useLightTone();
  const t = useTheme();
  const top = light ? hexA(t.paper, .55) : "rgba(0,0,0,0.55)";
  const bottom = light ? hexA(t.paper, .92) : "rgba(0,0,0,0.9)";
  return (
    <>
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${top}, transparent 26%)`, pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bottom}, ${light ? hexA(t.paper, .3) : "rgba(0,0,0,0.35)"} 34%, transparent 60%)`, pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 40%, transparent 55%, ${light ? hexA(t.ink, .12) : "rgba(0,0,0,0.5)"})`, pointerEvents: "none" }} />
    </>
  );
};

// small hex helpers (no deps)
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2) || "0", 16), g = parseInt(h.slice(2, 4) || "0", 16), b = parseInt(h.slice(4, 6) || "0", 16);
  return `rgba(${r},${g},${b},${a})`;
}
function shiftHex(hex: string, deg: number) {
  // cheap hue nudge by rotating channels; good enough for backdrops
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2) || "0", 16), g = parseInt(h.slice(2, 4) || "0", 16), b = parseInt(h.slice(4, 6) || "0", 16);
  const t = deg / 360;
  const nr = Math.round(r + (g - r) * t), ng = Math.round(g + (b - g) * t), nb = Math.round(b + (r - b) * t);
  const hx = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${hx(nr)}${hx(ng)}${hx(nb)}`;
}
export { V };
