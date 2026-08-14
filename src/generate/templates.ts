// Templates: the "one-click generate" engine. Each template exposes a small set
// of fields with sensible defaults and knows how to assemble a full, renderable
// Spec from them — including synthetic word timings so captions and the
// audio-synced score pop line up. Pure TypeScript (no React/Remotion/Electron),
// so it is shared by the Create screen and the automated channel pipeline.
import type { Spec, Scene, Word } from "../engine/types";
import MINARD_TIMING from "../brands/story/minard-timings.json";

export type FieldType = "text" | "textarea" | "number" | "select" | "list";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  itemFields?: FieldDef[]; // for type: "list"
  min?: number;
  max?: number;
  default: unknown;
}

export interface TemplateCtx {
  brand: string;   // brand preset id -> spec.brand
  handle: string;  // brand handle, e.g. "@launchpad", used in CTAs
}

export interface Template {
  id: string;
  label: string;
  description: string;
  kit: string;   // rendering kit these scenes target; must match the brand's kit
  fields: FieldDef[];
  build(inputs: Record<string, any>, ctx: TemplateCtx): Spec;
}

// ---- helpers ---------------------------------------------------------------

const round = (n: number) => +n.toFixed(3);
const flat = (s: string) => String(s ?? "").replace(/\n+/g, " ").trim();
const pageNo = (i: number, total: number) =>
  `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
const slug = (s: string) => flat(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 22);

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** 0..100 spelled out, matching how a score is narrated (94 -> "ninety four"). */
export function scoreWords(n: number): string {
  const v = Math.max(0, Math.min(100, Math.round(n)));
  if (v === 100) return "one hundred";
  if (v < 20) return ONES[v];
  const t = Math.floor(v / 10), o = v % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

export const parsePills = (s: string): string[] =>
  String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

interface Beat {
  type: string;
  narration: string;
  dur: number;
  props: Record<string, unknown>;
}

/** Lay beats out end to end, generating even-spaced word timings per beat. */
function assemble(beats: Beat[], ctx: TemplateCtx): Spec {
  const scenes: Scene[] = [];
  const words: Word[] = [];
  let t = 0;
  const total = beats.length;
  beats.forEach((b, i) => {
    const startSec = round(t);
    const endSec = round(t + b.dur);
    const ws = flat(b.narration).length ? flat(b.narration).split(/\s+/) : [];
    if (ws.length) {
      const d = b.dur / ws.length;
      ws.forEach((w, j) => words.push({
        word: w, start: round(startSec + j * d), end: round(startSec + j * d + d * 0.92),
      }));
    }
    scenes.push({ id: "s" + i, type: b.type, startSec, endSec, props: { ...b.props, pageNo: pageNo(i, total) } });
    t = endSec;
  });
  return { fps: 30, width: 1080, height: 1920, brand: ctx.brand, words, scenes };
}

const ITEM_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text", default: "" },
  { key: "meta", label: "Meta", type: "text", help: "platforms · price, etc.", default: "" },
  { key: "score", label: "Score", type: "number", min: 0, max: 100, default: 80 },
];

const SAMPLE_ITEMS = [
  { name: "Ashfall Vanguard", meta: "PC · PS5 · $39", score: 94 },
  { name: "Neon Tide", meta: "PC · Switch · $24", score: 88 },
  { name: "Hollow Signal", meta: "Xbox · $29", score: 82 },
  { name: "Verdant Reign", meta: "PS5 · $49", score: 77 },
  { name: "Paper Lanterns", meta: "PC · $14", score: 71 },
];

const LOOK_FIELD: FieldDef = {
  key: "look", label: "Media look", type: "select", default: "neon",
  help: "Synthetic backdrop used when a scene has no footage.",
  options: [
    { label: "Neon", value: "neon" },
    { label: "Ember", value: "ember" },
    { label: "Forest", value: "forest" },
  ],
};

// ---- templates -------------------------------------------------------------

const countdown: Template = {
  id: "countdown",
  label: "Top 5 countdown",
  description: "Intro, a ranked board, a spotlight on the #1 pick, and an outro. The classic list video.",
  kit: "editorial",
  fields: [
    { key: "kicker", label: "Kicker", type: "text", default: "New this week", help: "Small label at the top." },
    { key: "title", label: "Title", type: "textarea", default: "Five games\nworth your", help: "Use line breaks for stacked headline lines." },
    { key: "markerLine", label: "Highlighted word", type: "text", default: "weekend.", help: "Drawn with the accent marker." },
    { key: "subtitle", label: "Subtitle", type: "text", default: "Reviewed & ranked" },
    { key: "heading", label: "Board heading", type: "text", default: "Highest rated" },
    { key: "items", label: "Ranked items", type: "list", itemFields: ITEM_FIELDS, default: SAMPLE_ITEMS },
    { key: "scoreLabel", label: "Spotlight score label", type: "text", default: "Aggregate" },
    { key: "pills", label: "Spotlight tags", type: "text", help: "Comma separated.", default: "PC, PS5, $39" },
    LOOK_FIELD,
  ],
  build(inp, ctx) {
    const items = (inp.items as any[]).map((r, i) => ({ rank: i + 1, name: r.name, meta: r.meta, score: Number(r.score) || 0 }));
    const top = items[0] ?? { name: "Top pick", score: 90 };
    const names3 = items.slice(0, 3).map((r) => r.name).join(", ");
    const sw = scoreWords(top.score);
    return assemble([
      {
        type: "intro", dur: 4.2,
        narration: `${flat(inp.title)} ${inp.markerLine}`,
        props: { kicker: inp.kicker, title: inp.title, markerLine: inp.markerLine, sub: inp.subtitle },
      },
      {
        type: "ranking", dur: 7.2,
        narration: `Topping the chart: ${names3}, and more.`,
        props: { heading: inp.heading, items },
      },
      {
        type: "spotlight", dur: 6.4,
        narration: `Our pick is ${top.name}, sitting at ${sw} out of a hundred.`,
        props: { kicker: "Pick of the week", title: top.name, score: top.score, scoreLabel: inp.scoreLabel, statPhrase: sw, pills: parsePills(inp.pills), look: inp.look },
      },
      {
        type: "outro", dur: 2.8,
        narration: `That's the week. Follow ${ctx.handle}.`,
        props: { title: "That's the", markerLine: "week.", cta: `Follow ${ctx.handle}` },
      },
    ], ctx);
  },
};

const spotlight: Template = {
  id: "spotlight",
  label: "Single spotlight",
  description: "One subject, front and center: an intro, a full-bleed spotlight with an animated score, and an outro.",
  kit: "editorial",
  fields: [
    { key: "kicker", label: "Kicker", type: "text", default: "Pick of the week" },
    { key: "introTitle", label: "Intro title", type: "textarea", default: "This week's\none to", help: "Line breaks allowed." },
    { key: "introMarker", label: "Intro highlighted word", type: "text", default: "watch." },
    { key: "title", label: "Spotlight title", type: "textarea", default: "Ashfall\nVanguard" },
    { key: "score", label: "Score", type: "number", min: 0, max: 100, default: 94 },
    { key: "scoreLabel", label: "Score label", type: "text", default: "Aggregate" },
    { key: "pills", label: "Tags", type: "text", help: "Comma separated.", default: "PC, PS5, $39" },
    LOOK_FIELD,
  ],
  build(inp, ctx) {
    const sw = scoreWords(Number(inp.score) || 0);
    return assemble([
      {
        type: "intro", dur: 3.4,
        narration: `${flat(inp.introTitle)} ${inp.introMarker}`,
        props: { kicker: inp.kicker, title: inp.introTitle, markerLine: inp.introMarker, sub: "" },
      },
      {
        type: "spotlight", dur: 6.6,
        narration: `${flat(inp.title)}, scoring ${sw} out of a hundred.`,
        props: { kicker: inp.kicker, title: inp.title, score: Number(inp.score) || 0, scoreLabel: inp.scoreLabel, statPhrase: sw, pills: parsePills(inp.pills), look: inp.look },
      },
      {
        type: "outro", dur: 2.8,
        narration: `Follow ${ctx.handle} for more.`,
        props: { title: "More every", markerLine: "week.", cta: `Follow ${ctx.handle}` },
      },
    ], ctx);
  },
};

const rundown: Template = {
  id: "rundown",
  label: "Quick rundown",
  description: "Short and sharp: an intro and a ranked board, no spotlight. Great for a fast list.",
  kit: "editorial",
  fields: [
    { key: "kicker", label: "Kicker", type: "text", default: "The rundown" },
    { key: "title", label: "Title", type: "textarea", default: "This week in\nthree" },
    { key: "markerLine", label: "Highlighted word", type: "text", default: "minutes." },
    { key: "heading", label: "Board heading", type: "text", default: "The list" },
    { key: "items", label: "Items", type: "list", itemFields: ITEM_FIELDS, default: SAMPLE_ITEMS.slice(0, 4) },
  ],
  build(inp, ctx) {
    const items = (inp.items as any[]).map((r, i) => ({ rank: i + 1, name: r.name, meta: r.meta, score: Number(r.score) || 0 }));
    const names = items.map((r) => r.name).join(", ");
    return assemble([
      {
        type: "intro", dur: 3.2,
        narration: `${flat(inp.title)} ${inp.markerLine}`,
        props: { kicker: inp.kicker, title: inp.title, markerLine: inp.markerLine, sub: "" },
      },
      {
        type: "ranking", dur: 8.0,
        narration: `On the list: ${names}.`,
        props: { heading: inp.heading, items },
      },
      {
        type: "outro", dur: 2.6,
        narration: `That's the rundown. Follow ${ctx.handle}.`,
        props: { title: "Back next", markerLine: "week.", cta: `Follow ${ctx.handle}` },
      },
    ], ctx);
  },
};

// ---- cinematic kit templates ----------------------------------------------

const STEAM_ITEM_FIELDS: FieldDef[] = [
  { key: "name", label: "Game", type: "text", default: "" },
  { key: "genre", label: "Genre", type: "text", default: "" },
  { key: "platforms", label: "Platforms", type: "text", default: "PC" },
  { key: "price", label: "Price", type: "text", default: "$19.99" },
  { key: "score", label: "Rating %", type: "number", min: 0, max: 100, default: 90 },
  { key: "mediaSrc", label: "Gameplay clip", type: "text", help: "video/<file> in public/. Blank = synthetic backdrop.", default: "" },
];

const SAMPLE_GAMES = [
  { name: "Ashfall Vanguard", genre: "Tactical shooter", platforms: "PC · PS5", price: "$39.99", score: 92, mediaSrc: "" },
  { name: "Neon Tide", genre: "Roguelike", platforms: "PC · Switch", price: "$24.99", score: 88, mediaSrc: "" },
  { name: "Hollow Signal", genre: "Survival horror", platforms: "PC · Xbox", price: "$29.99", score: 84, mediaSrc: "" },
  { name: "Verdant Reign", genre: "City builder", platforms: "PC", price: "$34.99", score: 79, mediaSrc: "" },
];

const steamNew: Template = {
  id: "steam-new",
  label: "New releases on Steam",
  description: "Cinematic run-through of this week's Steam releases — full-bleed gameplay per game, animated rating, tags. (Dispatch look.)",
  kit: "cinematic",
  fields: [
    { key: "status", label: "Corner status", type: "text", default: "NEW THIS WEEK" },
    { key: "games", label: "Games", type: "list", itemFields: STEAM_ITEM_FIELDS, default: SAMPLE_GAMES },
  ],
  build(inp, ctx) {
    const games = inp.games as any[];
    const total = games.length;
    const beats: Beat[] = [{
      type: "opener", dur: 3.4,
      narration: "Fresh drops on Steam this week — here's what's actually worth your time.",
      props: { kicker: "Steam · New releases", title: "New on Steam\nthis week", sub: "Fresh this week", topLeft: "STEAM · NEW RELEASES", topRight: inp.status, source: "Steam store metadata · placeholder art", progressLabel: "steam / new", seed: 1 },
    }];
    games.forEach((g, i) => {
      const sw = scoreWords(Number(g.score) || 0);
      beats.push({
        type: "item", dur: 4.2,
        narration: `${g.name}. ${g.genre}. Rated ${sw} percent.`,
        props: {
          kicker: g.genre, title: g.name,
          stat: { value: Number(g.score) || 0, label: "user rating", suffix: "%", statPhrase: `${sw} percent` },
          tags: [g.platforms, g.price].filter(Boolean),
          topLeft: "NEW RELEASE", topRight: "OUT NOW", index: i + 1, total,
          source: `Steam · ${g.name} · placeholder gameplay`, progressLabel: slug(g.name), seed: i + 2,
          mediaSrc: g.mediaSrc || "",
        },
      });
    });
    beats.push({
      type: "closer", dur: 2.8,
      narration: `That's this week's drops. Follow ${ctx.handle} for the next batch.`,
      props: { title: "More every\nweek.", cta: `Follow ${ctx.handle}`, topLeft: "STEAM · NEW RELEASES", topRight: inp.status, source: "", progressLabel: "steam / new", seed: 9 },
    });
    return assemble(beats, ctx);
  },
};

const HISTORY_FACT_FIELDS: FieldDef[] = [
  { key: "title", label: "Fact", type: "textarea", default: "" },
  { key: "year", label: "Year", type: "number", default: 1800 },
  { key: "detail", label: "Detail (narrated)", type: "textarea", default: "" },
  { key: "source", label: "Source / credit", type: "text", default: "Wikimedia Commons · public domain" },
  { key: "mediaSrc", label: "Image", type: "text", help: "images/<file> in public/. Blank = synthetic parchment.", default: "" },
];

const SAMPLE_FACTS = [
  { title: "A one-day war\nover a bucket", year: 1325, detail: "In 1325 the city-states of Modena and Bologna went to war over a stolen oak bucket. Modena kept the bucket.", source: "Battle of Zappolino · public domain", mediaSrc: "images/history/fact1.svg" },
  { title: "The map that\ninvented a country", year: 1507, detail: "A 1507 map by Waldseemuller was the first to label the new continent America — after Amerigo Vespucci.", source: "Waldseemuller map · Library of Congress · public domain", mediaSrc: "images/history/fact2.svg" },
  { title: "Newton, warden\nof the mint", year: 1696, detail: "Isaac Newton spent his later years hunting counterfeiters as warden of the Royal Mint, and sent several to the gallows.", source: "Royal Mint records · public domain", mediaSrc: "images/history/fact3.svg" },
];

const historyFacts: Template = {
  id: "history-facts",
  label: "History facts",
  description: "Light, archival history in the dispatch look — a centered fact over public-domain imagery, per beat. (Cinematic kit.)",
  kit: "cinematic",
  fields: [
    { key: "status", label: "Corner status", type: "text", default: "FIELD NOTES" },
    { key: "facts", label: "Facts", type: "list", itemFields: HISTORY_FACT_FIELDS, default: SAMPLE_FACTS },
  ],
  build(inp, ctx) {
    const facts = inp.facts as any[];
    const total = facts.length;
    const beats: Beat[] = [{
      type: "opener", dur: 3.2,
      narration: "Three pieces of history that never made it into the textbooks.",
      props: { kicker: "History · Field notes", title: "History,\nunfootnoted", sub: "Three true things", topLeft: "HISTORY · FIELD NOTES", topRight: inp.status, source: "Public-domain imagery · placeholder", progressLabel: "history / notes", seed: 1, mediaSrc: "images/history/opener.svg" },
    }];
    facts.forEach((fct, i) => {
      beats.push({
        type: "statement", dur: 5.0,
        narration: `${flat(fct.title)}. ${fct.detail}`,
        props: {
          kicker: `Circa ${fct.year}`, text: fct.title, attribution: fct.source,
          topLeft: `ON THIS DAY · ${fct.year}`, topRight: inp.status, index: i + 1, total,
          source: fct.source, progressLabel: slug(fct.title), seed: i + 2, mediaSrc: fct.mediaSrc || "",
        },
      });
    });
    beats.push({
      type: "closer", dur: 2.6,
      narration: `More history soon. Follow ${ctx.handle}.`,
      props: { title: "More history\nsoon.", cta: `Follow ${ctx.handle}`, topLeft: "HISTORY · FIELD NOTES", topRight: inp.status, progressLabel: "history / notes", seed: 9, mediaSrc: "images/history/closer.svg" },
    });
    return assemble(beats, ctx);
  },
};

const minardStory: Template = {
  id: "minard-story",
  label: "Napoleon 1812 (Minard)",
  description: "A single fact told as a data story: Minard's flow map of the 1812 retreat, the army melting from 422,000 to 10,000. Bespoke motion graphics. (Story kit.)",
  kit: "story",
  fields: [],
  build(_inp, ctx) {
    return {
      fps: 30, width: 1080, height: 1920, brand: ctx.brand,
      audioSrc: "audio/minard/narration.mp3",
      musicSrc: "audio/minard/bed.wav",
      words: [],
      scenes: [{ id: "s0", type: "minard", startSec: 0, endSec: MINARD_TIMING.total, props: {} }],
    };
  },
};

export const TEMPLATES: Template[] = [minardStory, countdown, spotlight, rundown, steamNew, historyFacts];

export const getTemplate = (id: string): Template =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const templatesForKit = (kit: string): Template[] =>
  TEMPLATES.filter((t) => t.kit === kit);

/** Default input object for a template, straight from its field defaults. */
export function defaultInputs(t: Template): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of t.fields) out[f.key] = structuredClone(f.default);
  return out;
}

export function buildFromTemplate(id: string, inputs: Record<string, any>, ctx: TemplateCtx): Spec {
  const t = getTemplate(id);
  const merged = { ...defaultInputs(t), ...inputs };
  const spec = t.build(merged, ctx);
  spec.kit = t.kit;
  return spec;
}
