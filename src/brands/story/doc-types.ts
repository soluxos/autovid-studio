// The generic "story" script format. Author one of these (by hand or with an
// LLM), run scripts/gen-video.mjs to synthesize the voiceover + timings + SFX,
// and scripts/render-story.mjs to render it. Every video is a sequence of beats;
// each beat has a spoken line, an on-screen caption, and a visual "block" drawn
// by our own tools (charts are infographics we draw, never chart images).

export type VisualBlock =
  | { type: "statement" }                                   // caption only (big, on paper)
  // full-bleed still (2.5D with cutout) or real footage. `footage` is a search
  // query — scripts/fetch-footage.mjs resolves it to an open-licensed clip and
  // fills `src`. `start` = seconds into the clip.
  | { type: "image"; src?: string; cutout?: string; footage?: string; start?: number }
  | { type: "stat"; value: number; label: string; prefix?: string; suffix?: string; from?: number; plain?: boolean; circle?: boolean }
  | { type: "bars"; title?: string; unit?: string; highlight?: number; style?: "solid" | "segments"; segment?: number; data: BarDatum[] }
  | { type: "line"; title?: string; unit?: string; xlabel?: string; points: LinePoint[] }
  | { type: "pictogram"; total: number; highlight: number; label: string }          // "K in N" unit chart
  | { type: "compare"; items: [CompareItem, CompareItem]; accent?: 0 | 1 }          // two values, head to head
  | { type: "timeline"; title?: string; events: TimelineEvent[] }                   // dated events on a line
  | { type: "quote"; text: string; attribution?: string }                           // pull quote
  // ---- expanded library (Phase D). `variant` picks a layout (default 0). ----
  | { type: "ranking"; title?: string; unit?: string; items: RankItem[]; variant?: number }          // ordered list, #1 accented. v0 numerals / v1 badges
  | { type: "donut"; value: number; label: string; rest?: string; variant?: number }                 // share-of-whole ring, value = percent. v0 centered / v1 left + legend
  | { type: "bigpercent"; value: number; label: string; variant?: number }                           // huge % over a fill bar. v0 vertical / v1 horizontal
  | { type: "steps"; title?: string; steps: string[]; variant?: number }                             // 2-5 step flow. v0 horizontal / v1 vertical
  | { type: "scale"; one: string; count: number; unit: string; variant?: number }                    // "one X = N units". v0 row / v1 stacked
  | { type: "iceberg"; above: IcebergPart; below: IcebergPart; waterline?: string; variant?: number }// visible vs hidden. v0 labels right / v1 labels left
  | { type: "waterfall"; title?: string; unit?: string; totalLabel?: string; data: WaterfallStep[]; variant?: number } // signed deltas stepping to a total. v0 running readout / v1 total label
  | { type: "dotstrip"; total: number; highlight: number; label: string; variant?: number }          // one strip, K accented + bracket. v0 bracket above / v1 below
  | { type: "sparkrow"; title?: string; unit?: string; highlight?: number; rows: SparkRowDatum[]; variant?: number }  // label + sparkline + value rows. v0 stroke / v1 area
  | { type: "definition"; word: string; phonetic?: string; pos?: string; def: string; num?: number; variant?: number }  // dictionary card. v0 left / v1 centered
  // ---- library wave 2 (blocks3.tsx charts + blocks4.tsx cards/props). ----
  | { type: "area"; title?: string; unit?: string; points: LinePoint[]; variant?: number }                     // filled silhouette chart. v0 straight / v1 smoothed
  | { type: "stackbars"; title?: string; unit?: string; series: string[]; rows: StackRow[]; variant?: number } // stacked segments per row. v0 absolute / v1 100%
  | { type: "groupbars"; title?: string; unit?: string; seriesA: string; seriesB: string; groups: GroupBarDatum[]; variant?: number } // paired series. v0 columns / v1 rows
  | { type: "slope"; title?: string; unit?: string; left?: string; right?: string; items: SlopeItem[]; highlight?: number; variant?: number } // then/now slopegraph. v0 both values / v1 right only
  | { type: "lollipop"; title?: string; unit?: string; data: BarDatum[]; highlight?: number; variant?: number } // stem + head chart. v0 rows / v1 columns
  | { type: "bullet"; title?: string; unit?: string; rows: BulletRow[]; variant?: number }                     // target vs actual. v0 multi-row / v1 single hero
  | { type: "gauge"; value: number; max?: number; label: string; suffix?: string; variant?: number }           // dial. v0 needle + ticks / v1 thin arc
  | { type: "calheat"; title?: string; values: number[]; labels?: string[]; highlight?: number; variant?: number } // heat strip. v0 one row / v1 week grid
  | { type: "matrix"; xAxis: [string, string]; yAxis: [string, string]; quads: [string, string, string, string]; highlight?: number; variant?: number } // 2x2. v0 all quads / v1 highlight only
  | { type: "bump"; title?: string; cols?: [string, string]; items: BumpItem[]; highlight?: number; variant?: number } // rank change. v0 badges both ends / v1 lines only
  | { type: "dumbbell"; title?: string; unit?: string; from?: string; to?: string; rows: DumbbellRow[]; variant?: number } // range rows. v0 range values / v1 delta badge
  | { type: "histogram"; title?: string; unit?: string; bins: BarDatum[]; highlight?: number; variant?: number } // distribution columns. v0 all values / v1 highlight callout
  | { type: "funnel"; title?: string; unit?: string; stages: FunnelStage[]; variant?: number }                 // narrowing stages. v0 centred / v1 left-anchored
  | { type: "pyramid"; title?: string; tiers: PyramidTier[]; highlight?: number; variant?: number }            // triangle hierarchy. v0 labels right / v1 labels left
  | { type: "treemap"; title?: string; unit?: string; tiles: BarDatum[]; variant?: number }                    // 3-6 area tiles. v0 accent largest / v1 accent smallest
  | { type: "gantt"; title?: string; cols?: string[]; spans: GanttSpan[]; highlight?: number; marker?: number; variant?: number } // 3-4 time spans. v0 plain / v1 marker line
  | { type: "venn"; title?: string; a: string; b: string; overlap: string; overlapValue?: number; variant?: number } // 2-set overlap. v0 labels below / v1 counted lens
  | { type: "wordstack"; words: string[]; highlight?: number; variant?: number }                               // kinetic type list. v0 left / v1 centred
  | { type: "checklist"; title?: string; items: CheckItem[]; variant?: number }                                // items ticking. v0 ticks / v1 strike-through
  | { type: "versus"; title?: string; left: string; right: string; rows: VersusRow[]; accent?: 0 | 1; variant?: number } // 2-col table. v0 tinted column / v1 ruled
  | { type: "odometer"; value: number; label: string; prefix?: string; suffix?: string; variant?: number }     // rolling digits. v0 open / v1 boxed cells
  | { type: "flowshare"; source: FlowNode; dests: FlowDest[]; unit?: string; variant?: number }                // one source splits into 2-3. v0 ribbons / v1 straight
  | { type: "orbit"; center: string; satellites: string[]; variant?: number }                                  // hub + spokes. v0 one ring / v1 two rings
  | { type: "thermometer"; value: number; goal: number; label: string; suffix?: string; variant?: number }     // fill toward a goal. v0 vertical / v1 horizontal
  | { type: "receipt"; store?: string; items: ReceiptItem[]; totalLabel?: string; currency?: string; variant?: number } // itemised mono lines + total. v0 plain / v1 barcode
  | { type: "ticket"; event: string; venue?: string; date?: string; seat?: string; admit?: string; variant?: number } // ticket stub framing a fact. v0 horizontal / v1 portrait
  | { type: "polaroid"; src?: string; caption: string; rotate?: number; variant?: number }                     // instant photo + caption. v0 tape / v1 pin + stack
  | { type: "clipping"; kicker?: string; headline: string; body: string; source?: string; variant?: number }   // newspaper snippet. v0 one column / v1 two columns
  | { type: "factcard"; title?: string; pairs: FactPair[]; accent?: number; variant?: number }                 // label/value card. v0 rows / v1 tile grid
  | { type: "letter"; salutation: string; body: string; signoff?: string; signature?: string; date?: string; variant?: number } // correspondence snippet. v0 card / v1 open excerpt
  | { type: "countgrid"; items: CompareItem[]; accent?: number; variant?: number }                             // 2-3 stats side by side. v0 row / v1 stacked
  | { type: "tally"; value: number; label: string; variant?: number }                                          // hand-drawn tally marks. v0 centred / v1 readout right
  // ---- library wave 3 (blocks5.tsx maps + globes; geography in geo.ts). ----
  // Place/region names are forgiving: continents, ~45 countries/cities (see geo.ts PLACES).
  | { type: "worldmap"; title?: string; unit?: string; regions: MapRegionItem[]; variant?: number }            // flat world, 1-3 regions highlighted + legend strip. v0 legend columns / v1 rows
  | { type: "globe"; center: string; highlight?: string; value?: number; label?: string; prefix?: string; suffix?: string; plain?: boolean; title?: string; variant?: number } // orthographic globe + one stat panel. v0 panel right / v1 left
  | { type: "maproute"; from: string; to: string; fromLabel?: string; toLabel?: string; value?: number; unit?: string; title?: string; variant?: number } // A->B great arc; value defaults to the km distance. v0 distance strip / v1 in header
  | { type: "mappins"; title?: string; pins: MapPin[]; variant?: number }                                      // numbered pins <-> numbered list below. v0 one column / v1 two columns
  | { type: "mapspread"; origin: string; points: string[]; value?: number; label: string; suffix?: string; title?: string; variant?: number } // expanding rings reach points. v0 readout below / v1 in header
  | { type: "mapdots"; region: string; count: number; value?: number; label: string; suffix?: string; title?: string; unit?: string; seed?: number; variant?: number } // seeded dot density in a region. v0 centred readout / v1 baseline row
  | { type: "mapcompare"; title?: string; unit?: string; items: [MapCompareSide, MapCompareSide]; accent?: 0 | 1; variant?: number } // two regions versus. v0 value columns / v1 rows
  | { type: "globespin"; places: string[]; label?: string; value?: number; suffix?: string; title?: string; variant?: number } // rotating globe, chain reveals. v0 route arcs / v1 points pulse
  | { type: "mapzoom"; region: string; pins?: MapPin[]; title?: string; variant?: number }                     // world + magnified inset with numbered pins. v0 list right / v1 list left
  | { type: "mapflow"; origin: string; originLabel?: string; flows: MapFlowDest[]; unit?: string; title?: string; variant?: number } // flow arcs, width ∝ value + legend rows. v0 curved / v1 straight
  // Real country boundaries (Natural Earth via geo-countries.ts): full globe
  // easing into a target, 110m -> 50m detail crossfade, border draws on.
  | { type: "globezoom"; target?: string; places?: string[]; pins?: MapPin[]; stats?: GlobeStat[]; title?: string; variant?: number } // hero zoom. v0 zoom-to-country (`target`, border draws) / v1 zoom-to-bbox of `places` with numbered pins. 1-2 `stats` in the fixed panel below
  // ---- library wave 4 (blocks6.tsx): DEMONSTRATION blocks. Every block above
  // DESCRIBES data; these SHOW a concept happening — a pointer travelling to a
  // target, a form failing then passing, layers peeling apart. Reusable for UX,
  // product, science and process stories; everything drawn, never an image. ----
  | { type: "cursorpath"; title?: string; unit?: string; runs?: CursorRun[]; label?: string; variant?: number }   // pointer travels to a target and clicks. v0 free targets / v1 targets welded to a screen edge
  | { type: "devicephone"; title?: string; appTitle?: string; rows?: string[]; nav?: string[]; highlight?: number; thumbZone?: boolean; tapAt?: number; note?: string; variant?: number } // drawn phone + UI. v0 centred, note below / v1 phone left, note right
  | { type: "devicebrowser"; title?: string; url?: string; menu?: string[]; highlight?: "menu" | "corner" | "content" | "sidebar"; note?: string; variant?: number } // drawn desktop window. v0 flush to the screen edge / v1 floating inside the screen
  | { type: "uimock"; title?: string; panel?: string; rows?: string[]; buttons?: string[]; highlight?: number; annotate?: string; variant?: number } // wireframe panel + callout on a leader. v0 callout right / v1 callout below
  | { type: "beforeafter"; title?: string; before?: MockSide; after?: MockSide; variant?: number }               // two drawn mocks. v0 side by side / v1 wipe reveal
  | { type: "statechips"; title?: string; label?: string; states?: string[]; note?: string; variant?: number }   // one component in its UI states. v0 row of four / v1 2x2
  | { type: "formdemo"; title?: string; field?: string; text?: string; fixed?: string; error?: string; success?: string; submit?: string; variant?: number } // field types, fails, then passes (`fixed` = the corrected value). v0 message below / v1 inline right
  | { type: "menudemo"; title?: string; items?: string[]; target?: number; note?: string; variant?: number }     // cursor thrown at a menu. v0 welded to the screen edge / v1 floating in a window
  | { type: "heatzone"; title?: string; label?: string; hot?: string; cold?: string; variant?: number }          // soft reach/attention field + fixed ramp legend. v0 phone / v1 page
  | { type: "gazepath"; title?: string; stops?: string[]; variant?: number }                                     // numbered scan path over a page. v0 F-pattern / v1 Z-pattern
  | { type: "diagram"; title?: string; nodes: string[]; label?: string; variant?: number }                       // labelled boxes wired by drawing arrows. v0 row / v1 hub and spokes
  | { type: "sequence"; title?: string; actors: string[]; messages: SequenceMessage[]; variant?: number }        // A->B exchange between 2-3 actors. v0 labels on the arrows / v1 numbered list below
  | { type: "anatomy"; title?: string; object?: "card" | "button" | "shape"; parts: string[]; variant?: number } // one drawn object, leader lines to fixed label columns. v0 split L/R / v1 all right
  | { type: "race"; title?: string; unit?: string; runners: RaceRunner[]; label?: string; variant?: number }     // two markers at different speeds. v0 race to the finish / v1 fixed time, different distance
  | { type: "stack"; title?: string; layers: string[]; highlight?: number; variant?: number }                    // layers of a system revealing. v0 2.5D sheets / v1 flat slabs
  | { type: "toggle"; title?: string; off: string; on: string; result?: string; variant?: number }               // a switch thrown, consequence beside it. v0 pill switch / v1 lever
  | { type: "grid8"; title?: string; label?: string; variant?: number }                                          // elements snapping onto a grid. v0 8pt layout grid / v1 text baseline grid
  | { type: "contrastcheck"; title?: string; pairs: ContrastPair[]; variant?: number }                           // colour pairs + counted ratio + pass/fail badge. v0 cards / v1 rows
  | { type: "typescale"; title?: string; steps: TypeStep[]; variant?: number }                                   // type ramp landing step by step. v0 sizes right / v1 centred
  | { type: "zoomcompare"; title?: string; items: ZoomItem[]; note?: string; variant?: number };                 // one element at two scales. v0 side by side / v1 nested

export interface BarDatum { label: string; value: number }
export interface LinePoint { label: string; value: number }
export interface CompareItem { value: number; label: string; prefix?: string; suffix?: string; plain?: boolean }
export interface TimelineEvent { year: string; label: string }
export interface RankItem { name: string; value?: number; suffix?: string }
export interface IcebergPart { label: string; value: number; suffix?: string }
export interface WaterfallStep { label: string; value: number }   // signed delta
export interface SparkRowDatum { label: string; values: number[]; value?: number; suffix?: string }
export interface StackRow { label: string; values: number[] }                  // one value per series
export interface GroupBarDatum { label: string; a: number; b: number }
export interface SlopeItem { label: string; from: number; to: number; suffix?: string }
export interface BulletRow { label: string; actual: number; target: number; suffix?: string }
export interface BumpItem { label: string; from: number; to: number }          // ranks (1 = top)
export interface DumbbellRow { label: string; from: number; to: number; suffix?: string }
export interface FunnelStage { label: string; value: number; suffix?: string }
export interface PyramidTier { label: string; value?: string }
export interface GanttSpan { label: string; start: number; end: number }       // in grid units
export interface CheckItem { label: string; done?: boolean }
export interface VersusRow { label: string; a: string; b: string }
export interface FlowNode { label: string; value?: number; suffix?: string }
export interface FlowDest { label: string; value: number; suffix?: string }
export interface ReceiptItem { label: string; value: number }
export interface FactPair { label: string; value: string }
export interface MapRegionItem { name: string; label?: string; value?: number; suffix?: string }
export interface MapPin { place: string; label?: string; value?: number; suffix?: string }
export interface MapCompareSide { region: string; label: string; value: number; prefix?: string; suffix?: string; plain?: boolean }
export interface MapFlowDest { place: string; label?: string; value: number; suffix?: string }
export interface GlobeStat { value: number; label: string; prefix?: string; suffix?: string; plain?: boolean }
// wave 4 (demonstration blocks)
export interface CursorRun { label: string; targetSize?: number; distance?: number; ms?: number } // targetSize/distance are relative, ms is the modelled time shown
export interface MockSide { label?: string; caption?: string }
export interface SequenceMessage { from: number; to: number; label: string }   // actor indices
export interface RaceRunner { label: string; value: number; suffix?: string }  // value = the readout (lower = faster)
export interface ContrastPair { label: string; fg?: string; bg?: string; ratio?: number; sample?: string } // ratio is computed from fg/bg when omitted
export interface TypeStep { label: string; size: number; sample?: string }
export interface ZoomItem { label: string; size: number; suffix?: string }

/** Blended background atmosphere under a beat's surface world. `footage` is a
 *  search query — the fetch step resolves it to an open-licensed IMAGE (LOC ->
 *  Wikimedia Commons -> Pexels photos) and fills `src`; a video src also works
 *  (plays muted, clock starts at the beat). `start` = seconds into a clip.
 *  The engine tones it into the brand palette and blends it at low opacity so
 *  blocks/captions stay fully legible — it reads as atmosphere, not an image
 *  beat. Use it SELECTIVELY to break up runs of identical clean surfaces. */
export interface BeatBg { src?: string; footage?: string; start?: number }

export interface ScriptBeat {
  say: string;          // spoken narration (spell out numbers for TTS)
  lines: string[];      // on-screen caption (1-2 short lines)
  visual?: VisualBlock; // what to draw this beat (omit = keep it on paper, caption only)
  /** Optional blended backdrop for THIS beat. `null` opts a beat out of a
   *  story-level `bg` fallback (deliberately clean). */
  bg?: BeatBg | null;
}

export interface VideoScript {
  title: string;
  brand: string;        // brand preset id (drives the theme)
  surface?: string;     // video style (else rotates by title)
  mood?: string;        // music bed: warm | bright | tense (else brand musicMood, else warm)
  context?: string;     // header, left  (e.g. "1883 · Krakatoa")
  status?: string;      // header, right (e.g. "Data story")
  /** Optional story-level backdrop fallback: beats WITHOUT their own `bg`
   *  inherit this one (opt-in — omit it and beats stay clean by default;
   *  a beat can opt out of the fallback with `"bg": null`). */
  bg?: BeatBg;
  beats: ScriptBeat[];
}

/** Per-beat timings, derived from the ElevenLabs character alignment. */
export interface DocTimings { total: number; beats: { start: number; end: number }[] }

export interface DocProps { script: VideoScript; timings: DocTimings; logo?: string }
