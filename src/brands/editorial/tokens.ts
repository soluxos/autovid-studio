import type { Theme } from "../../engine/types";

// The default look as PURE DATA — no font loading, no side effects — so it is
// safe to import anywhere, including the Electron main process (the store seeds
// the first brand from this). Font values are the resolved family names from
// the curated registry (src/brands/fonts.ts), which is what actually loads them.
export const EDITORIAL_THEME: Theme = {
  paper: "#F6F5F1", card: "#FFFFFF",
  ink: "#101012", ink2: "#6C6C72", line: "#E6E5DF",
  accent: "#2340FF", accentInk: "#FFFFFF", tint: "#EAECFF",
  fontDisplay: "Bricolage Grotesque", fontUi: "Inter", fontMono: "IBM Plex Mono",
  radius: 12,
  durSec: 0.52, stepSec: 0.09,
  motionScale: 1,
  scrim: 0.82,
  publication: "Launchpad", edition: "Weekly Index", handle: "@launchpad",
};
