---
name: video-design
description: Design laws for every Remotion video this repo produces. MUST be followed when creating or editing any video component, story block, chart/infographic, template, kit, scene, caption, or when reviewing rendered video output. Triggers on work in src/brands/**, src/render/**, src/generate/**, src/stories/**, or any request to make/fix/improve a video.
---

# Video design laws

Every video out of this engine must be flawless. These laws are non-negotiable;
verify each one against real rendered frames before calling a video done.

## 1. Zero layout shift (the cardinal law)

Nothing on screen may move because *content* changed. Motion is only ever an
intentional animation.

- **Animated numbers**: use `CountNumber` (src/brands/story/blocks.tsx) — the
  final value reserves width invisibly, the live value overlays right-anchored.
  Never render a counting value inline where its width can push siblings
  (prefixes, suffixes, units, labels, neighbours).
- `fontVariantNumeric: "tabular-nums"` on every numeric readout.
- Values that appear/disappear (temperatures, badges) get a **fixed slot**
  (absolute position or reserved column), never inline flow.
- Captions are **bottom-anchored** so varying line counts never move the block.
- Test: extract two frames mid-animation (`ffmpeg -ss t1 / -ss t2`) and diff
  positions of every static element. They must be identical.

## 2. One shared skeleton per chart

- Charts use a strict grid: `label column | track | value column` with fixed
  widths. Values right-aligned in their own column — never riding the bar end.
- All rows share one rail, one axis line, one set of gridlines spanning the
  whole chart. A highlighted row changes **color/weight only, never geometry**.
- Every chart teaches itself: title + unit, axis/baseline, and (when the
  encoding isn't obvious) a bracket/label explaining it, timed to the VO.

## 3. Charts are designed, not boxy

- Always drawn by our tools (SVG/DOM) — never images of charts.
- Bars: faint full-length rail behind each bar, subtle vertical gridlines, a
  2px axis, eased grow with 80–120ms stagger, values counting up in sync.
  Use `style: "segments"` (discrete increment cells popping in) when the unit
  is meaningful — it reads tactile, not boring.
- Lines: gridlines, soft area fill under the stroke, points appearing as the
  line draws, a leading dot at the tip.
- Stats: big number with smaller prefix/suffix (0.45em), an accent rule, a
  spaced mono label; small integers (2–12, plain) also get sequential pips.

## 4. Motion

- Everything eased: `Easing.out(cubic)` entrances, `Easing.inOut(ease)` for
  cameras. Durations 0.4–0.7s; staggers 80–120ms. Nothing pops or snaps.
- Cameras move with intent (push in on the subject, pull back to reveal) —
  fill the frame; never leave dead half-frames.
- **Text is untouchable**: captions, counters and chrome sit in a fixed safe
  area and are NEVER transformed by any camera/rig/shake. Camera motion lives
  inside content layers (images, charts) only, and every move must be motivated
  by that beat's narration — no decorative wobble, ever. Landing kicks apply to
  the element that landed (e.g. the stat number), never the frame.
- **Text never scales continuously** (hard-learned jitter law): sustained scale
  transforms make glyphs re-raster every frame and shimmer. Entrances on
  text-bearing layers are translate+opacity only; springs on text are
  critically damped (`damping: 200` — no ring); once a graphic settles it holds
  rock-still. Only imagery (no text) may carry sustained scale motion.

## 5. Legibility, always

- Text color via `pickInk` (WCAG) for the surface it sits on; over imagery add
  the scrim and flip to light ink. Key numbers in captions get accent pills.
- No text over busy image regions without a scrim. No label may ever collide
  with another label — check every beat's frame.

## 6. Layering, not lazy backdrops

- Imagery is layered 2.5D (background plate + rembg cutout + eased camera).
  A lone flat full-bleed image is only acceptable as a deliberate background.
- The base surface is the crumpled-paper texture, not flat color.

## 6b. Atmosphere breaks the monotony — selectively

- A run of block beats on the identical clean surface reads flat. The `bg`
  field (ScriptBeat.bg) blends toned imagery UNDER a beat's block: cover-fit,
  slow Ken-Burns drift, desaturated into the palette, multiply on light papers
  / screen on dark ones, paper wash + vignette on top, ~0.15–0.3 effective
  opacity. It must read as atmosphere — if a viewer would call it "an image",
  it is too loud.
- Use it **selectively** — roughly a third to half of block beats, only where
  the narration motivates the place/era/scene. The clean surface remains a
  first-class, common look; alternating imagery ↔ paper IS the rhythm. Never
  give every beat a bg, and never let a bg compromise caption contrast
  (verify frames: blocks and captions stay fully legible over every bg).

## 7. Sound is tactile and quiet

- Paper clicks on caption lines, whooshes on scene changes, risers under chart
  draws, soft thuds on big stats. Volumes ≤ 0.15 under the VO (ticks ~0.14).

## Ship checklist (do this every time)

1. Render, then extract frames at every beat start + two mid-animation frames.
2. Check: no layout shift, no label collisions, chart rows aligned to one
   skeleton, caption contrast on every surface, no dead vertical space.
3. Only then deliver.
