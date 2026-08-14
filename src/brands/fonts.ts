// Curated, self-hosted Google Fonts. Every font here is loaded eagerly so it is
// available for both the live <Player> preview and the Remotion render (no
// network at render time — @remotion/google-fonts ships the files locally).
//
// A brand stores the resolved `fontFamily` STRING for each slot, so these lists
// power the font pickers on the Brands screen (option value = family).
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadWorkSans } from "@remotion/google-fonts/WorkSans";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadFigtree } from "@remotion/google-fonts/Figtree";
import { loadFont as loadIBMPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

export type FontRole = "display" | "ui" | "mono";
export interface FontOption { label: string; family: string; role: FontRole }

const fam = (loader: () => { fontFamily: string }) => loader().fontFamily;

export const DISPLAY_FONTS: FontOption[] = [
  { label: "Bricolage Grotesque", family: fam(loadBricolage), role: "display" },
  { label: "Anton", family: fam(loadAnton), role: "display" },
  { label: "Archivo Black", family: fam(loadArchivoBlack), role: "display" },
  { label: "Archivo", family: fam(loadArchivo), role: "display" },
  { label: "Playfair Display", family: fam(loadPlayfair), role: "display" },
  { label: "Fraunces", family: fam(loadFraunces), role: "display" },
  { label: "Syne", family: fam(loadSyne), role: "display" },
  { label: "Space Grotesk", family: fam(loadSpaceGrotesk), role: "display" },
];

export const UI_FONTS: FontOption[] = [
  { label: "Inter", family: fam(loadInter), role: "ui" },
  { label: "Manrope", family: fam(loadManrope), role: "ui" },
  { label: "DM Sans", family: fam(loadDMSans), role: "ui" },
  { label: "Work Sans", family: fam(loadWorkSans), role: "ui" },
  { label: "Sora", family: fam(loadSora), role: "ui" },
  { label: "Outfit", family: fam(loadOutfit), role: "ui" },
  { label: "Figtree", family: fam(loadFigtree), role: "ui" },
];

export const MONO_FONTS: FontOption[] = [
  { label: "IBM Plex Mono", family: fam(loadIBMPlexMono), role: "mono" },
  { label: "JetBrains Mono", family: fam(loadJetBrainsMono), role: "mono" },
  { label: "Space Mono", family: fam(loadSpaceMono), role: "mono" },
];

export const ALL_FONTS: FontOption[] = [...DISPLAY_FONTS, ...UI_FONTS, ...MONO_FONTS];

export const fontsForRole = (role: FontRole): FontOption[] =>
  role === "display" ? DISPLAY_FONTS : role === "mono" ? MONO_FONTS : UI_FONTS;

export const fontLabel = (family: string): string =>
  ALL_FONTS.find((f) => f.family === family)?.label ?? family;

// Convenient named handles for defaults.
export const FAMILY = {
  bricolage: DISPLAY_FONTS[0].family,
  inter: UI_FONTS[0].family,
  ibmPlexMono: MONO_FONTS[0].family,
};
