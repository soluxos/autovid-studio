# Brand System — the architecture of record

The product is a multi-brand video studio. A **Brand** is the root object;
everything else belongs to one. Nothing here is optional styling advice — this
is the target architecture the codebase is converging on.

## 1. Brand = identity + voice + styles

```ts
interface Brand {
  id: string; name: string;
  palette: Palette;            // full color scheme (paper/ink/accent/... tokens)
  fonts: { display; ui; mono } // typography choices (curated Google Fonts)
  voiceId: string;             // ElevenLabs narrator for this brand
  musicMood: string;           // bed generator mood (key/tempo/progression)
  surfaces: SurfaceId[];       // ~5 video styles this brand rotates through
  handle: string; publication: string;
}
```

## 2. Surfaces = video styles (per brand, ~5 each)

A **surface** is the physical world a video lives in — background texture,
edge treatment, grain, scrim/shadow language. Engine components under
`src/brands/story/surfaces/`, all theme-token driven so every brand recolors
them:

- `parchment` (exists: CrumpledPaper) — aged crumpled paper
- `paper` — clean studio paper, soft top light, subtle fibre
- `cutting-mat` — artist's self-heal mat: grid, numbered rules, tape marks
- `newsprint` — halftone dots, column rules, ink bleed
- `blueprint` — dark drafting board, white line-work, chalk grain
- (extensible: linen, cork board, chalkboard, film cell…)

A story's script picks `"surface"` explicitly or the engine rotates through the
brand's list per story (deterministic from story name — no repeats feel).

## 3. Block library — never-seen-it-before scale

Today: statement, image(2.5D/footage), stat, bars, line, pictogram, compare,
timeline, quote. Target: **25+ blocks**, each with **2–3 layout variants**
picked deterministically per story so compositions don't repeat:

ranking, donut/share, big-percent, before/after slider, map-route, flow/steps,
versus-grid, calendar-heat, iceberg (visible/hidden), scale-comparison (X = N
buses), annotated-document, ledger, receipt, envelope/letter, ticket-stub,
polaroid-stack, newspaper-clipping, definition-card, etymology, counter-odometer,
sparkline-row, waterfall, stacked-area, dot-strip…

Every block obeys the design laws (`.claude/skills/video-design/SKILL.md`):
zero layout shift, one skeleton, drawn not boxy, translate-only text motion.
Block SKINS derive from the brand palette + surface (a bar chart on cutting-mat
uses tape+marker language; on parchment it uses ink+brush).

## 4. Brand-centric UI (kill the global pages)

Navigation = **brand switcher** (manage brands at top level). Inside a brand:
- **Stories** — create/generate videos (replaces global Create)
- **Channels** — that brand's scheduled runs
- **Library** — that brand's rendered videos
- **Style** — palette, fonts, voice, music mood, surfaces (preview each)

## 5. In-app pipeline (operate without Claude)

Electron services wrap what the CLI scripts do today, driven from the Stories
screen with progress UI:
- `story:generate` → ElevenLabs VO + timings + music (gen-video.mjs logic)
- `story:footage` → Pexels/Wikimedia resolution (fetch-footage.mjs logic)
- `story:render` → render + save to brand Library
- Script authoring: paste/edit script JSON in-app (format: src/stories/README.md);
  later, a topic→script LLM step.
Keys stay in the main process: `electron/services/keys.ts` resolves them from
Settings → API keys, then `.env.local`, then `process.env`. Only a masked status
ever crosses IPC.

## Build order (each phase ships working)

- **A. Data model + surfaces**: Brand type above; surface components (paper,
  cutting-mat, newsprint, blueprint) + surface selection in scripts/engine.
- **B+C. Brand-scoped UI + in-app pipeline**: restructure nav around brands;
  Stories screen runs generate/footage/render via IPC.
- **D. Block expansion**: grow to 25+ blocks with variants + per-surface skins
  (ongoing; every new block verified against the design laws).

Status: **ALL PHASES COMPLETE (2026-08-11).** Phase B+C: brand-centric UI
(sidebar = brands; Stories/Channels/Library/Style tabs per brand; global pages
removed) + in-app pipeline (electron/services/stories.ts: story:list/get/save/
generate/footage/render IPC, brand-preset theming/voice, .env.local keys) +
E2E suite rewritten to the new UI (9/9 green incl. stories round-trip). Phase D:
19 block types (blocks2.tsx adds ranking/donut/bigpercent/steps/scale/iceberg/
waterfall/dotstrip/sparkrow/definition, each ×2 variants; `_blocktest` story =
standing regression). Combined gate passed: tsc + build + suite + a real render.
Phase A detail (2026-08-11) — all five
surfaces landed (`src/brands/story/surfaces/`: parchment, paper, cutting-mat,
newsprint, blueprint; registry + script `"surface"` field + deterministic
per-title rotation; newsprint/blueprint verified frame-by-frame on the
krakatoa story). Brand data model extended: `BrandPreset` now carries optional
`voiceId`, `musicMood`, `surfaces[]` (src/engine/types.ts); the minard default
brand declares its voice + all five surfaces (electron/services/store.ts).
Rendering is brand-aware: `scripts/render-story.mjs` picks a theme by
`script.brand` from a THEMES map (minard parchment + a second complete brand,
"ledger" — clean minimal light look, Archivo/Inter/JetBrains Mono, publication
"The Ledger"). Next: B+C (brand-scoped UI + in-app pipeline).
