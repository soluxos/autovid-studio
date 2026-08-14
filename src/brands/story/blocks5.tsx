import React from "react";
import { Easing, interpolate } from "remotion";
import type { VisualBlock } from "./doc-types";
import { CountNumber, clamp01, easeOut, backOut, V, a, type BlockColors } from "./blocks";
import { Header, MONO_LABEL } from "./blocks2";
import {
  WORLD, findPlace, findRegion, worldXY, worldH, orthographic, greatArc,
  distanceKm, scatterInRegion, ringPath, regionBounds, type LonLat, type GeoRegion,
} from "./geo";
import { countries, findCountry, findHighlight, coreBBox } from "./geo-countries";
import {
  ZoomGlobe, ZoomMap, fullGlobeView, lerpView, viewForBBox, windowForBBox,
  windowProject, type GeoPin,
} from "./geo-zoom";

// Block library wave 3: maps and globes (geo.ts is the geography). Same design
// laws as blocks.tsx-blocks4.tsx: zero layout shift (CountNumber for every
// animating number), values live in FIXED strips/panels beside or below the
// map — never floating on it where geography could collide with type — text
// enters translate+opacity only, backOut landings, long labels ellipsised.
// The landmass is theme ink at low alpha; highlights are the accent.

type B<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

const ELLIPSIS: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

const MAP_W = 940;
const MAP_H = Math.ceil(worldH(MAP_W));           // 84°N..58°S band
const XY = (lon: number, lat: number): [number, number] => worldXY(lon, lat, MAP_W);
const px = (ll: LonLat): [number, number] => XY(ll[0], ll[1]);
const f1 = (n: number) => +n.toFixed(1);

/** The flat world: every region filled in faint ink (fill-first so the
 *  Eurasia seam stays invisible; the whisper stroke reads as pen work). */
const Landmass: React.FC<{ c: BlockColors; draw: number }> = ({ c, draw }) => (
  <g opacity={clamp01(draw)}>
    {WORLD.map((r) =>
      r.polys.map((ring, k) => (
        <path key={`${r.name}${k}`} d={ringPath(ring, XY)} fill={a(c.ink, "1F")} stroke={a(c.ink, "26")} strokeWidth={1} />
      ))
    )}
  </g>
);

/** Region highlight that pulses in: fill eases up with a brief overshoot
 *  flash, outline draws with it. */
const RegionShape: React.FC<{ region: GeoRegion; pop: number; fill: string; stroke: string; strokeWidth?: number }> =
({ region, pop, fill, stroke, strokeWidth = 2 }) => {
  if (pop <= 0.01) return null;
  const flash = Math.max(0, 1 - Math.abs((clamp01(pop) - 0.75) / 0.25)) * 0.25;
  return (
    <g>
      {region.polys.map((ring, k) => (
        <path key={k} d={ringPath(ring, XY)} fill={fill} fillOpacity={clamp01(pop) * 0.75 + flash}
          stroke={stroke} strokeWidth={strokeWidth} strokeOpacity={clamp01(pop)} strokeLinejoin="round" />
      ))}
    </g>
  );
};

/** Great-circle route in map pixels, split where it crosses the date line. */
const arcSegs = (A: LonLat, Bb: LonLat, n = 72): [number, number][][] => {
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  let prevLon = A[0];
  for (let i = 0; i <= n; i++) {
    const ll = greatArc(A, Bb, i / n);
    if (Math.abs(ll[0] - prevLon) > 180 && cur.length) { segs.push(cur); cur = []; }
    prevLon = ll[0];
    cur.push(px(ll));
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
};

/** Reveal polylines point-by-point (with an interpolated tip) so multi-segment
 *  routes draw on smoothly. */
const partialPolys = (segs: [number, number][][], t: number): string[] => {
  const total = segs.reduce((s, g) => s + g.length - 1, 0);
  let budget = clamp01(t) * total;
  const out: string[] = [];
  for (const g of segs) {
    if (budget <= 0) break;
    const n = g.length - 1;
    if (budget >= n) { out.push(g.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ")); budget -= n; continue; }
    const k = Math.floor(budget), fr = budget - k;
    const pts = g.slice(0, k + 1).map((q) => `${f1(q[0])},${f1(q[1])}`);
    const Aa = g[k], Bb = g[k + 1];
    pts.push(`${f1(Aa[0] + (Bb[0] - Aa[0]) * fr)},${f1(Aa[1] + (Bb[1] - Aa[1]) * fr)}`);
    out.push(pts.join(" "));
    budget = 0;
  }
  return out;
};

/** Deterministic repulsion so nearby map badges never overlap each other;
 *  `bounds` = [x0, y0, x1, y1] the badges must stay inside. */
const spreadXY = (
  pts: [number, number][], min: number,
  bounds: [number, number, number, number] = [22, 20, MAP_W - 22, MAP_H - 22],
): [number, number][] => {
  const out = pts.map((q) => [...q] as [number, number]);
  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const dx = out[j][0] - out[i][0], dy = out[j][1] - out[i][1];
      const d = Math.hypot(dx, dy) || 0.001;
      if (d < min) {
        const push = (min - d) / 2, ux = dx / d || 1, uy = dy / d;
        out[i][0] -= ux * push; out[i][1] -= uy * push;
        out[j][0] += ux * push; out[j][1] += uy * push;
      }
    }
    for (const q of out) {
      q[0] = Math.min(bounds[2], Math.max(bounds[0], q[0]));
      q[1] = Math.min(bounds[3], Math.max(bounds[1], q[1]));
    }
  }
  return out;
};

// ------------------------------------------------------------ globe helpers

/** Split a lon/lat polyline into front-hemisphere pixel runs. */
const orthoRuns = (pts: LonLat[], R: number, cLon: number, cLat: number): [number, number][][] => {
  const runs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (const [lon, lat] of pts) {
    const q = orthographic(lon, lat, R, cLon, cLat);
    if (q.visible) cur.push([q.x, q.y]);
    else { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
};

const runStr = (run: [number, number][]) => run.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ");

/** Sphere + graticule + landmass, drawn around (0,0). Land is the real
 *  country-level dataset (Natural Earth 110m via geo-countries.ts) so every
 *  border reads on the globe; the flat map blocks keep the hand-drawn
 *  low-poly WORLD (a deliberate small-scale style, see Landmass above). */
const GlobeLand: React.FC<{ R: number; cLon: number; cLat: number; c: BlockColors; draw: number }> =
({ R, cLon, cLat, c, draw }) => {
  const grat: [number, number][][] = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const line: LonLat[] = [];
    for (let lat = -84; lat <= 84; lat += 6) line.push([lon, lat]);
    grat.push(...orthoRuns(line, R, cLon, cLat));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const line: LonLat[] = [];
    for (let lon = -180; lon <= 180; lon += 6) line.push([lon, lat]);
    grat.push(...orthoRuns(line, R, cLon, cLat));
  }
  return (
    <g opacity={clamp01(draw)}>
      <circle r={R} fill={a(c.ink, "0D")} stroke={a(c.ink, "40")} strokeWidth={2} />
      {grat.map((run, i) => <polyline key={i} points={runStr(run)} fill="none" stroke={a(c.ink, "17")} strokeWidth={1} />)}
      {countries("world").map((ct) =>
        ct.rings.map((ring, k) => {
          const vis = ring.map(([lon, lat]) => orthographic(lon, lat, R, cLon, cLat)).filter((q) => q.visible);
          if (vis.length < 3) return null;
          const runs = orthoRuns([...ring, ring[0]], R, cLon, cLat);
          return (
            <g key={`${ct.iso}${k}`}>
              <polygon points={vis.map((q) => `${f1(q.x)},${f1(q.y)}`).join(" ")} fill={a(c.ink, "1C")} />
              {runs.map((run, j) => <polyline key={j} points={runStr(run)} fill="none" stroke={a(c.ink, "4D")} strokeWidth={1.2} />)}
            </g>
          );
        })
      )}
    </g>
  );
};

/** A region highlighted on the globe (front hemisphere only). Works for a
 *  single country (few rings) or a whole continent of them (thinner stroke
 *  so internal borders read as texture, not noise). */
const GlobeRegion: React.FC<{ region: GeoRegion; R: number; cLon: number; cLat: number; c: BlockColors; pop: number }> =
({ region, R, cLon, cLat, c, pop }) => {
  if (pop <= 0.01) return null;
  const sw = region.polys.length > 6 ? 1.5 : 2.4;
  return (
    <g>
      {region.polys.map((ring, k) => {
        const vis = ring.map(([lon, lat]) => orthographic(lon, lat, R, cLon, cLat)).filter((q) => q.visible);
        if (vis.length < 3) return null;
        const runs = orthoRuns([...ring, ring[0]], R, cLon, cLat);
        return (
          <g key={k}>
            <polygon points={vis.map((q) => `${f1(q.x)},${f1(q.y)}`).join(" ")} fill={c.accent} fillOpacity={clamp01(pop) * 0.42} />
            {runs.map((run, j) => <polyline key={j} points={runStr(run)} fill="none" stroke={c.accent} strokeWidth={sw} strokeOpacity={clamp01(pop)} strokeLinejoin="round" />)}
          </g>
        );
      })}
    </g>
  );
};

// The legend tints, index-matched to worldmap/mapcompare highlight weights.
const REGION_FILL = (c: BlockColors) => [c.accent, a(c.ink, "8C"), a(c.ink, "4D")];

// ---------------------------------------------------------------- worldmap

/** Flat world with 1-3 named regions pulsing in; labels + counted values live
 *  in a fixed legend strip below the map (never on it).
 *  variant 0: legend columns · variant 1: legend rows. */
export const WorldMapBlock: React.FC<{ block: B<"worldmap">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const regions = block.regions.slice(0, 3);
  const fills = REGION_FILL(c);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {regions.map((rg, i) => {
          const region = findRegion(rg.name);
          const pop = backOut((p - 0.28 - i * 0.14) / 0.45);
          if (region) return <RegionShape key={i} region={region} pop={pop} fill={fills[i]} stroke={i === 0 ? c.accent : a(c.ink, "B3")} />;
          const at = findPlace(rg.name);
          if (!at || pop <= 0.01) return null;
          const [x, y] = px(at);
          return <circle key={i} cx={x} cy={y} r={20 * Math.min(1.1, pop)} fill={fills[i]} opacity={clamp01(pop) * 0.8} />;
        })}
      </svg>
      {block.variant === 1 ? (
        <div style={{ marginTop: 18 }}>
          {regions.map((rg, i) => {
            const e = easeOut((p - 0.4 - i * 0.12) / 0.4);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 190px", columnGap: 16, alignItems: "center", height: 54, opacity: clamp01(e), transform: `translateX(${(1 - e) * -22}px)`, borderBottom: i < regions.length - 1 ? `1px solid ${a(c.ink, "14")}` : "none" }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, background: fills[i] }} />
                <span style={{ fontFamily: V("font-ui"), fontWeight: i === 0 ? 700 : 600, fontSize: 26, color: i === 0 ? c.accent : c.ink, ...ELLIPSIS }}>{rg.label ?? rg.name}</span>
                <span style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 26, color: i === 0 ? c.accent : c.ink, whiteSpace: "nowrap" }}>
                  {rg.value != null ? <><CountNumber value={rg.value} p={easeOut((p - 0.4 - i * 0.12) / 0.55)} />{rg.suffix ?? ""}</> : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${regions.length}, 1fr)`, columnGap: 30, marginTop: 22 }}>
          {regions.map((rg, i) => {
            const e = easeOut((p - 0.4 - i * 0.12) / 0.4);
            return (
              <div key={i} style={{ minWidth: 0, opacity: clamp01(e), transform: `translateY(${(1 - e) * 14}px)` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: fills[i], flexShrink: 0 }} />
                  <span style={{ fontFamily: V("font-ui"), fontWeight: i === 0 ? 700 : 600, fontSize: 24, color: i === 0 ? c.accent : c.ink, ...ELLIPSIS, minWidth: 0 }}>{rg.label ?? rg.name}</span>
                </div>
                <div style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 32, color: i === 0 ? c.accent : c.ink, marginTop: 8, whiteSpace: "nowrap", minHeight: 40 }}>
                  {rg.value != null ? <><CountNumber value={rg.value} p={easeOut((p - 0.4 - i * 0.12) / 0.55)} />{rg.suffix ?? ""}</> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- globe

/** Orthographic globe with graticule, centred on a place/region, one region
 *  highlighted, one stat in a fixed side panel (Stat's language, smaller).
 *  variant 0: panel right of the globe · variant 1: panel left. */
export const Globe: React.FC<{ block: B<"globe">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const centre: LonLat = findPlace(block.center) ?? findCountry(block.center)?.centroid ?? [15, 30];
  // country first (real Natural Earth border), else a whole continent
  const region = findHighlight(block.highlight ?? block.center, "world");
  const R = 258;
  const cLat = Math.max(-58, Math.min(58, centre[1]));
  const pop = backOut((p - 0.3) / 0.45);
  const statP = (p - 0.38) / 0.55;
  const rule = easeOut((p - 0.5) / 0.45);
  const panel = (
    <div style={{ alignSelf: "center", textAlign: "left", minWidth: 0 }}>
      {block.value != null && (
        <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 104, lineHeight: 0.95, letterSpacing: "-.035em", color: c.accent, whiteSpace: "nowrap", opacity: clamp01(easeOut(statP)), transform: `translateY(${(1 - easeOut(statP)) * 18}px)` }}>
          {block.prefix ? <span style={{ fontSize: "0.45em", marginRight: 8 }}>{block.prefix}</span> : null}
          <CountNumber value={block.value} p={statP} plain={block.plain} />
          {block.suffix ? <span style={{ fontSize: "0.45em", marginLeft: 10 }}>{block.suffix}</span> : null}
        </div>
      )}
      <div style={{ width: 74, height: 4, background: c.accent, borderRadius: 2, margin: "26px 0 0", transform: `scaleX(${rule})`, transformOrigin: "left" }} />
      {block.label && <div style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 24, color: c.ink2, marginTop: 18, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{block.label}</div>}
    </div>
  );
  const globe = (
    <svg viewBox="0 0 560 560" width={560} height={560} style={{ display: "block" }}>
      <g transform="translate(280 280)">
        <GlobeLand R={R} cLon={centre[0]} cLat={cLat} c={c} draw={easeOut(p / 0.35)} />
        {region && <GlobeRegion region={region} R={R} cLon={centre[0]} cLat={cLat} c={c} pop={pop} />}
      </g>
    </svg>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ display: "grid", gridTemplateColumns: block.variant === 1 ? "380px 560px" : "560px 380px", columnGap: 40, alignItems: "center" }}>
        {block.variant === 1 ? <>{panel}{globe}</> : <>{globe}{panel}</>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- maproute

/** A→B great-arc route drawing on dashed; endpoint labels sit in a fixed
 *  strip under the map (hollow dot = from, accent dot = to), distance counted
 *  below. variant 0: distance strip · variant 1: distance in the header. */
export const MapRoute: React.FC<{ block: B<"maproute">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const A = findPlace(block.from) ?? [0, 0];
  const Bb = findPlace(block.to) ?? [30, 30];
  const segs = React.useMemo(() => arcSegs(A, Bb), [A[0], A[1], Bb[0], Bb[1]]);
  const draw = easeOut((p - 0.3) / 0.5);
  const [ax, ay] = px(A), [bx, by] = px(Bb);
  const value = block.value ?? Math.round(distanceKm(A, Bb));
  const unit = block.unit ?? "km";
  const readout = (
    <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color: c.accent, whiteSpace: "nowrap" }}>
      <CountNumber value={value} p={easeOut((p - 0.35) / 0.55)} /> {unit}
    </span>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} right={block.variant === 1 ? readout : undefined} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {partialPolys(segs, draw).map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke={c.accent} strokeWidth={4} strokeLinecap="round" strokeDasharray="2 12" />
        ))}
        <circle cx={ax} cy={ay} r={9} fill={V("paper")} stroke={c.ink} strokeWidth={3.5} opacity={clamp01((p - 0.22) * 4)} />
        <circle cx={bx} cy={by} r={10 * Math.min(1.15, backOut((p - 0.72) / 0.25))} fill={c.accent} opacity={draw >= 0.99 ? 1 : 0} />
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", columnGap: 12, alignItems: "center", height: 56, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end", opacity: clamp01(easeOut((p - 0.25) / 0.4)), minWidth: 0 }}>
          <span style={{ width: 15, height: 15, borderRadius: "50%", boxSizing: "border-box", border: `3.5px solid ${c.ink}`, flexShrink: 0 }} />
          <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 28, color: c.ink, ...ELLIPSIS }}>{block.fromLabel ?? block.from}</span>
        </div>
        <div style={{ textAlign: "center", fontFamily: V("font-display"), fontSize: 34, color: c.accent, opacity: clamp01(easeOut((p - 0.45) / 0.4)) }}>→</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-start", opacity: clamp01(easeOut((p - 0.6) / 0.4)), minWidth: 0 }}>
          <span style={{ width: 15, height: 15, borderRadius: "50%", background: c.accent, flexShrink: 0 }} />
          <span style={{ fontFamily: V("font-ui"), fontWeight: 700, fontSize: 28, color: c.accent, ...ELLIPSIS }}>{block.toLabel ?? block.to}</span>
        </div>
      </div>
      {block.variant !== 1 && (
        <div style={{ textAlign: "center", marginTop: 8, opacity: clamp01(easeOut((p - 0.55) / 0.4)) }}>
          <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 42, color: c.accent, whiteSpace: "nowrap" }}>
            <CountNumber value={value} p={easeOut((p - 0.35) / 0.55)} />
          </span>
          <span style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 22, color: c.ink2, marginLeft: 12 }}>{unit}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- mappins

/** 2-5 numbered pins popping in sequence; every pin's label lives in a
 *  numbered list below the map (numbers on pins ↔ list rows), so map labels
 *  can never collide. variant 0: one list column · variant 1: two columns. */
export const MapPins: React.FC<{ block: B<"mappins">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const pins = block.pins.slice(0, 5).map((pin) => ({ ...pin, at: findPlace(pin.place) })).filter((pin) => pin.at);
  const raw = pins.map((pin) => px(pin.at as LonLat));
  const pos = React.useMemo(() => spreadXY(raw, 42), [JSON.stringify(raw)]);
  const twoCol = block.variant === 1;
  const hasValues = pins.some((pin) => pin.value != null);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {pins.map((pin, i) => {
          const pop = backOut((p - 0.26 - i * 0.12) / 0.35);
          if (pop <= 0.02) return null;
          const [x, y] = pos[i];
          return (
            <g key={i} transform={`translate(${f1(x)} ${f1(y)})`} opacity={clamp01(pop * 1.5)}>
              <circle r={17 * Math.min(1.12, pop)} fill={c.accent} stroke={V("paper")} strokeWidth={2.5} />
              <text y={7.5} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={21} fill={V("accent-ink")}>{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: twoCol ? "1fr 1fr" : "1fr", columnGap: 34, marginTop: 16 }}>
        {pins.map((pin, i) => {
          const e = easeOut((p - 0.3 - i * 0.12) / 0.4);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: hasValues ? "34px 1fr 150px" : "34px 1fr", columnGap: 14, alignItems: "center", height: 50, opacity: clamp01(e), transform: `translateX(${(1 - e) * -20}px)` }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: c.accent, color: V("accent-ink"), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 18 }}>{i + 1}</span>
              <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 26, color: c.ink, ...ELLIPSIS }}>{pin.label ?? pin.place}</span>
              {hasValues && (
                <span style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: c.accent, whiteSpace: "nowrap" }}>
                  {pin.value != null ? <><CountNumber value={pin.value} p={easeOut((p - 0.3 - i * 0.12) / 0.5)} />{pin.suffix ?? ""}</> : null}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- mapspread

/** Radial spread from an origin: expanding rings, reached points lighting
 *  accent as the front passes them, a fixed readout strip.
 *  variant 0: readout below the map · variant 1: readout in the header. */
export const MapSpread: React.FC<{ block: B<"mapspread">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const origin = findPlace(block.origin) ?? [0, 20];
  const [ox, oy] = px(origin);
  const pts = block.points.map((name) => findPlace(name)).filter((q): q is LonLat => !!q).map(px);
  const maxR = Math.max(140, ...pts.map(([x, y]) => Math.hypot(x - ox, y - oy))) * 1.12;
  const readout = (
    <span style={{ whiteSpace: "nowrap" }}>
      {block.value != null && (
        <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: block.variant === 1 ? 27 : 42, color: c.accent }}>
          <CountNumber value={block.value} p={easeOut((p - 0.35) / 0.55)} />{block.suffix ?? ""}
        </span>
      )}
      <span style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 22, color: c.ink2, marginLeft: block.value != null ? 14 : 0 }}>{block.label}</span>
    </span>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} right={block.variant === 1 ? readout : undefined} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {[0, 1, 2].map((i) => {
          const t = easeOut((p - 0.2 - i * 0.16) / 0.62);
          if (t <= 0.01 || t >= 1) return null;
          return <circle key={i} cx={ox} cy={oy} r={t * maxR} fill="none" stroke={c.accent} strokeWidth={2.5} opacity={(1 - t) * 0.55} />;
        })}
        {pts.map(([x, y], i) => {
          const tHit = 0.24 + 0.5 * (Math.hypot(x - ox, y - oy) / maxR);
          const hit = backOut((p - tHit) / 0.3);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={4.5} fill={a(c.ink, "40")} opacity={clamp01(easeOut((p - 0.15) / 0.3))} />
              {hit > 0.02 && <circle cx={x} cy={y} r={7 * Math.min(1.15, hit)} fill={c.accent} opacity={clamp01(hit * 1.4)} />}
            </g>
          );
        })}
        <circle cx={ox} cy={oy} r={9} fill={c.accent} opacity={clamp01(easeOut((p - 0.12) / 0.3))} />
        <circle cx={ox} cy={oy} r={17} fill="none" stroke={c.accent} strokeWidth={2} opacity={clamp01(easeOut((p - 0.16) / 0.3)) * 0.7} />
      </svg>
      {block.variant !== 1 && (
        <div style={{ textAlign: "center", marginTop: 18, opacity: clamp01(easeOut((p - 0.4) / 0.4)) }}>{readout}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- mapdots

/** Dot density: N seeded dots scattered inside a region, popping in — one dot
 *  field, one counted readout in a fixed strip below.
 *  variant 0: centred readout · variant 1: value left / label right baseline. */
export const MapDots: React.FC<{ block: B<"mapdots">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const region = findRegion(block.region) ?? WORLD[3];
  const n = Math.min(140, Math.max(1, block.count));
  const dots = React.useMemo(() => scatterInRegion(region, n, block.seed ?? 7).map(px), [region.name, n, block.seed]);
  const value = block.value ?? block.count;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {region.polys.map((ring, k) => (
          <path key={k} d={ringPath(ring, XY)} fill="none" stroke={a(c.accent, "8C")} strokeWidth={1.8}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(easeOut((p - 0.12) / 0.45))} strokeLinejoin="round" />
        ))}
        {dots.map(([x, y], i) => {
          const s = backOut((p - 0.24 - i * (0.5 / dots.length)) / 0.25);
          if (s <= 0.02) return null;
          return <circle key={i} cx={x} cy={y} r={2.9 * Math.min(1.1, s)} fill={c.accent} opacity={clamp01(s * 1.5)} />;
        })}
      </svg>
      {block.variant === 1 ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, borderTop: `1px solid ${a(c.ink, "2E")}`, paddingTop: 16, opacity: clamp01(easeOut((p - 0.4) / 0.4)) }}>
          <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 66, lineHeight: 1, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
            <CountNumber value={value} p={easeOut((p - 0.3) / 0.6)} />{block.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 8 }}>{block.suffix}</span> : null}
          </span>
          <span style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 24, color: c.ink2, ...ELLIPSIS, maxWidth: 480 }}>{block.label}</span>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 14, opacity: clamp01(easeOut((p - 0.4) / 0.4)) }}>
          <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 84, lineHeight: 1, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
            <CountNumber value={value} p={easeOut((p - 0.3) / 0.6)} />{block.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 8 }}>{block.suffix}</span> : null}
          </div>
          <div style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 24, color: c.ink2, marginTop: 12 }}>{block.label}</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- mapcompare

/** Two regions highlighted in different weights, values head-to-head in a
 *  fixed versus panel below (compare's language, geographic).
 *  variant 0: columns with a divider · variant 1: stacked rows. */
export const MapCompare: React.FC<{ block: B<"mapcompare">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const acc = block.accent ?? 0;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {block.items.map((it, i) => {
          const region = findRegion(it.region);
          if (!region) return null;
          const hot = acc === i;
          return <RegionShape key={i} region={region} pop={backOut((p - 0.26 - i * 0.16) / 0.45)}
            fill={hot ? c.accent : a(c.ink, "73")} stroke={hot ? c.accent : a(c.ink, "B3")} strokeWidth={hot ? 2.4 : 1.6} />;
        })}
      </svg>
      {block.variant === 1 ? (
        <div style={{ marginTop: 16 }}>
          {block.items.map((it, i) => {
            const hot = acc === i;
            const e = easeOut((p - 0.38 - i * 0.14) / 0.4);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 250px", columnGap: 16, alignItems: "center", height: 64, opacity: clamp01(e), transform: `translateX(${(1 - e) * -22}px)`, borderBottom: i === 0 ? `1px solid ${a(c.ink, "14")}` : "none" }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, background: hot ? c.accent : a(c.ink, "73") }} />
                <span style={{ fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 27, color: hot ? c.accent : c.ink, ...ELLIPSIS }}>{it.label}</span>
                <span style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 30, color: hot ? c.accent : c.ink, whiteSpace: "nowrap" }}>
                  {it.prefix ?? ""}<CountNumber value={it.value} p={easeOut((p - 0.4 - i * 0.14) / 0.55)} plain={it.plain} />{it.suffix ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2px 1fr", alignItems: "center", columnGap: 40, marginTop: 24 }}>
          {block.items.map((it, i) => {
            const hot = acc === i;
            const delay = 0.36 + i * 0.14;
            return (
              <div key={i} style={{ textAlign: "center", order: i === 0 ? 0 : 2, minWidth: 0, opacity: clamp01(easeOut((p - delay) / 0.4)) }}>
                <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 78, lineHeight: 0.95, letterSpacing: "-.03em", color: hot ? c.accent : c.ink, whiteSpace: "nowrap" }}>
                  {it.prefix ? <span style={{ fontSize: "0.5em", marginRight: 6 }}>{it.prefix}</span> : null}
                  <CountNumber value={it.value} p={(p - delay) / 0.55} plain={it.plain} />
                  {it.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 8 }}>{it.suffix}</span> : null}
                </div>
                <div style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 22, color: hot ? c.accent : c.ink2, marginTop: 14, ...ELLIPSIS }}>{it.label}</div>
              </div>
            );
          })}
          <div style={{ order: 1, height: 120, width: 2, background: a(c.ink, "30"), transform: `scaleY(${easeOut((p - 0.4) / 0.4)})` }} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- globespin

/** Rotating globe: the view drifts from the first place toward the last while
 *  the route (or chain of points) reveals as it comes around; readout stays
 *  in a fixed strip below. variant 0: route arcs · variant 1: points pulse. */
export const GlobeSpin: React.FC<{ block: B<"globespin">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const stops = block.places.map((name) => findPlace(name)).filter((q): q is LonLat => !!q);
  const n = stops.length;
  if (n === 0) return null;
  const R = 252;
  const drift = interpolate(clamp01(p), [0.04, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  // unwrap the longitudes so the camera always takes the short way round
  const lons = stops.map((s) => s[0]);
  for (let i = 1; i < lons.length; i++) {
    while (lons[i] - lons[i - 1] > 180) lons[i] -= 360;
    while (lons[i] - lons[i - 1] < -180) lons[i] += 360;
  }
  const cLon = interpolate(drift, [0, 1], [lons[0] + 30, lons[n - 1]]);
  const cLat = Math.max(-45, Math.min(45, interpolate(drift, [0, 1], [stops[0][1], stops[n - 1][1]])));
  const reveal = (i: number) => easeOut((p - 0.16 - i * (0.55 / Math.max(1, n - 1))) / 0.4);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <svg viewBox="0 0 940 548" width={940} height={548} style={{ display: "block" }}>
        <g transform="translate(470 274)">
          <GlobeLand R={R} cLon={cLon} cLat={cLat} c={c} draw={easeOut(p / 0.3)} />
          {block.variant !== 1 && stops.slice(0, -1).map((s, i) => {
            const t = reveal(i + 1);
            if (t <= 0.01) return null;
            const arc: LonLat[] = [];
            const steps = Math.max(2, Math.round(40 * clamp01(t)));
            for (let k = 0; k <= steps; k++) arc.push(greatArc(s, stops[i + 1], (k / steps) * clamp01(t)));
            return orthoRuns(arc, R, cLon, cLat).map((run, j) => (
              <polyline key={`${i}-${j}`} points={runStr(run)} fill="none" stroke={c.accent} strokeWidth={4} strokeLinecap="round" strokeDasharray="1 10" />
            ));
          })}
          {stops.map((s, i) => {
            const q = orthographic(s[0], s[1], R, cLon, cLat);
            if (!q.visible) return null;
            const pop = backOut((p - 0.14 - i * (0.55 / Math.max(1, n - 1))) / 0.32);
            if (pop <= 0.02) return null;
            const last = i === n - 1;
            return (
              <g key={i} transform={`translate(${f1(q.x)} ${f1(q.y)})`} opacity={clamp01(pop * 1.4)}>
                {block.variant === 1 && <circle r={14 + 10 * clamp01(pop)} fill="none" stroke={c.accent} strokeWidth={2} opacity={(1 - clamp01(pop)) * 0.8} />}
                <circle r={(last ? 10 : 7) * Math.min(1.15, pop)} fill={last ? c.accent : V("paper")} stroke={last ? V("paper") : c.accent} strokeWidth={2.5} />
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ textAlign: "center", marginTop: 14, opacity: clamp01(easeOut((p - 0.35) / 0.4)) }}>
        {block.value != null && (
          <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 40, color: c.accent, whiteSpace: "nowrap" }}>
            <CountNumber value={block.value} p={easeOut((p - 0.35) / 0.55)} />{block.suffix ?? ""}
          </span>
        )}
        {block.label && <span style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 22, color: c.ink2, marginLeft: block.value != null ? 14 : 0 }}>{block.label}</span>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- mapzoom

/** World with an inset zoom: a rectangle draws around the region, dashed
 *  connectors drop to a magnified panel with numbered pins; pin labels live in
 *  a fixed list column. The region can be a continent OR any country (real
 *  Natural Earth borders); the inset renders the 50m zoom tier via <ZoomMap>.
 *  variant 0: list right · variant 1: list left. */
export const MapZoom: React.FC<{ block: B<"mapzoom">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const country = findCountry(block.region, "world");
  const region = country ? null : findRegion(block.region);
  const pins = (block.pins ?? []).slice(0, 4)
    .map((pin) => ({ ...pin, at: findPlace(pin.place) ?? findCountry(pin.place)?.centroid ?? null }))
    .filter((pin) => pin.at);
  // world strip (760 wide, centred) + inset row below
  const W2 = 760, H2 = Math.ceil(worldH(W2)), OX = (940 - W2) / 2;
  const xy2 = (lon: number, lat: number): [number, number] => { const [x, y] = worldXY(lon, lat, W2); return [x + OX, y]; };
  // zoom bounds: the country's/region's bbox (or the pins'), padded
  const clampLon = (v: number) => Math.max(-179.9, Math.min(179.9, v));
  const core = country ? coreBBox(country) : null;
  const bb: [number, number, number, number] = core
    ? [clampLon(core[0]), core[1], clampLon(core[2]), core[3]]
    : region ? regionBounds(region) : [-10, 30, 30, 60];
  const pinBB = pins.length
    ? pins.reduce((acc, pin) => {
        const q = pin.at as LonLat;
        return [Math.min(acc[0], q[0]), Math.min(acc[1], q[1]), Math.max(acc[2], q[0]), Math.max(acc[3], q[1])] as [number, number, number, number];
      }, [999, 999, -999, -999] as [number, number, number, number])
    : null;
  const box: [number, number, number, number] = country || region ? bb : (pinBB ?? bb);
  const pad = Math.max(country ? 1.2 : 2, (box[2] - box[0]) * 0.08);
  const [lo0, la0, lo1, la1] = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
  const [rx0, ry1] = xy2(lo0, la0), [rx1, ry0] = xy2(lo1, la1);
  // inset panel geometry (in the same 940-wide flow, below the world)
  const IW = 540, IH = 296, GAPY = 22;
  const listLeft = block.variant === 1;
  const ix = listLeft ? 940 - IW : 0, iy = H2 + GAPY;
  // the inset is a ZoomMap window onto the padded box, at full (50m) detail
  const win = windowForBBox([lo0, la0, lo1, la1], IW, IH, 0.94);
  const winProj = windowProject(win);
  const zoom = (lon: number, lat: number): [number, number] => {
    const [x, y] = winProj(lon, lat);
    return [x + ix + IW / 2, y + iy + IH / 2];
  };
  const rectDraw = easeOut((p - 0.18) / 0.35);
  const conn = easeOut((p - 0.4) / 0.35);
  const inset = easeOut((p - 0.48) / 0.4);
  const rawPins = pins.map((pin) => zoom((pin.at as LonLat)[0], (pin.at as LonLat)[1]));
  const pinPos = React.useMemo(
    () => spreadXY(rawPins, 38, [ix + 24, iy + 22, ix + IW - 24, iy + IH - 22]),
    [JSON.stringify(rawPins), ix, iy],
  );
  const totalH = H2 + GAPY + IH;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 940, height: totalH, margin: "0 auto" }}>
        <svg viewBox={`0 0 940 ${totalH}`} width={940} height={totalH} style={{ position: "absolute", inset: 0 }}>
          <g opacity={clamp01(easeOut(p / 0.3))}>
            {WORLD.map((r) =>
              r.polys.map((ring, k) => (
                <path key={`${r.name}${k}`} d={ringPath(ring, xy2)} fill={a(c.ink, "1F")} stroke={a(c.ink, "26")} strokeWidth={1} />
              ))
            )}
          </g>
          <rect x={rx0} y={ry0} width={rx1 - rx0} height={ry1 - ry0} fill={a(c.accent, "17")} stroke={c.accent} strokeWidth={2.5}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(rectDraw)} opacity={rectDraw > 0.01 ? 1 : 0} rx={4} />
          {conn > 0.01 && (
            <g stroke={a(c.accent, "8C")} strokeWidth={1.8} strokeDasharray="4 7">
              <line x1={rx0} y1={ry1} x2={rx0 + (ix - rx0) * conn} y2={ry1 + (iy - ry1) * conn} />
              <line x1={rx1} y1={ry1} x2={rx1 + (ix + IW - rx1) * conn} y2={ry1 + (iy - ry1) * conn} />
            </g>
          )}
          <g opacity={clamp01(inset)}>
            <rect x={ix} y={iy} width={IW} height={IH} rx={10} fill={a(c.ink, "0A")} stroke={a(c.ink, "33")} strokeWidth={1.5} />
            <g transform={`translate(${ix + IW / 2} ${iy + IH / 2})`}>
              <ZoomMap w={IW} h={IH} c={c} window={win} draw={1} detail={1}
                highlight={country ? block.region : undefined}
                highlightFill={easeOut((p - 0.58) / 0.4) * 0.6}
                highlightBorder={easeOut((p - 0.52) / 0.45)} />
            </g>
            {pins.map((pin, i) => {
              // staggers finish by p=1 so the settled inset holds fully lit
              const pop = backOut((p - 0.5 - i * 0.07) / 0.28);
              if (pop <= 0.02) return null;
              const [x, y] = pinPos[i];
              return (
                <g key={i} transform={`translate(${f1(x)} ${f1(y)})`} opacity={clamp01(pop * 1.5)}>
                  <circle r={15 * Math.min(1.12, pop)} fill={c.accent} stroke={V("paper")} strokeWidth={2.5} />
                  <text y={6.5} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={18} fill={V("accent-ink")}>{i + 1}</text>
                </g>
              );
            })}
          </g>
        </svg>
        {/* pin labels in a fixed list column beside the inset — never on it */}
        <div style={{ position: "absolute", left: listLeft ? 0 : IW + 34, width: 940 - IW - 34, top: iy + 10 }}>
          {pins.map((pin, i) => {
            const e = easeOut((p - 0.52 - i * 0.07) / 0.27);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr", columnGap: 13, alignItems: "center", height: 48, opacity: clamp01(e), transform: `translateX(${(1 - e) * (listLeft ? -20 : 20)}px)` }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: c.accent, color: V("accent-ink"), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 17 }}>{i + 1}</span>
                <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 24, color: c.ink, ...ELLIPSIS }}>{pin.label ?? pin.place}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- mapflow

/** 2-4 flow arcs from one origin, stroke width ∝ value; destination labels +
 *  counted values in fixed legend rows below.
 *  variant 0: lifted curves · variant 1: straight spokes. */
export const MapFlow: React.FC<{ block: B<"mapflow">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const origin = findPlace(block.origin) ?? [0, 20];
  const [ox, oy] = px(origin);
  const flows = block.flows.slice(0, 4).map((fl) => ({ ...fl, at: findPlace(fl.place) })).filter((fl) => fl.at);
  const maxV = Math.max(...flows.map((fl) => fl.value), 1);
  const wOf = (v: number) => 3.5 + 9 * (v / maxV);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} style={{ display: "block", margin: "0 auto" }}>
        <Landmass c={c} draw={easeOut(p / 0.3)} />
        {flows.map((fl, i) => {
          const [dx, dy] = px(fl.at as LonLat);
          const draw = easeOut((p - 0.24 - i * 0.1) / 0.5);
          if (draw <= 0.01) return null;
          const d = block.variant === 1
            ? `M ${f1(ox)} ${f1(oy)} L ${f1(dx)} ${f1(dy)}`
            : (() => {
                const mx = (ox + dx) / 2, my = (oy + dy) / 2;
                const len = Math.hypot(dx - ox, dy - oy) || 1;
                const nx = -(dy - oy) / len, ny = (dx - ox) / len;   // left normal
                const lift = Math.min(90, len * 0.22) * (ny < 0 ? 1 : -1); // bow upward
                return `M ${f1(ox)} ${f1(oy)} Q ${f1(mx + nx * lift)} ${f1(my + ny * lift)} ${f1(dx)} ${f1(dy)}`;
              })();
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={c.accent} strokeWidth={wOf(fl.value)} strokeLinecap="round" opacity={0.78}
                pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(draw)} />
              <circle cx={dx} cy={dy} r={6.5 + 2.5 * (fl.value / maxV)} fill={c.accent} opacity={draw >= 0.97 ? 1 : 0} />
            </g>
          );
        })}
        <circle cx={ox} cy={oy} r={9} fill={V("paper")} stroke={c.ink} strokeWidth={3.5} opacity={clamp01(easeOut((p - 0.16) / 0.3))} />
      </svg>
      <div style={{ marginTop: 14 }}>
        {/* origin gets legend row zero (hollow dot = the map's origin mark) */}
        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", columnGap: 16, alignItems: "center", height: 44, opacity: clamp01(easeOut((p - 0.24) / 0.4)), borderBottom: `1px solid ${a(c.ink, "14")}` }}>
          <span style={{ justifySelf: "center", width: 15, height: 15, borderRadius: "50%", boxSizing: "border-box", border: `3.5px solid ${c.ink}` }} />
          <span style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 19, color: c.ink2, ...ELLIPSIS }}>from {block.originLabel ?? block.origin}</span>
        </div>
        {flows.map((fl, i) => {
          const e = easeOut((p - 0.34 - i * 0.1) / 0.4);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr 190px", columnGap: 16, alignItems: "center", height: 48, opacity: clamp01(e), transform: `translateX(${(1 - e) * -20}px)` }}>
              <span style={{ width: 26, height: Math.max(5, Math.round(wOf(fl.value))), borderRadius: 4, background: c.accent }} />
              <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 25, color: c.ink, ...ELLIPSIS }}>{fl.label ?? fl.place}</span>
              <span style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: c.accent, whiteSpace: "nowrap" }}>
                <CountNumber value={fl.value} p={easeOut((p - 0.34 - i * 0.1) / 0.5)} />{fl.suffix ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- globezoom

/** The hero camera move: the full globe eases its rotation AND projection
 *  radius to land on a target, real country borders crossfading from the
 *  110m world tier to the 50m zoom tier on the way in; the target's border
 *  draws on. 1-2 stats + pin labels live in a FIXED panel below the viewport
 *  (never on the map). StoryDoc gives this block a slower p ramp so the
 *  camera has room to travel. variant 0: zoom-to-country (`target`) ·
 *  variant 1: zoom-to-bbox of `places` with numbered pins. */
export const GlobeZoom: React.FC<{ block: B<"globezoom">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const W = 940, H = 600;
  const v1 = block.variant === 1;
  const target = block.target ?? block.places?.[0] ?? "italy";
  const country = findCountry(target, "world");
  // pins: explicit, else (v1) derived from the places themselves
  const resolved = (block.pins?.length ? block.pins : v1 ? (block.places ?? []).map((pl): { place: string; label?: string } => ({ place: pl })) : [])
    .slice(0, 4)
    .map((pin) => ({ ...pin, at: findPlace(pin.place) ?? findCountry(pin.place)?.centroid ?? null }))
    .filter((pin): pin is typeof pin & { at: LonLat } => !!pin.at);
  // where the camera lands: the country's bbox, or the pins' padded bbox
  const pinBB = resolved.length
    ? resolved.reduce(
        (acc, pin) => [Math.min(acc[0], pin.at[0]), Math.min(acc[1], pin.at[1]), Math.max(acc[2], pin.at[0]), Math.max(acc[3], pin.at[1])] as [number, number, number, number],
        [999, 999, -999, -999] as [number, number, number, number])
    : null;
  const box: [number, number, number, number] = v1 && pinBB
    ? (() => { const padL = Math.max(3, (pinBB[2] - pinBB[0]) * 0.3), padB = Math.max(2.4, (pinBB[3] - pinBB[1]) * 0.3);
        return [pinBB[0] - padL, pinBB[1] - padB, pinBB[2] + padL, pinBB[3] + padB]; })()
    : country ? coreBBox(country) : [6, 36, 19, 47.5];
  const endView = viewForBBox(box, W, H, v1 ? 0.6 : 0.66);
  const startView = fullGlobeView(W, H, endView.lon + 38, endView.lat * 0.35);
  // camera: full globe -> target (Easing.inOut), detail crossfades on the way
  const camT = interpolate(clamp01(p), [0.12, 0.64], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });
  const view = lerpView(startView, endView, camT);
  const detail = clamp01((camT - 0.55) / 0.45);
  // every window below finishes by p=1 — the block settles fully and holds
  const hiBorder = easeOut((p - 0.56) / 0.28);
  const hiFill = easeOut((p - 0.66) / 0.28);
  const pinData: GeoPin[] = resolved.map((pin, i) => ({ at: pin.at, n: i + 1, pop: backOut((p - 0.58 - i * 0.06) / 0.24) }));
  const stats = (block.stats ?? []).slice(0, 2);
  const listRows = v1 ? resolved : [];
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
        <rect x={0.75} y={0.75} width={W - 1.5} height={H - 1.5} rx={12} fill={a(c.ink, "05")} stroke={a(c.ink, "26")} strokeWidth={1.5} />
        <g transform={`translate(${W / 2} ${H / 2})`}>
          <ZoomGlobe w={W - 3} h={H - 3} c={c} view={view} draw={easeOut(p / 0.22)} detail={detail}
            highlight={v1 ? undefined : target} highlightFill={hiFill} highlightBorder={hiBorder}
            pins={pinData.length ? pinData : undefined} />
        </g>
      </svg>
      {/* fixed panel: reserved from frame one so the settling map never shifts it */}
      <div style={{ display: "grid", gridTemplateColumns: listRows.length ? "1fr 330px" : "1fr", columnGap: 34, height: 150, marginTop: 20, borderTop: `1px solid ${a(c.ink, "2E")}`, paddingTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, stats.length)}, 1fr)`, columnGap: 30, alignItems: "start" }}>
          {stats.map((st, i) => {
            const e = easeOut((p - 0.56 - i * 0.1) / 0.3);
            return (
              <div key={i} style={{ minWidth: 0, opacity: clamp01(e), transform: `translateY(${(1 - e) * 16}px)` }}>
                <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 68, lineHeight: 0.95, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
                  {st.prefix ? <span style={{ fontSize: "0.45em", marginRight: 6 }}>{st.prefix}</span> : null}
                  <CountNumber value={st.value} p={(p - 0.56 - i * 0.1) / 0.34} plain={st.plain} />
                  {st.suffix ? <span style={{ fontSize: "0.45em", marginLeft: 8 }}>{st.suffix}</span> : null}
                </div>
                <div style={{ ...MONO_LABEL, fontFamily: V("font-mono"), fontSize: 20, color: c.ink2, marginTop: 12, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{st.label}</div>
              </div>
            );
          })}
        </div>
        {listRows.length > 0 && (
          <div>
            {listRows.map((pin, i) => {
              const e = easeOut((p - 0.6 - i * 0.06) / 0.22);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "30px 1fr", columnGap: 12, alignItems: "center", height: 33, opacity: clamp01(e), transform: `translateX(${(1 - e) * 18}px)` }}>
                  <span style={{ width: 25, height: 25, borderRadius: "50%", background: c.accent, color: V("accent-ink"), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 15 }}>{i + 1}</span>
                  <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 20, color: c.ink, ...ELLIPSIS }}>{pin.label ?? pin.place}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
