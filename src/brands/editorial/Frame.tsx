import React from "react";
import { AbsoluteFill } from "remotion";
import { useTheme } from "../../engine/brand";

/** Injects the (possibly overridden) theme tokens as CSS variables. Every brand
 *  component styles from these vars, so editing a token live in the app restyles
 *  the preview instantly. */
export const EditorialFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTheme();
  const vars = {
    "--paper": t.paper, "--card": t.card, "--ink": t.ink, "--ink-2": t.ink2,
    "--line": t.line, "--accent": t.accent, "--accent-ink": t.accentInk, "--tint": t.tint,
    "--radius": `${t.radius}px`,
    "--font-display": t.fontDisplay, "--font-ui": t.fontUi, "--font-mono": t.fontMono,
  } as React.CSSProperties;
  return (
    <AbsoluteFill style={{ ...vars, background: "var(--paper)", fontFamily: "var(--font-ui)" }}>
      {children}
    </AbsoluteFill>
  );
};
