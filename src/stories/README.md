# Stories — generating new videos

A "story" is a short data-story video (like the Minard/Napoleon flagship) produced
from a single JSON script. You author the script; the tools generate the
voiceover, timings, music, sound effects, and draw every visual.

## Make one (two commands)

```bash
# 1. voiceover + per-beat timings + music (one ElevenLabs call) + any cutouts
node scripts/gen-video.mjs <story>

# 2. (optional) resolve open-licensed FOOTAGE for image beats that carry a
#    "footage" search query — downloads the clip and bakes its src into the
#    script. Pexels if PEXELS_API_KEY is in .env.local (best: portrait, clean),
#    else Wikimedia Commons (keyless, CC/PD — may need a "start" offset to skip
#    title cards; probe frames and set `"start": <sec>` on the beat).
#    The same run also resolves beat/story `bg` atmosphere queries — as IMAGES,
#    public-domain first: Library of Congress photos (loc.gov JSON API), then
#    Wikimedia Commons images, then Pexels photos.
node scripts/fetch-footage.mjs <story>

# 3. render the video -> ~/Downloads/<story>.mp4
node scripts/render-story.mjs <story>
```

`<story>` is a folder under `src/stories/<story>/` containing `script.json`.
Put any images in `public/stories/<story>/` and reference them by that path.
Requires `ELEVENLABS_API_KEY` (+ a voice) in `.env.local`.

## The script format (`src/stories/<story>/script.json`)

```jsonc
{
  "title": "Krakatoa",
  "brand": "minard",            // theme (parchment "Field Notes" look)
  "context": "1883 · Krakatoa", // header, left
  "status": "Data story",       // header, right
  "beats": [
    {
      "say": "Spoken narration. Spell numbers out for the voice (three thousand).",
      "lines": ["On-screen caption", "one or two short lines"],
      "visual": { "type": "..." }   // what to draw this beat (see below)
    }
  ]
}
```

Numbers in `lines` are auto-highlighted in an accent pill. Keep `lines` short
(they're the big caption); keep `say` natural (it's the voice).

### Background atmosphere (`bg`) — ANY beat, not just image beats

Any beat can carry a blended backdrop under its block/caption:

```jsonc
{
  "say": "...", "lines": ["..."],
  "visual": { "type": "stat", ... },
  "bg": { "footage": "milwaukee skyline dusk" }   // or { "src": "stories/<story>/my.jpg" }
}
```

The engine tones the image INTO the brand world (desaturated toward the
palette, multiply on light papers / screen on dark ones, paper wash + vignette
on top) at low effective opacity (~0.15–0.3), with a slow Ken-Burns drift —
it reads as atmosphere, never as an image beat, and blocks/captions stay
fully legible. Video srcs also work (muted, clock starts at the beat;
`"start"` skips into the clip). Adjacent beats sharing one `bg` hold it
without re-fading; different bgs crossfade 0.5s; beats without `bg` keep the
clean surface. A story-level `"bg": {...}` next to `"beats"` is an opt-in
fallback for every beat (a beat opts out with `"bg": null`).

`bg.footage` queries resolve to IMAGES, public-domain sources first:
**Library of Congress** photos → **Wikimedia Commons** images → **Pexels**
photos. (Image-beat `footage` keeps the video order: Pexels videos →
Wikimedia.) Credits land in `public/stories/<story>/SOURCES.txt`.

**Use `bg` selectively — it's a variety tool, not a default.** Give roughly a
third to half of the block beats a bg, where the narration motivates the
atmosphere (a place, a scene, an era); let the rest breathe on the clean
surface so the rhythm alternates imagery ↔ paper. Never pick imagery that
depicts victims or gore; reach for era/location texture instead.

Motion is handled by the engine and is always motivated by the beat's content
(image pushes, stat focus + landing kick, chart cascades; captions and chrome
never move). **Read `.claude/skills/vox-director/SKILL.md` before writing a
script** — arcs, hooks, cadence, and the direction checklist live there.

### Visual block types (all drawn by our tools)

| `visual.type` | fields | what it is |
|---|---|---|
| `image`   | `src`, optional `cutout` | full-bleed photo/art with a 2.5D camera push. `cutout` (a transparent PNG) adds foreground/background depth; omit for scenes. Both live under `public/stories/<story>/`. |
| `stat`    | `value`, `label`, optional `prefix`/`suffix`/`from`/`plain` | one big animated number counting up |
| `bars`    | `title`, `unit`, `highlight` (index), `style:"segments"` + `segment` (unit per cell), `data:[{label,value}]` | animated horizontal bar chart; segments = tactile increment cells |
| `line`    | `title`, `unit`, `points:[{label,value}]` | animated line chart (area fill, leading dot) |
| `pictogram` | `total`, `highlight`, `label` | "K in N" unit chart — dots fill in, the K pop in accent. Best for ratios ("1 in 40") |
| `compare` | `items:[{value,label,suffix?..} x2]`, `accent` (0\|1) | two values head-to-head across a divider |
| `timeline` | `title`, `events:[{year,label}]` | dated events popping along a drawn line; last event accented |
| `quote`   | `text`, `attribution` | pull quote with drawn underline |
| `statement` | — | caption only — the words become the hero (large type) |
| `ranking` | `title`, `unit`, `items:[{name,value?,suffix?}]`, `variant` | ordered list with rank numerals; rows slide-land staggered, #1 accented. v0 big numerals · v1 circled badges |
| `donut`   | `value` (percent), `label`, `rest?` (name for the remainder), `variant` | share-of-whole ring drawing on, percent counted in the centre. v0 centred, label below · v1 ring left + two-row legend |
| `bigpercent` | `value`, `label`, `variant` | one huge percentage over a fill bar that fills in sync with the count. v0 vertical column · v1 horizontal band |
| `steps`   | `title`, `steps:[string]` (2-5), `variant` | numbered circles on a drawing line, sequential pops, last step accented. v0 horizontal · v1 vertical list |
| `scale`   | `one` (the single thing), `count`, `unit`, `variant` | "one X = N units": one accent square vs a counted grid of ink squares + a × multiplier. v0 side by side · v1 stacked |
| `iceberg` | `above:{label,value,suffix?}`, `below:{...}`, `waterline?` (line caption), `variant` | visible-vs-hidden: small accent block above a dashed waterline, large ink block revealing downward; heights ∝ values. v0 labels right · v1 labels left |
| `waterfall` | `title`, `unit`, `totalLabel?`, `data:[{label,value}]` (3-6 signed deltas), `variant` | +/- bars stepping to an accented total with dashed carry-overs. v0 running-total readout in the header · v1 total value labels the last bar |
| `dotstrip` | `total`, `highlight`, `label`, `variant` | one horizontal strip of dots, first K accented, drawing bracket + label on the accent span (ratio punch, lighter than `pictogram`). v0 bracket above · v1 below |
| `sparkrow` | `title`, `unit`, `highlight?` (accent one row), `rows:[{label,values:[..],value?,suffix?}]` (2-4), `variant` | label + drawing sparkline + counted end value per row, staggered. v0 stroke only · v1 soft area fill |
| `definition` | `word`, `phonetic?`, `pos?`, `def`, `num?`, `variant` | dictionary card: display word, mono phonetic, numbered definition, accent underline draws on. v0 left-aligned · v1 centred |
| `area`    | `title`, `unit`, `points:[{label,value}]`, `variant` | filled silhouette chart revealing left-to-right, final value counted in the header slot (no dots — that's `line`'s language). v0 straight segments · v1 smoothed curve |
| `stackbars` | `title`, `unit`, `series:[string]` (2-3), `rows:[{label,values:[..]}]`, `variant` | stacked segments per row landing in sequence, legend chips in the header, totals counted. v0 absolute widths · v1 100% shares |
| `groupbars` | `title`, `unit`, `seriesA`, `seriesB`, `groups:[{label,a,b}]` (≤4), `variant` | two series compared per group, counted values in fixed slots. v0 paired columns · v1 paired rows |
| `slope`   | `title`, `unit`, `left?`/`right?` (column names), `items:[{label,from,to,suffix?}]` (≤5), `highlight?`, `variant` | then/now slopegraph; label rows auto-spread so near-equal values never collide. v0 values both ends · v1 values right only |
| `lollipop` | `title`, `unit`, `data:[{label,value}]` (≤6), `highlight?`, `variant` | stem + head chart, lighter than bars. v0 horizontal rows · v1 vertical stems |
| `bullet`  | `title`, `unit`, `rows:[{label,actual,target,suffix?}]`, `variant` | target vs actual: faint rail, accent bar, ink target tick, `actual/target` counted. v0 up to 4 rows · v1 one hero bullet with labeled target |
| `gauge`   | `value`, `max?` (default 100), `label`, `suffix?`, `variant` | dial: 240° arc sweeps to the value, needle tracks it, readout in a fixed slot. v0 needle + ticks · v1 thin 180° arc, ends labeled |
| `calheat` | `title`, `values:[number]`, `labels?:[string]`, `highlight?`, `variant` | calendar heat-strip: cells shaded by intensity with a less→more ramp legend. v0 one labeled row (≤14) · v1 7-column week grid (≤35) |
| `matrix`  | `xAxis:[l,r]`, `yAxis:[t,b]`, `quads:[TL,TR,BL,BR]`, `highlight?` (0-3), `variant` | 2×2 quadrant map, axes draw through the centre, highlight quad tints. v0 all quads named · v1 highlight only |
| `bump`    | `title`, `cols?:[a,b]`, `items:[{label,from,to}]` (ranks, ≤5), `highlight?`, `variant` | rank-change chart: fixed rank slots both sides, crossing drawn lines. v0 names both ends · v1 names left, heavier lines |
| `dumbbell` | `title`, `unit`, `from?`/`to?` (legend), `rows:[{label,from,to,suffix?}]` (≤5), `variant` | range rows: hollow start dot → accent end dot with growing connector. v0 `from → to` values · v1 signed delta pill |
| `histogram` | `title`, `unit`, `bins:[{label,value}]` (≤12), `highlight?`, `variant` | distribution columns on one baseline. v0 clean shape · v1 accent bin + counted callout in a fixed top slot |
| `funnel`  | `title`, `unit`, `stages:[{label,value,suffix?}]` (3-5), `variant` | narrowing trapezoid bands, labels/values in fixed side columns, last stage accented. v0 symmetric · v1 left-anchored wedge |
| `pyramid` | `title`, `tiers:[{label,value?}]` (3-4, top first), `highlight?`, `variant` | triangle hierarchy sliced into tiers, dashes leader to a fixed label column. v0 labels right · v1 labels left |
| `treemap` | `title`, `unit`, `tiles:[{label,value}]` (3-6), `variant` | area tiles: biggest takes the left column, rest stack right, values counted. v0 accent largest · v1 accent smallest (the sliver) |
| `gantt`   | `title`, `cols?:[string]` (period labels), `spans:[{label,start,end}]` (3-4, grid units), `highlight?`, `marker?`, `variant` | time spans on one unit grid. v0 plain · v1 adds an accent marker line at `marker` |
| `venn`    | `title`, `a`, `b`, `overlap` (labels), `overlapValue?` (percent), `variant` | 2-set overlap: circles draw on, lens tints accent; set labels anchor outward, overlap label on its own row. v1 counts a % in the lens |
| `wordstack` | `words:[string]` (3-6), `highlight?` (default last), `variant` | kinetic type list: big display words sliding in, one accented. v0 left stack · v1 centred |
| `checklist` | `title`, `items:[{label,done?}]` (≤6), `variant` | items tick one by one (drawn check stroke); `done:false` stays an empty dashed box. v1 adds strike-through on done items |
| `versus`  | `title`, `left`, `right`, `rows:[{label,a,b}]` (≤4), `accent` (0\|1), `variant` | two columns head-to-head. v0 accent column on a tinted panel · v1 ruled with accent header underline |
| `odometer` | `value`, `label`, `prefix?`, `suffix?`, `variant` | big rolling digits — fixed-width cells, columns translate into place (low digits spin further). v0 open + baseline · v1 boxed flip-clock cells |
| `flowshare` | `source:{label,value?,suffix?}`, `dests:[{label,value,suffix?}]` (2-3), `unit?`, `variant` | one source splits into ribbons, width ∝ share, into fixed destination slots. v0 curved ribbons · v1 straight tapers |
| `orbit`   | `center`, `satellites:[string]` (3-6), `variant` | hub-and-spokes: centre chip + satellite pills on a dashed ring. v0 one ring · v1 two alternating rings |
| `thermometer` | `value`, `goal`, `label`, `suffix?`, `variant` | fill toward a goal: tube + bulb filling to value/goal, goal tick, counted readout. v0 vertical · v1 horizontal band |
| `receipt` | `store?`, `items:[{label,value}]` (≤6), `totalLabel?`, `currency?`, `variant` | itemised mono lines with dotted leaders on a perforated slip; the total counts up in accent. v1 adds a barcode footer |
| `ticket`  | `event`, `venue?`, `date?`, `seat?`, `admit?`, `variant` | ticket stub framing one fact: display event, mono venue/date slots, perforation + notches, accent seat stub. v0 landscape · v1 portrait |
| `polaroid` | `src?` (under `public/`), `caption`, `rotate?`, `variant` | instant photo: white frame, image (or hatched placeholder), handwritten-style caption, static tilt. v0 tape corners · v1 pin + stacked frame |
| `clipping` | `kicker?`, `headline`, `body`, `source?`, `variant` | newspaper clipping: kicker + dateline rule, display headline, halftone body fading at the cut. v0 one column · v1 two columns |
| `factcard` | `title`, `pairs:[{label,value}]` (≤6), `accent?` (index), `variant` | dossier card of label/value pairs (values are strings). v0 ledger rows · v1 2-up tile grid |
| `letter`  | `salutation`, `body`, `signoff?`, `signature?`, `date?`, `variant` | correspondence snippet: dateline, salutation, fading body excerpt, flourished accent signature. v0 card · v1 open on the paper |
| `countgrid` | `items:[{value,label,prefix?,suffix?,plain?}]` (2-3), `accent?` (index), `variant` | 2-3 stats side by side, each with an accent tick, all counted. v0 columns with dividers · v1 stacked ledger rows |
| `tally`   | `value` (≤35), `label`, `variant` | hand-drawn tally marks scratching in, groups of five with accent diagonals, count riding along. v0 centred, readout below · v1 readout right |
| `worldmap` | `title`, `unit`, `regions:[{name,label?,value?,suffix?}]` (1-3), `variant` | flat low-poly world (drawn from `geo.ts`, no images) with named regions pulsing in; labels + counted values in a fixed legend strip below the map. v0 legend columns · v1 legend rows |
| `globe`   | `center` (place/continent), `highlight?` (region), `value?`/`label?`/`prefix?`/`suffix?`, `title`, `variant` | orthographic globe with graticule centred on a place, one region highlighted, one counted stat in a fixed side panel. v0 panel right · v1 panel left |
| `maproute` | `from`, `to` (places), `fromLabel?`/`toLabel?`, `value?` (defaults to the great-circle km), `unit?`, `title`, `variant` | dashed great-arc route drawing A→B; endpoint dot key + labels in a fixed strip under the map, distance counted. v0 distance strip below · v1 distance in the header |
| `mappins` | `title`, `pins:[{place,label?,value?,suffix?}]` (2-5), `variant` | numbered pins popping in sequence; every label lives in a numbered list below (numbers on pins ↔ rows) so map text never collides. v0 one column · v1 two columns |
| `mapspread` | `origin` (place), `points:[place]`, `value?`, `label`, `suffix?`, `title`, `variant` | radial spread: expanding rings from the origin, reached points lighting accent as the front passes. v0 readout below · v1 readout in the header |
| `mapdots` | `region` (continent), `count` (dots, ≤140), `value?` (shown number), `label`, `suffix?`, `seed?`, `title`, `unit`, `variant` | dot density: seeded scatter inside the region outline, counted readout in a fixed strip. v0 centred readout · v1 baseline row |
| `mapcompare` | `items:[{region,label,value,prefix?,suffix?,plain?} x2]`, `accent` (0\|1), `title`, `unit`, `variant` | two regions highlighted in different weights, values head-to-head below (compare's language, geographic). v0 columns + divider · v1 stacked rows |
| `globespin` | `places:[place]` (2-5, in order), `label?`, `value?`, `suffix?`, `title`, `variant` | the globe drifts from the first place toward the last while the chain reveals as it comes around; fixed readout below. v0 dashed route arcs · v1 points pulse only |
| `mapzoom` | `region` (continent), `pins:[{place,label?}]` (≤4), `title`, `variant` | a rectangle draws on the world, dashed connectors drop to a magnified inset with numbered pins; labels in a fixed list column. v0 list right · v1 list left |
| `mapflow` | `origin` (place), `originLabel?`, `flows:[{place,label?,value,suffix?}]` (2-4), `unit?`, `title`, `variant` | flow arcs from one origin, stroke width ∝ value, destination legend rows with counted values below. v0 lifted curves · v1 straight spokes |
| `globezoom` | `target` (any country/continent), `places?`/`pins:[{place,label?}]` (≤4), `stats:[{value,label,prefix?,suffix?,plain?}]` (1-2), `title`, `variant` | THE hero map move: full globe eases rotation + zoom onto the target, real country borders crossfading 110m→50m detail on the way in, the target's border drawing on; stats + pin labels in a fixed panel below the viewport. v0 zoom-to-country (`target`) · v1 zoom-to-bbox of the pinned `places` with numbered pins |

### Demonstration blocks — show it, don't just say it

Every block above **describes** data. These ones **demonstrate a concept by
showing it happen**: a pointer travelling to a target, a form failing then
passing, layers peeling apart. They're generic — reach for them in UX, product,
science or process stories whenever a beat explains *how something works*
rather than *how big something is*. All drawn by us, coloured from the theme.

| `visual.type` | fields | what it demonstrates |
|---|---|---|
| `cursorpath` | `title`, `unit`, `runs:[{label,targetSize,distance,ms}]` (≤2), `label?`, `variant` | THE Fitts's-law demo: a pointer travels from a start dot to a target and lands with a click ripple. Two runs play as stacked lanes **in sequence**, each taking screen-time in proportion to its `ms`, so you watch the small far target take longer; times count in a fixed right column. v0 free-standing targets · v1 targets welded to a screen edge (the pointer slams into the wall and stops) |
| `devicephone` | `title`, `appTitle`, `rows:[string]` (≤4), `nav:[string]` (≤4), `highlight?` (row), `thumbZone?`, `tapAt?` (nav index), `note?`, `variant` | a drawn phone (frame, notch, home bar, header, list, bottom nav) with a highlighted element, a tap ripple, or the one-thumb reach arc overlaid. v0 phone centred, note strip below · v1 phone left, note in a right column |
| `devicebrowser` | `title`, `url`, `menu:[string]` (≤5), `highlight:"menu"\|"corner"\|"content"\|"sidebar"`, `note?`, `variant` | a drawn desktop window (traffic lights, address bar, menu row, page mock) with a zone outlined and the cursor pointing at it. v0 window flush to the screen edge · v1 window floating inside the screen (the gap that costs you the infinite edge) |
| `uimock` | `title`, `panel`, `rows:[string]` (≤4), `buttons:[string]` (≤2), `highlight?`, `annotate?`, `variant` | a generic wireframe panel with a callout on a drawn leader line; the callout text sits in a reserved slot, never over the art. v0 callout in a right column · v1 callout below |
| `beforeafter` | `title`, `before:{label,caption?}`, `after:{label,caption?}`, `variant` | two drawn mocks — the "before" cramped and off-grid with tiny buttons, the "after" aligned with a real target size. v0 side by side · v1 one frame with the after wiping across the before |
| `statechips` | `title`, `label` (the component's text), `states:[string]` (≤4), `note?`, `variant` | one component drawn in its UI states (default / hover / active / disabled) revealing in sequence, each named in a fixed slot. v0 a row of four · v1 2×2 with names beside |
| `formdemo` | `title`, `field`, `text`, `fixed?` (the corrected value), `error`, `success`, `submit?`, `variant` | validation UX staged: the field types itself, fails with an error, then passes — the message always occupies the SAME reserved slot, so nothing moves. v0 message below the field · v1 inline message in a right column |
| `menudemo` | `title`, `items:[string]` (≤5), `target?` (index), `note?`, `variant` | the screen-edge argument: the cursor is thrown at a menu with the same overshoot in both variants. v0 menu welded to the screen edge — the edge stops it dead on target · v1 menu floating in a window — the throw sails past and has to be corrected back |
| `heatzone` | `title`, `label?`, `hot?`/`cold?` (legend ends), `variant` | a soft attention/reach field over a drawn surface with the ramp explained in a fixed legend strip (no numbers ever float on the art). v0 reach on a phone (hot at the thumb) · v1 attention on a page (hot top-left) |
| `gazepath` | `title`, `stops:[string]` (2-5), `variant` | how the eye travels a page: a scan path draws over a drawn layout with numbered stops, every label safe in a fixed numbered list beside it. v0 F-pattern · v1 Z-pattern |
| `diagram` | `title`, `nodes:[string]` (2-5), `label?`, `variant` | labelled boxes wired together by arrows that draw on — systems, architectures, pipelines. v0 a row (A → B → C) · v1 hub and spokes |
| `sequence` | `title`, `actors:[string]` (2-3), `messages:[{from,to,label}]` (≤4), `variant` | an exchange between actors: lifelines, arrows firing in order, each message in its own band so labels can never collide. v0 labels ride above their arrow · v1 numbered arrows with the wording listed below |
| `anatomy` | `title`, `object:"card"\|"button"\|"shape"`, `parts:[string]` (3-5), `variant` | one drawn object with numbered leader lines out to labels parked in FIXED columns — "the parts of a thing". v0 labels split left and right · v1 all on the right |
| `race` | `title`, `unit`, `runners:[{label,value,suffix?}]` (2), `label?`, `variant` | two markers running a track at different speeds — a comparison you watch instead of read; readouts count in a fixed right column. v0 race to the finish · v1 fixed time, so the slower one covers less ground |
| `stack` | `title`, `layers:[string]` (2-5, top first), `highlight?`, `variant` | layers of a system peeling apart one at a time. v0 2.5D sheets with dashed leaders to a fixed label column · v1 flat slabs with the label inside each |
| `toggle` | `title`, `off`, `on`, `result?`, `variant` | a switch thrown between two labelled states with the consequence landing in a fixed slot beneath. v0 a pill switch · v1 a lever |
| `grid8` | `title`, `label?`, `variant` | the grid demonstrated: elements drift in off-grid and snap onto it. v0 an 8-point layout grid · v1 a text baseline grid |
| `contrastcheck` | `title`, `pairs:[{label,fg?,bg?,ratio?,sample?}]` (2), `variant` | accessibility taught: sample text on its own swatch, the WCAG ratio counting up in a fixed slot (computed from `fg`/`bg` when `ratio` is omitted) and a drawn pass/fail badge. v0 two cards side by side · v1 stacked rows with the verdict in a column |
| `typescale` | `title`, `steps:[{label,size,sample?}]` (3-5), `variant` | a type ramp landing one step at a time — hierarchy you can see; sizes count in a fixed column. v0 ramp left, sizes right · v1 centred ramp, name and size under each step |
| `zoomcompare` | `title`, `items:[{label,size,suffix?}]` (2), `note?`, `variant` | the same element at two scales so the difference stops being abstract (8 px vs 64 px), each with a counted size readout in a fixed slot. v0 side by side on one baseline · v1 the small one nested inside the big one |

Stats sketch a hand-drawn accent circle around the number as it lands (disable
with `"circle": false`). Blocks with a `variant` field pick a layout (default
`0`); every value that animates counts via the zero-layout-shift `CountNumber`.
`src/stories/_blocktest/` exercises the first-wave library,
`src/stories/_blocktest2/` the wave-2 blocks, `src/stories/_maptest/` the
map/globe blocks, and `src/stories/_demotest/` the wave-4 demonstration blocks
(one beat per block, deliberately long labels) — re-render them after engine
changes. Map blocks name places loosely (continents, ~45
countries and cities + aliases — see `src/brands/story/geo.ts`); unknown
places are skipped rather than drawn wrong.

Geography detail comes in two layers. The FLAT world blocks (`worldmap`,
`maproute`, `mappins`, `mapspread`, `mapdots`, `mapcompare`, `mapflow`) keep
the hand-drawn low-poly outlines from `geo.ts` — a deliberate style at
world-in-940px scale. The GLOBE and ZOOM blocks (`globe`, `globespin`,
`mapzoom`'s inset, `globezoom`) draw real Natural Earth country boundaries
from the generated `src/brands/story/geo-data.ts` (rebuild with
`node scripts/build-geo.mjs`): a 110m world tier for full-globe views and a
50m zoom tier that `globezoom`/`mapzoom` crossfade to for close-ups. EVERY
country resolves by name/ISO/alias (`geo-countries.ts findCountry`), so
`globe`, `mapzoom` and `globezoom` accept any country, not just the ~45
place-table entries. **US sub-national detail**: the 50 states + DC also
resolve by name ("Wisconsin", "US-WI") — a `globezoom` target can be a state
(zooms to the state's bbox, its border draws on, surrounding states render as
faint context at 50m detail), and the place table carries ~60 US cities
(Milwaukee, Detroit, St. Louis...) for pins. Prefer the state + a city pin
over highlighting the whole USA when the story is local.

Whenever you're showing data, use `bars`/`line`/`stat` — never a picture of a chart.

## Authoring with an LLM (e.g. Claude)

Give this prompt, plus the table above:

> Write a ~30-45 second vertical data-story video as JSON in the format below.
> Topic: **<your topic>**. 6-9 beats with a clear arc (hook → build → payoff → kicker).
> Each beat: `say` (natural spoken line, numbers spelled out), `lines` (1-2 very
> short on-screen caption lines), and a `visual` block. Lead with an `image` if
> there's strong archival art; use `stat`/`bars`/`line` whenever there's a number
> to show; use `statement` for punchlines. Give roughly a third to half of the
> block beats a `bg` atmosphere query (era/location texture the narration
> motivates — never victims or gore); leave the rest deliberately clean so the
> video alternates imagery and paper. If the story is local, zoom `globezoom`
> to the US state and pin the city, not the whole country. Only output the JSON.

Then drop any referenced images into `public/stories/<story>/`, and run the two
commands above.

## Re-recording / iterating

- Change the voice: edit `ELEVENLABS_VOICE_ID` in `.env.local`, re-run `gen-video`.
- Edit copy/data: edit `script.json`, re-run `gen-video` then `render-story`.
- The visuals always re-time to the new voiceover automatically (timings come
  from the ElevenLabs character alignment).
