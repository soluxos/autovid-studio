# CLAUDE.md — autovid studio (desktop app)

Drop at repo root; Claude Code reads it automatically. This is the Windows
desktop app that wraps the autovid Remotion engine into one contained system:
manual video creation with live preview, and automated channels that run while
the app is open.

## First thing to do

Authored without a machine to run it on. Validate before adding features:

```bash
npm install
npm run dev
```

Then fix any first-run issues (see the README "first-run checklist": Remotion
version alignment via `npx remotion upgrade`, google-font import names, the
render bundle entry path, asar unpacking of `@remotion/renderer`, and the
preload/contextBridge path).

## Shape

- Electron. Main process (Node) = window + IPC + services + node-cron scheduler.
  Renderer (React, Vite) = the dashboard, with `@remotion/player` for live
  preview. Built with electron-vite; packaged with electron-builder (win nsis).
- The engine is folded in under `src/engine`, `src/brands`, `src/render`,
  `src/data`. Same engine as the standalone package, with two additions:
  - `src/engine/Video.tsx` takes an optional `themeOverride` (merged into the
    brand theme) so the app can live-edit tokens.
  - The brand styles from CSS variables the Frame injects, so token edits
    restyle the preview instantly.
  - `src/render/` is a parameterized "Render" composition; the render service
    passes `inputProps = { spec, themeOverride }`.

## Map

```
electron/main.ts            window, IPC registration, startScheduler()
electron/preload.ts         contextBridge -> window.api
electron/ipc.ts             ipcMain handlers
electron/services/store.ts  JSON state in userData (settings, brandOverrides, channels, projects)
electron/services/render.ts bundle(src/render) + selectComposition + renderMedia
electron/services/pipeline.ts  MOCK fetch + art-director -> spec (replace with real)
electron/services/channels.ts  node-cron scheduler + runChannel (fetch->render->store)
src/ui/                     React dashboard (App + screens + PreviewVideo)
src/engine, src/brands, src/render, src/data, src/gallery, src/artdirector
public/                     real video / audio / images
```

## Screens

- Create: spec JSON editor + live Player preview + Render MP4 (IPC to render).
- Brands: switch active brand + token editor (colors, radius), live preview.
- Channels: CRUD, enable/pause, Run now, cron schedule (runs while app open).
- Library: rendered outputs, reveal in Explorer.
- Settings: status + hosting note.

## IPC contract (preload `window.api`)

`getState`, `saveBrandOverride(brand, override)`, `setActiveBrand(brand)`,
`saveProject(p)`, `listProjects()`, `render(spec, themeOverride) -> outPath`,
`saveChannel(c)`, `deleteChannel(id)`, `setChannelEnabled(id, enabled)`,
`runChannel(id) -> outPath`, `pickMedia() -> path|null`, `openPath(p)`.

## Backlog (rough priority)

1. Get it running; fix first-run issues.
2. Real pipeline: replace `electron/services/pipeline.ts` mock with a real data
   source + an LLM art-director returning a spec validated by
   `src/artdirector/schema.ts`. Add real TTS/word-timings for `audioSrc`+`words`.
3. Real media: `pickMedia` already exists; copy chosen files into `public/` and
   set `mediaSrc` on scenes.
4. Publishing: add a step after render in `channels.ts > runChannel`
   (TikTok Content Posting API / YouTube Data API).
5. Form-based scene editing in Create (instead of raw JSON).
6. A second brand (copy `src/brands/editorial`, register in
   `src/engine/registry.ts`, add to the Brands screen list).
7. Later: host the engine + scheduler on an always-on box for 24/7 automation;
   the app stays the control panel. The store is plain JSON so it moves easily.

## Conventions

- Keep `src/engine` brand-agnostic; brands hold all look.
- Brand components style from CSS vars (`var(--accent)` etc.) so live token
  editing works. Do not hardcode theme colors in components.
- The theme tokens (`src/brands/editorial/theme.ts`) are the source of the look.
- Avoid em-dashes in generated copy (owner preference).
