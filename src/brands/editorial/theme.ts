// The default look. Values live in tokens.ts (pure data, safe to import from the
// Electron main process); this file is the render-side entry that also ensures
// the curated fonts are loaded for the preview and the render.
import "../fonts";
export { EDITORIAL_THEME as editorialTheme } from "./tokens";
