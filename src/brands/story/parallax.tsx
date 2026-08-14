import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useVideoConfig } from "remotion";

const cover: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
export const isVideoSrc = (s: string) => /\.(mp4|webm|mov|m4v|ogv)$/i.test(s);
const isVideo = isVideoSrc;

/** 2.5D depth parallax: a background plate and a foreground cutout of the same
 *  image, pushed by a camera (cam 0..1). The foreground scales/moves more than
 *  the (softly blurred) background, so a still photo reads as video — the Vox
 *  "images look like videos" effect. Full-bleed. */
export const ParallaxDepth: React.FC<{ bg: string; fg: string; cam: number; opacity: number }> = ({ bg, fg, cam, opacity }) => {
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#0c0a08" }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={staticFile(bg)} style={{ ...cover, filter: "blur(4px) brightness(0.88) saturate(0.96)", transform: `scale(${1.16 + cam * 0.05}) translateY(${-cam * 1}%)`, transformOrigin: "50% 42%" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={staticFile(fg)} style={{ ...cover, filter: "drop-shadow(0 26px 40px rgba(0,0,0,0.45))", transform: `scale(${1.16 + cam * 0.18}) translateY(${-cam * 3.2}%)`, transformOrigin: "50% 44%" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Blended background atmosphere (StoryDoc `bg`): a cover-fit image or muted
 *  clip toned INTO the brand world and blended over the surface at low
 *  opacity, so blocks/captions stay fully legible on top. The blend must see
 *  the surface beneath it, so the caller passes the fade into `opacity` here
 *  (a parent opacity would isolate the blend into its own stacking context).
 *  `drift` (0..1 across the beat run) drives a slow Ken-Burns push. */
export const AtmosphereMedia: React.FC<{
  src: string; drift: number; opacity: number; dark: boolean; start?: number;
}> = ({ src, drift, opacity, dark, start = 0 }) => {
  const { fps } = useVideoConfig();
  if (opacity <= 0.002) return null;
  // Tone toward the theme: mostly desaturated, a whisper of sepia warmth;
  // dark worlds lift shadows a touch so `screen` has something to add.
  const tone = dark
    // heavier brightness cut: `screen` adds luminance, so a sunny sky would
    // otherwise read as a photo, not atmosphere
    ? "grayscale(0.9) sepia(0.14) brightness(0.72) contrast(1.08)"
    : "grayscale(0.82) sepia(0.22) brightness(1.06) contrast(1.02)";
  const style: React.CSSProperties = {
    ...cover,
    position: "absolute", inset: 0,
    filter: tone,
    mixBlendMode: dark ? "screen" : "multiply",
    opacity,
    transformOrigin: "50% 45%",
  };
  if (isVideo(src)) {
    return (
      <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(start * fps)}
        style={{ ...style, transform: `scale(${1.06 + drift * 0.05})` }} />
    );
  }
  return (
    <Img src={staticFile(src)} style={{
      ...style,
      transform: `scale(${1.1 + drift * 0.08}) translate(${interpolate(drift, [0, 1], [-1.2, 1.2])}%, ${-drift * 1.6}%)`,
    }} />
  );
};

/** Full-bleed image OR video with an eased Ken-Burns push + slow pan. Real
 *  footage plays muted (the VO owns the audio) with a gentler push — the clip
 *  brings its own motion. `start` = seconds into the source clip. */
export const FullBleed: React.FC<{ src: string; cam: number; opacity: number; pan?: number; start?: number }> = ({ src, cam, opacity, pan = 1, start = 0 }) => {
  const { fps } = useVideoConfig();
  if (opacity <= 0.001) return null;
  const filter = "brightness(0.96) saturate(0.98) contrast(1.02)";
  if (isVideo(src)) {
    return (
      <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#0c0a08" }}>
        <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(start * fps)}
          style={{ ...cover, filter, transform: `scale(${1.04 + cam * 0.06})`, transformOrigin: "50% 45%" }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#0c0a08" }}>
      <Img src={staticFile(src)} style={{ ...cover, filter, transform: `scale(${1.12 + cam * 0.16}) translate(${interpolate(cam, [0, 1], [-1.5 * pan, 1.5 * pan])}%, ${-cam * 2}%)`, transformOrigin: "50% 45%" }} />
    </AbsoluteFill>
  );
};
