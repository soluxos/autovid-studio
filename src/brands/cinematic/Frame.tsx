import React from "react";
import { AbsoluteFill } from "remotion";
import { useTheme } from "../../engine/brand";
import { useLightTone } from "./media";

/** Injects the brand theme as CSS vars (so tokens edit live) and sets a base
 *  stage color behind the full-bleed media. */
export const CinematicFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTheme();
  const light = useLightTone();
  const vars = {
    "--paper": t.paper, "--card": t.card, "--ink": t.ink, "--ink-2": t.ink2,
    "--line": t.line, "--accent": t.accent, "--accent-ink": t.accentInk, "--tint": t.tint,
    "--radius": `${t.radius}px`,
    "--font-display": t.fontDisplay, "--font-ui": t.fontUi, "--font-mono": t.fontMono,
  } as React.CSSProperties;
  return (
    <AbsoluteFill style={{ ...vars, background: light ? t.paper : "#05060c", fontFamily: "var(--font-ui)" }}>
      {children}
    </AbsoluteFill>
  );
};
