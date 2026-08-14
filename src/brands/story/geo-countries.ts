// Country-level geography on top of the generated Natural Earth dataset
// (geo-data.ts, built by scripts/build-geo.mjs). Two detail tiers:
//   "world" — ne_110m, every country; what full globes / flat worlds draw.
//   "zoom"  — ne_50m, the detail set the zoom camera crossfades to.
// Lookups are forgiving (same normalization as geo.ts findPlace) and cover
// NAME / ADMIN / NAME_LONG / ISO codes plus the alias vocabulary the story
// scripts already use ("USA", "UK", historical names...). Decoding is lazy
// and memoized — imports cost nothing until a map block actually draws.
import { WORLD_TIER, ZOOM_TIER, US_STATES_TIER, type PackedCountry } from "./geo-data";
import { norm, findRegion, type GeoRegion, type LonLat } from "./geo";

export type GeoTier = "world" | "zoom";

export interface GeoCountry {
  name: string;                              // display name, e.g. "Italy"
  iso: string;                               // ISO 3166-1 alpha-2 (or A3 fallback)
  continent: string;                         // slug: "europe", "asia", ...
  rings: LonLat[][];                         // outer rings, largest first
  centroid: LonLat;                          // of the main ring
  bbox: [number, number, number, number];    // dateline-unwrapped (lon may exceed ±180)
}

const decode = (p: PackedCountry): GeoCountry => ({
  name: p.n,
  iso: p.i,
  continent: p.k,
  centroid: p.c,
  bbox: p.b,
  rings: p.r.map((enc) => {
    const ring: LonLat[] = [[enc[0] / 100, enc[1] / 100]];
    let x = enc[0], y = enc[1];
    for (let j = 2; j < enc.length; j += 2) {
      x += enc[j]; y += enc[j + 1];
      ring.push([x / 100, y / 100]);
    }
    return ring;
  }),
});

const tierCache: Partial<Record<GeoTier, GeoCountry[]>> = {};

/** Every country at the given detail tier (decoded once, then cached). */
export const countries = (tier: GeoTier = "world"): GeoCountry[] =>
  (tierCache[tier] ??= (tier === "world" ? WORLD_TIER : ZOOM_TIER).map(decode));

let statesCache: GeoCountry[] | null = null;
/** The 50 US states + DC at ne_50m detail (continent slug "us-state",
 *  iso "US-<postal>"). One detail level — states only matter zoomed in. */
export const usStates = (): GeoCountry[] => (statesCache ??= US_STATES_TIER.map(decode));

// The story-script vocabulary (and common/historical names) -> ISO codes.
// findPlace's ALIASES cover cities; this covers sovereign borders.
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US", "united states": "US", america: "US", us: "US",
  uk: "GB", britain: "GB", "great britain": "GB", england: "GB",
  "south korea": "KR", korea: "KR", "north korea": "KP",
  uae: "AE", "united arab emirates": "AE", turkey: "TR", turkiye: "TR",
  "czech republic": "CZ", holland: "NL", "the netherlands": "NL",
  persia: "IR", siam: "TH", burma: "MM", "ivory coast": "CI",
  "east timor": "TL", macedonia: "MK", swaziland: "SZ", "cape verde": "CV",
  drc: "CD", "democratic republic of the congo": "CD", congo: "CD",
  "vatican city": "VA", "new zealand": "NZ", "saudi arabia": "SA",
  "south africa": "ZA", "sri lanka": "LK", "papua new guinea": "PG",
  "bosnia": "BA", "bosnia and herzegovina": "BA", scotland: "GB", wales: "GB",
};

const indexCache: Partial<Record<GeoTier, Map<string, GeoCountry>>> = {};
const indexOf = (tier: GeoTier): Map<string, GeoCountry> => {
  const cached = indexCache[tier];
  if (cached) return cached;
  const map = new Map<string, GeoCountry>();
  const put = (key: string, ct: GeoCountry) => { if (key && !map.has(key)) map.set(key, ct); };
  const packed = tier === "world" ? WORLD_TIER : ZOOM_TIER;
  countries(tier).forEach((ct, i) => {
    put(norm(ct.name), ct);
    put(ct.iso.toLowerCase(), ct);
    for (const extra of packed[i].l ?? []) put(norm(extra), ct);
  });
  for (const [alias, iso] of Object.entries(COUNTRY_ALIASES)) {
    const ct = map.get(iso.toLowerCase());
    if (ct) put(alias, ct);
  }
  // US states resolve at BOTH tiers (one 50m detail level; countries win any
  // key clash — e.g. postal "CA" stays Canada, "US-CA" is always California).
  usStates().forEach((st, i) => {
    put(norm(st.name), st);
    put(st.iso.toLowerCase(), st);
    for (const extra of US_STATES_TIER[i].l ?? []) put(norm(extra), st);
  });
  return (indexCache[tier] = map);
};

/** Find a country by (forgiving) name or ISO code; null when unknown. */
export const findCountry = (name: string, tier: GeoTier = "world"): GeoCountry | null => {
  const n = norm(name);
  const idx = indexOf(tier);
  return idx.get(n) ?? idx.get(n.replace(/^the /, "")) ?? null;
};

const coreCache = new Map<string, [number, number, number, number]>();

/** The bbox a CAMERA should frame: the main ring plus rings near it. The full
 *  `bbox` field spans every ring — for France that includes French Guiana, so
 *  a zoom would frame the Atlantic. This drops far-flung territories (also:
 *  USA -> the contiguous states) while keeping near islands (Corsica, Sicily). */
export const coreBBox = (ct: GeoCountry): [number, number, number, number] => {
  const hit = coreCache.get(ct.iso + ct.rings.length);
  if (hit) return hit;
  let b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  ct.rings.forEach((ring, i) => {
    const cx = ring.reduce((s, q) => s + q[0], 0) / ring.length;
    const cy = ring.reduce((s, q) => s + q[1], 0) / ring.length;
    let dl = cx - ct.centroid[0];
    while (dl > 180) dl -= 360;
    while (dl < -180) dl += 360;
    if (i > 0 && (Math.abs(dl) > 28 || Math.abs(cy - ct.centroid[1]) > 22)) return;
    for (const [lon, lat] of ring) {
      let l = lon; // keep the box contiguous across the dateline
      while (l - ct.centroid[0] > 180) l -= 360;
      while (l - ct.centroid[0] < -180) l += 360;
      b = [Math.min(b[0], l), Math.min(b[1], lat), Math.max(b[2], l), Math.max(b[3], lat)];
    }
  });
  coreCache.set(ct.iso + ct.rings.length, b);
  return b;
};

/** All member countries of a continent slug at a tier ("europe", "asia"...). */
export const continentCountries = (slug: string, tier: GeoTier = "world"): GeoCountry[] =>
  countries(tier).filter((ct) => ct.continent === slug);

const contCache = new Map<string, GeoRegion>();

/** A continent as a country-detail GeoRegion (member rings concatenated) —
 *  the detailed replacement for geo.ts's hand-drawn WORLD highlights on the
 *  globe. Forgiving name via geo.ts findRegion; null when unknown. */
export const findContinentDetailed = (name: string, tier: GeoTier = "world"): GeoRegion | null => {
  const flat = findRegion(name);
  if (!flat) return null;
  const key = `${flat.name}:${tier}`;
  const hit = contCache.get(key);
  if (hit) return hit;
  const members = continentCountries(flat.name, tier);
  if (!members.length) return null;
  const region: GeoRegion = { name: flat.name, polys: members.flatMap((ct) => ct.rings) };
  contCache.set(key, region);
  return region;
};

/** Highlight polygons for a named place at country detail: a country when the
 *  name matches one, else a whole continent; null when neither resolves. */
export const findHighlight = (name: string, tier: GeoTier = "world"): GeoRegion | null => {
  const ct = findCountry(name, tier);
  if (ct) return { name: ct.iso, polys: ct.rings };
  return findContinentDetailed(name, tier);
};
