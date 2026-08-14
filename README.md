# autovid studio (Windows desktop app)

A self-contained desktop app for making short-form videos, built on the autovid
Remotion engine (folded into `src/`). It does two things:

- Create: build a video manually, preview it live in the window, render to MP4.
- Channels: automated channels that fetch data, compose a spec, render and
  (later) publish on a schedule. Automation runs while the app is open.

Brands are managed and switched in-app, with live token editing.

## Requirements

- Node 18+. Packaging targets Windows; development works on macOS/Windows/Linux.
- First render downloads a headless Chromium once (automatic).
- Apple Silicon: see "First-run fixes" for the arm64 Remotion compositor.

## Run in development

```bash
npm install
npm run dev        # launches the Electron app with hot reload
```

## Build a Windows installer

```bash
npm run dist       # electron-vite build + electron-builder --win  -> dist-app/
```

## What you get

- Create tab: **one-click generate**. Pick a template (Top 5 countdown, Single
  spotlight, Quick rundown), pick a brand, fill a few labeled fields, and it
  builds a finished video with a live preview. "Render MP4" writes the file (and
  records it in the Library). An "Advanced" panel exposes the raw spec JSON for
  power users.
- Brands tab: **user-authored brand presets**. Create / duplicate / rename /
  delete brands as data — full palette, font pickers (curated Google Fonts),
  corner radius, motion feel, and the on-screen publication name / edition /
  handle. Live preview; persisted in the store; no code required.
- Channels tab: create channels (brand, template, schedule, item count, look),
  enable/pause, and "Run now". Schedules are set from plain-language presets or a
  cron string that is translated live ("Runs: Weekly, Monday 07:00"). Enabled
  channels run on their schedule while the app is open.
- Library tab: every rendered video (from Create or a channel), with "Reveal".
- Settings tab: default brand, **API keys**, live status counts, reveal latest
  render.

## API keys

Narration (ElevenLabs) and stock footage (Pexels) need keys. Paste them into
**Settings -> API keys**; they are written to this app's own state file in
`userData` (never into the repo) and never reach the renderer — the UI only sees
a masked last-4 status like `••••9244`.

`electron/services/keys.ts` is the single resolver. `getKey(name)` checks, in
order:

1. the key saved in **Settings -> API keys**,
2. `.env.local` in the app path (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`,
   `PEXELS_API_KEY`) — the developer fallback,
3. `process.env`.

So the owner's checkout keeps working untouched with its existing `.env.local`,
while anyone given a build only has to paste their own keys into Settings. A key
saved in Settings wins over `.env.local`; **Clear** on a row removes the saved
value and falls back to the environment again. Leaving a field blank on save
keeps whatever is already stored.

- ElevenLabs (elevenlabs.io) is required to generate a voiceover. The voice
  itself is per brand (Style tab), falling back to `ELEVENLABS_VOICE_ID`.
- Pexels (pexels.com/api, free) is optional. Without it, footage resolution
  simply skips Pexels and uses the Library of Congress and Wikimedia Commons.

### Templates and brands

A **template** (`src/generate/templates.ts`) turns a few inputs into a full spec,
including synthetic word timings so captions and the audio-synced stat pop line
up. It is pure TypeScript, shared by the Create screen and the channel pipeline.
A **brand** is a `BrandPreset` (`src/engine/types.ts`): a name + a full set of
theme tokens bound to a **rendering kit**. Templates declare which kit they
target; the Create/Channels screens only offer templates that match the selected
brand's kit.

### Rendering kits and the cinematic "dispatch" look

There are two kits in `src/engine/registry.ts`:

- `editorial` (`src/brands/editorial/`) — the original clean, paper-card look.
- `cinematic` (`src/brands/cinematic/`) — a dynamic, full-bleed look modelled on
  pollar.news: footage/imagery with a slow Ken-Burns push, a data-journalism
  overlay grammar (corner mono labels, animated stat count, source credit,
  publication watermark, per-segment progress), karaoke captions, and film
  grain. It reads dark or light automatically from the brand's `paper` color.

Three brands ship seeded: **Editorial** (editorial kit), **New on Steam** (dark,
neon — cinematic) and **Field Notes / History** (light parchment, serif —
cinematic). Two cinematic templates drive the baseline mocks:

- **New releases on Steam** (`steam-new`) — a run-through of this week's Steam
  releases, one full-bleed segment per game with an animated rating and tags.
- **History facts** (`history-facts`) — a centered archival fact per beat over
  public-domain-style imagery, in the light historical theme.

**Placeholder media (swap for real assets).** Per the licensing rule below, the
mocks ship with license-safe placeholders, with the real media pipeline wired:

- Steam segments use an **animated synthetic backdrop** when a game has no clip.
  Drop real press-kit gameplay into `public/video/` and set a game's *Gameplay
  clip* to `video/<file>.mp4`.
- History beats reference generated sepia SVG plates in
  `public/images/history/`. Replace them with real public-domain imagery
  (Wikimedia, Library of Congress, museum open-access) and update the fact's
  *Image* field.

## How it fits together

```
electron/main.ts        app window + IPC + starts the scheduler
electron/preload.ts     safe bridge -> window.api
electron/ipc.ts         handlers
electron/services/
  store.ts              JSON state in %APPDATA%/autovid studio/data
  keys.ts               API key resolver: Settings -> .env.local -> process.env
  render.ts             @remotion/bundler + @remotion/renderer (spec -> mp4)
  pipeline.ts           channel config -> spec via src/generate templates
  channels.ts           node-cron scheduler + runChannel
src/generate/templates.ts  templates: inputs -> spec (shared by Create + channels)
src/ (the engine, folded in)
  engine/               types, timing/sync, sequencer, captions, brand context
  brands/editorial/     the games brand (tokens + frame + scenes + overlays)
  render/               the parameterized "Render" composition (inputProps=spec)
  data/demo.spec.json   the seed spec shown in Create
src/ui/                 the React dashboard (screens + Player preview)
public/                 drop real video / audio / images here
```

Live preview uses `@remotion/player` with the same components the file render
uses, so what you see is what you get. Token edits work live because the brand
styles from CSS variables the Frame injects from the (overridable) theme.

## Testing

End-to-end tests drive the built Electron app with Playwright, covering every
screen's happy path plus one real Remotion render.

```bash
npm test           # builds, then runs the full E2E suite
npm run test:e2e   # runs the suite against the current build
npm run typecheck  # tsc --noEmit
```

Tests launch the app against a throwaway `userData` dir (full isolation), with
the scheduler disabled (`AUTOVID_NO_SCHEDULER=1`) and renders faked
(`AUTOVID_FAKE_RENDER=1`) for speed — except `render-real.spec.ts`, which does a
genuine bundle + h264 encode. Stable `data-testid` hooks are on every control.

### Text-overlap QA (overlapping text can never ship)

Every story can be checked — and the Stories tab **Render** button is gated —
by an automated overlap detector that enforces the design law "no label may
ever collide" (`.claude/skills/video-design/SKILL.md` §5):

```bash
npm run build
node scripts/qa-story.mjs <slug>   # PASS/FAIL report; exit 1 on any overlap
```

How it works: when the renderer loads on a `#qa/<slug>` hash, `src/ui/QAProbe.tsx`
mounts the story's real Remotion `<Player>` (same spec `story:render` encodes,
audio stripped), seeks three deterministic sample times per beat (entrance
landed / mid-beat / pre-exit), measures every visible text box in the player DOM
(direct text nodes + SVG `<text>`, opacity chain > 0.05, clipped by
overflow-hiding ancestors) and reports pairwise intersections over 4% of the
smaller box on `window.__QA_RESULT`. Ancestor/descendant pairs and inline
siblings in the same line box are exempt.

In-app, the `story:qa` IPC (`electron/services/qa.ts`) runs the same probe in a
hidden `BrowserWindow` — that is what the per-story **QA** button and the render
gate call; a refused render unlocks a one-shot **Render anyway** override.
`tests/e2e/qa.spec.ts` keeps the whole path green.

## Refine with Claude Code

- Look: edit brands live in the Brands tab; defaults in
  `src/brands/editorial/tokens.ts`.
- Templates (what a generated video contains): `src/generate/templates.ts`.
- Scene motion / layout: `src/brands/editorial/scenes.tsx` + `components.tsx`.
- Media overlays: `src/brands/editorial/overlays.tsx`.
- Real channel data: `electron/services/pipeline.ts` (currently builds specs from
  template defaults; wire a real API + an LLM that returns a spec matching
  `src/artdirector/schema.ts`).
- Publishing: add a step in `electron/services/channels.ts > runChannel` after
  render (TikTok / YouTube API).
- A whole new visual system: add a kit to `src/engine/registry.ts` and point a
  brand preset's `kit` at it.

## First-run fixes (applied)

Authored without a machine to run it on; these were fixed on first bring-up and
are worth knowing:

- **Entry-file naming**: `electron.vite.config.ts` now names the main/preload
  outputs `index.js` (via an `{ index: ... }` rollup input) so electron-vite and
  `package.json` `main` agree.
- **esbuild under Electron**: Remotion's bundler runs esbuild, which reads
  `ESBUILD_BINARY_PATH` once at load and otherwise can't find its binary in
  Electron. `electron/esbuild-env.ts` sets it, and `render.ts` imports
  `@remotion/bundler` / `@remotion/renderer` lazily so esbuild loads *after* that
  runs (a static import gets hoisted above it).
- **Apple Silicon**: if Node is x64 but Electron is arm64, `npm install` fetches
  the wrong Remotion compositor. Install the arm64 one for real renders:
  `npm install --no-save --cpu=arm64 --os=darwin @remotion/compositor-darwin-arm64@4.0.230`.
- Packaging (`npm run dist`) still needs verifying: `@remotion/renderer`,
  `@remotion/bundler`, and `@esbuild` must be asar-unpacked, and `esbuild-env.ts`
  updated to resolve against `process.resourcesPath`.

## Automation, hosting

Channels run while the app is open (your choice for now). For true 24/7 later,
run the same engine + `channels.ts` scheduler on an always-on box; the app stays
the control panel. The store is plain JSON, so it moves easily.
