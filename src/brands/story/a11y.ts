// Accessible text color: given the surface a piece of text sits on, pick the
// theme ink or a light tone — whichever has the higher WCAG contrast — so text
// is always readable and gracefully flips color when the background is dark.

const chan = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const rgb = (hex: string) => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2) || "0", 16), parseInt(h.slice(2, 4) || "0", 16), parseInt(h.slice(4, 6) || "0", 16)];
};
export const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
};
export const contrastRatio = (a: string, b: string) => {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

const LIGHT_INK = "#F4ECDA"; // light "paper" ink for use on dark surfaces

/** Best-contrast text color for a given background surface. */
export function pickInk(surfaceHex: string, darkInk: string, lightInk = LIGHT_INK): string {
  return contrastRatio(darkInk, surfaceHex) >= contrastRatio(lightInk, surfaceHex) ? darkInk : lightInk;
}

/** True if a color meets the WCAG AA (>=4.5) contrast against a surface. */
export const isAccessible = (fg: string, bg: string) => contrastRatio(fg, bg) >= 4.5;
