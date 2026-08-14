---
name: vox-director
description: Directing playbook for authoring story videos in this repo — narrative arcs, hooks, cut cadence, camera grammar with anti-monotony, element motion, endings. MUST be read before writing or editing any story script (src/stories/*/script.json), adding beats, or when a video feels static/slide-like. Complements video-design (which covers visual/layout law); this covers STORY + MOTION direction.
---

# Vox Director (adapted)

Distilled from a proven Vox-style video-director playbook (user-supplied
`vox-director.skill`; its cloud/AI-generation machinery dropped — we render
deterministically in Remotion). This is the craft that separates a directed,
professionally edited video from "a webpage with audio."

## 1. Story first: pick an arc, then write beats

Never write beats ad hoc. Pick a narrative arc that fits the topic:

| Arc | Use for | Shape |
|---|---|---|
| `hook_payoff` | any single idea (default) | Hook → Context → Build → Payoff → Button |
| `timeline` | history, "evolution of" | Start → events → turning point → present → takeaway |
| `man_in_hole` | comeback/transformation (highest-rated) | OK → fall → deepen → climb out → better |
| `how_it_works` | process/system explainers | Hook → what it is → 2–3 steps → benefit |
| `myth_buster` | correcting a belief | FACT first → the myth → expose → what to believe |
| `listicle` | rankings/tips | Promise → items → #1 → recap |

- **Hook in ≤3 seconds.** Beat 1 carries the payoff-promise (bold claim,
  surprising stat, provocative question). Never spend beat 1 on setup.
  Hook patterns: `surprising_stat · direct_question · mistake_callout ·
  secret_reveal · urgent_warning · outcome_tease · pattern_interrupt`.
- **Beat counts:** ~30s → 6–8 beats (~4–5s each); ~60s → 10–12 (~5–6s).
- **Proportions:** hook 1–3s → body 70–80% → payoff 10–20% → button ≤2s.
- **Endings:** `hard_cut` on the payoff (default — drives rewatches) ·
  `quick_cta` (≤2s, 3–5 words) · `loop_close` (last line mirrors the first).

## 2. Cadence: cut every 3–5 seconds

The #1 cause of "static webpage" feel is beats that hold too long.

- Something must change visually **every 3–5s**; never hold one composition >7s.
- A beat whose narration runs long should change its visual mid-sentence
  (wide → detail of the same subject) rather than sit still. The narration
  flows continuously across the visual cut — that's what makes it feel edited.
- Shot-size progression across beats: `EST_WIDE → MEDIUM → CLOSE` builds
  intensity (peak on CLOSE/DETAIL); `CLOSE → WIDE` reveals context (good ending).

## 3. Camera: move the CONTENT, never the text (hard-learned)

A global "camera rig" that transforms the whole frame is a mistake we made
once and must never repeat: it drifted captions out of the safe area and read
as random wobble. The law:

- **The camera lives inside content layers only** — the image's Ken-Burns/2.5D
  push, a slow focus push on a chart or stat. Captions, counters, and chrome
  are LOCKED in a fixed safe area; they never ride any transform.
- **Every move is motivated by the speech of that beat.** Image beat → push
  toward the subject being described; stat beat → slow focus push + one landing
  kick on the number as it hits; chart beat → the entrance cascade IS the
  motion; statement beat → calm (paper drift only).
- **Never decorative:** no rotating move patterns, no frame shakes, no motion
  that exists "to add energy." If a move has no reason in the narration, cut it.
- **Reserve total stillness for the payoff beat** — after motivated motion, the
  drop to still is what signals "this is the point."

## 4. Element motion: the energy axis (separate from camera)

Camera is one move; the life comes from elements moving *inside* the frame.

- Nothing on screen should ever be fully frozen: paper drifts, charts breathe,
  numbers count, pips pop. If a beat looks like a still, add internal motion.
- Entrances **land, never fade**: back-overshoot settles (`backOut`), slide-ins,
  drop-bounces; impact shake + soft thud on the big number landing (already in
  the engine — keep new blocks consistent with it).
- Scale motion to shot intent: wide/context beats → several things moving
  gently; punch beats → one thing moving strongly.
- A "hero" traveling element crossing the frame is a great **occasional** punch
  on a key beat — never every beat (a flyer in every frame reads as formula).

## 5. Direction checklist for every script

1. Arc chosen and named; beat 1 is a ≤3s hook, last beat is the payoff/button.
2. Beat lengths 3–6s; nothing holds >7s without an internal visual change.
3. Camera: engine auto-direction reviewed; overrides only where the arc wants
   them (e.g. pans through a timeline); `static` saved for the payoff.
4. Every beat has visible internal motion; entrances land with overshoot.
5. Endings: hard cut on the final line (no lingering outro).
6. Render → extract frames at each beat + mid-beat → verify against
   `video-design` (zero layout shift, alignment, contrast) before delivering.

## 6. Write for the double audience (mandatory)

Every script must grip BOTH someone who has never heard of the subject AND
someone who knows it deeply:

- **For the newcomer:** assume zero prior knowledge. Define every term the
  moment it appears (the `definition` block exists for this). Anchor every
  number to something felt ("£20,000 — millions today"; "an army the size of
  modern Manchester"). Name people by role first, name second ("a village
  carpenter named John Harrison"). Never reference an event without one clause
  saying what it was.
- **For the expert:** include at least two details even enthusiasts rarely
  know — the primary-source detail, the precise figure, the mechanism, the
  aftermath nobody mentions. The hook itself should subvert the expert's
  expectation ("Forget the wives. Follow the money.").
- **The test:** a newcomer can retell the story afterwards; an expert learned
  something. If a beat serves neither, cut it.
