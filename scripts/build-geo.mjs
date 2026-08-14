// One-off geodata builder: downloads Natural Earth admin-0 country boundaries
// (public domain), simplifies + quantizes them, and writes the compact
// generated module src/brands/story/geo-data.ts that the map/globe blocks
// consume (via src/brands/story/geo-countries.ts).
//
//   node scripts/build-geo.mjs
//
// Two detail tiers:
//   - WORLD tier from ne_110m: every country, light simplify — the full-globe
//     and flat-world drawing set.
//   - ZOOM  tier from ne_50m: the detail set the zoom camera crossfades to.
// Plus US sub-national detail:
//   - US_STATES tier from ne_50m admin-1 (United States only): the 50 states
//     + DC, so zooms can land on "Wisconsin" instead of sweeping the whole
//     country, with surrounding states drawn as faint context.
// Downloads cache in $TMPDIR/autovid-ne-cache so re-runs are offline.
// Budget: generated module must stay under ~2.5MB (tune SIMPLIFY/DROP below).
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/brands/story/geo-data.ts");
const CACHE = join(tmpdir(), "autovid-ne-cache");
mkdirSync(CACHE, { recursive: true });

const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const SOURCES = {
  world: { file: "ne_110m_admin_0_countries.geojson", simplify: 0.004, dropRing: 0.25 },
  zoom: { file: "ne_50m_admin_0_countries.geojson", simplify: 0.0003, dropRing: 0.008 },
  states: { file: "ne_50m_admin_1_states_provinces.geojson", simplify: 0.0003, dropRing: 0.008 },
};

const RAD = Math.PI / 180;

async function load(file) {
  const cached = join(CACHE, file);
  if (!existsSync(cached)) {
    console.log(`downloading ${file}...`);
    const res = await fetch(`${NE_BASE}/${file}`);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  const fc = JSON.parse(readFileSync(cached, "utf8"));
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) throw new Error(`${file}: not a FeatureCollection`);
  return fc;
}

/** Signed shoelace area of an unclosed ring, in deg² (cos-lat corrected). */
function ringArea(ring) {
  let s = 0, latSum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    latSum += ring[i][1];
  }
  return Math.abs(s / 2) * Math.cos((latSum / ring.length) * RAD);
}

/** Visvalingam–Whyatt: drop points whose (cos-lat weighted) triangle area is
 *  under minArea. Treats the ring as closed; never goes below 6 points. */
function simplifyRing(ring, minArea) {
  const pts = ring.slice();
  const tri = (a, b, c) =>
    Math.abs((pts[a][0] - pts[c][0]) * (pts[b][1] - pts[a][1]) - (pts[a][0] - pts[b][0]) * (pts[c][1] - pts[a][1])) / 2
    * Math.cos(pts[b][1] * RAD);
  const prev = pts.map((_, i) => (i === 0 ? pts.length - 1 : i - 1));
  const next = pts.map((_, i) => (i === pts.length - 1 ? 0 : i + 1));
  const alive = pts.map(() => true);
  let n = pts.length;
  const area = pts.map((_, i) => tri(prev[i], i, next[i]));
  while (n > 6) {
    let mi = -1, mv = Infinity;
    for (let i = 0; i < pts.length; i++) if (alive[i] && area[i] < mv) { mv = area[i]; mi = i; }
    if (mv >= minArea || mi < 0) break;
    alive[mi] = false; n--;
    const p = prev[mi], q = next[mi];
    next[p] = q; prev[q] = p;
    area[p] = tri(prev[p], p, next[p]);
    area[q] = tri(prev[q], q, next[q]);
  }
  return pts.filter((_, i) => alive[i]);
}

/** Quantize to 0.01° ints, dropping consecutive duplicates. */
function quantize(ring) {
  const out = [];
  for (const [lon, lat] of ring) {
    const x = Math.round(lon * 100), y = Math.round(lat * 100);
    const last = out[out.length - 1];
    if (!last || last[0] !== x || last[1] !== y) out.push([x, y]);
  }
  const first = out[0], last = out[out.length - 1];
  if (out.length > 1 && first[0] === last[0] && first[1] === last[1]) out.pop(); // store unclosed
  return out;
}

/** Delta-encode a quantized ring: [x0, y0, dx1, dy1, ...] (all ints). */
function deltaEncode(q) {
  const enc = [q[0][0], q[0][1]];
  for (let i = 1; i < q.length; i++) enc.push(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
  return enc;
}

/** Area centroid of an unclosed ring (shoelace). */
function centroidOf(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
  }
  if (Math.abs(a) < 1e-9) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}

const CONT_SLUG = {
  "North America": "north-america", "South America": "south-america", Europe: "europe",
  Africa: "africa", Asia: "asia", Oceania: "oceania", Antarctica: "antarctica",
  "Seven seas (open ocean)": "seven-seas",
};
// Natural Earth files Russia under Europe; a continent highlight of "Europe"
// must not sweep to Kamchatka, and the engine's hand-drawn WORLD has always
// put Siberia with Asia (the Ural/Caucasus divide) — keep that semantic.
const CONT_OVERRIDE = { RU: "asia" };

/** Country identity from ne admin-0 properties (UPPERCASE keys). */
function countryProps(p) {
  const name = p.NAME ?? p.ADMIN;
  const isoRaw = [p.ISO_A2_EH, p.ISO_A2, p.ADM0_A3].find((v) => v && v !== "-99");
  const iso = String(isoRaw ?? name.slice(0, 3)).toUpperCase();
  const extras = [...new Set([p.ADMIN, p.NAME_LONG].filter((v) => v && v !== name))];
  return { name, iso, k: CONT_OVERRIDE[iso] ?? CONT_SLUG[p.CONTINENT] ?? "seven-seas", extras };
}

/** US state identity from ne admin-1 properties (lowercase keys); null = skip
 *  (everything that is not a US state / DC). */
function usStateProps(p) {
  if (p.adm0_a3 !== "USA" || !p.name) return null;
  const postal = String(p.postal ?? p.name.slice(0, 2)).toUpperCase();
  const extras = [...new Set([postal, p.name_alt].filter((v) => v && v !== p.name))];
  return { name: p.name, iso: `US-${postal}`, k: "us-state", extras };
}

function buildTier(fc, { simplify, dropRing }, mapProps = countryProps) {
  const out = [];
  for (const f of fc.features) {
    const ident = mapProps(f.properties);
    if (!ident) continue;
    const { name, iso, k, extras } = ident;
    if (!f.geometry) continue;
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    // outer rings only (holes dropped: same-ink fills make them invisible anyway)
    let rings = polys.map((po) => po[0]).filter((r) => r && r.length >= 4);
    if (!rings.length) continue;
    const areas = rings.map(ringArea);
    const biggest = areas.indexOf(Math.max(...areas));
    rings = rings
      .map((r, i) => ({ r, a: areas[i], keep: i === biggest || areas[i] >= dropRing }))
      .filter((x) => x.keep)
      .map((x) => ({ ...x, r: quantize(simplifyRing(x.r, simplify)).map((q) => [q[0] / 100, q[1] / 100]) }))
      .filter((x) => x.r.length >= (x.a === areas[biggest] ? 3 : 4));
    if (!rings.length) continue;

    const main = rings.reduce((best, x) => (x.a > best.a ? x : best), rings[0]);
    let [cLon, cLat] = centroidOf(main.r);
    cLon = ((cLon + 540) % 360) - 180;
    // dateline-aware bbox: shift each ring by ±360 toward the main centroid
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const x of rings) {
      const mean = x.r.reduce((s, q) => s + q[0], 0) / x.r.length;
      let shift = 0;
      if (mean - cLon > 180) shift = -360; else if (mean - cLon < -180) shift = 360;
      for (const [lon, lat] of x.r) {
        b = [Math.min(b[0], lon + shift), Math.min(b[1], lat), Math.max(b[2], lon + shift), Math.max(b[3], lat)];
      }
    }
    out.push({
      n: name, ...(extras.length ? { l: extras } : {}), i: iso,
      k,
      c: [+cLon.toFixed(2), +cLat.toFixed(2)],
      b: b.map((v) => +v.toFixed(2)),
      r: rings.sort((x, y) => y.a - x.a).map((x) => deltaEncode(x.r.map((q) => [Math.round(q[0] * 100), Math.round(q[1] * 100)]))),
      _area: rings.reduce((s, x) => s + x.a, 0),
    });
  }
  // draw order: big countries first so small ones stroke on top
  out.sort((x, y) => y._area - x._area);
  for (const o of out) delete o._area;
  return out;
}

const pack = (c) =>
  `{n:${JSON.stringify(c.n)},${c.l ? `l:${JSON.stringify(c.l)},` : ""}i:"${c.i}",k:"${c.k}",` +
  `c:[${c.c}],b:[${c.b}],r:[${c.r.map((r) => `[${r}]`).join(",")}]}`;

const [fc110, fc50, fcAdm1] = await Promise.all([
  load(SOURCES.world.file), load(SOURCES.zoom.file), load(SOURCES.states.file),
]);
const world = buildTier(fc110, SOURCES.world);
const zoom = buildTier(fc50, SOURCES.zoom);
const states = buildTier(fcAdm1, SOURCES.states, usStateProps);

const count = (tier) => tier.reduce((s, c) => s + c.r.reduce((t, r) => t + r.length / 2, 0), 0);
const header = `// GENERATED FILE — do not edit. Rebuild with: node scripts/build-geo.mjs
// Country boundaries from Natural Earth (naturalearthdata.com, public domain):
// WORLD_TIER = ne_110m admin-0 (all countries, the full-globe / flat-world set),
// ZOOM_TIER = ne_50m admin-0 (the detail set zoom cameras crossfade to),
// US_STATES_TIER = ne_50m admin-1 filtered to the United States (50 states +
// DC; k = "us-state", i = "US-<postal>") so zooms can land sub-nationally.
// Rings are outer boundaries only, simplified (Visvalingam) and quantized to
// 0.01°, then delta-encoded as integers: [lon0*100, lat0*100, dLon, dLat, ...].
// Decode + lookups live in ./geo-countries.ts. bbox lons are dateline-unwrapped
// (may exceed ±180 for countries crossing it, e.g. Russia, Fiji).

export interface PackedCountry {
  n: string;                                // display name (NE NAME)
  l?: string[];                             // extra lookup names (ADMIN / NAME_LONG)
  i: string;                                // ISO 3166-1 alpha-2 (or ADM0_A3 fallback)
  k: string;                                // continent slug ("europe", "asia", ...)
  c: [number, number];                      // centroid of the main ring, lon/lat
  b: [number, number, number, number];      // bbox [minLon, minLat, maxLon, maxLat]
  r: number[][];                            // delta-encoded rings, largest first
}
`;
const body =
  `${header}
export const WORLD_TIER: PackedCountry[] = [
${world.map(pack).join(",\n")}
];

export const ZOOM_TIER: PackedCountry[] = [
${zoom.map(pack).join(",\n")}
];

export const US_STATES_TIER: PackedCountry[] = [
${states.map(pack).join(",\n")}
];
`;
writeFileSync(OUT, body);
const kb = (statSync(OUT).size / 1024).toFixed(0);
console.log(`geo-data.ts: ${kb}KB  (world: ${world.length} countries / ${count(world)} pts · zoom: ${zoom.length} / ${count(zoom)} pts · US states: ${states.length} / ${count(states)} pts)`);
if (statSync(OUT).size > 2.5 * 1024 * 1024) {
  console.error("OVER BUDGET (2.5MB) — raise SOURCES simplify/dropRing and re-run.");
  process.exit(1);
}
