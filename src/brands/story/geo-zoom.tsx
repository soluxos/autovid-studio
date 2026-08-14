import React from "react";
import { orthographic, distanceKm, type LonLat, type GeoRegion } from "./geo";
import { countries, usStates, findHighlight, type GeoCountry, type GeoTier } from "./geo-countries";

// The zoomable geo camera + the two windowed renderers built on the
// country-level dataset (geo-countries.ts):
//   <ZoomGlobe>  orthographic globe whose rotation AND projection radius
//                animate — full earth easing into one country/region, the
//                110m world tier crossfading to the 50m zoom tier on the way
//                in (graticule fades down as detail rises).
//   <ZoomMap>    the flat equivalent: an equirectangular window (locally
//                cos-lat corrected) animating from the whole world to a bbox.
// Both render a <g> clipped to their w×h viewport so blocks can compose them
// inside their own <svg> (globezoom hero block, the mapzoom inset). All the
// design laws apply upstream: these draw geography only — text never enters
// the windowed viewport, values live in the blocks' fixed panels.

type Colors = { ink: string; ink2: string; accent: string };
const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const f1 = (n: number) => +n.toFixed(1);
const V = (n: string) => `var(--${n})`;
const a = (hex: string, aa: string) => `${hex}${aa}`;

/** Angular distance between two lon/lats, radians. */
const ang = (A: LonLat, B: LonLat) => distanceKm(A, B) / 6371;

// ------------------------------------------------------------------ camera

/** A globe camera: which point faces us, and the projection radius in px. */
export interface GeoView { lon: number; lat: number; scale: number }

/** The resting full-earth view for a w×h viewport, centred near a place. */
export const fullGlobeView = (w: number, h: number, lon: number, lat: number): GeoView =>
  ({ lon, lat: Math.max(-55, Math.min(55, lat)), scale: Math.min(w, h) * 0.46 });

/** Camera in-between: shortest-way longitudes, log-space scale (a zoom that
 *  reads constant-speed). Ease t OUTSIDE (Easing.inOut) — this is linear. */
export const lerpView = (A: GeoView, B: GeoView, t: number): GeoView => {
  let dl = B.lon - A.lon;
  while (dl > 180) dl -= 360;
  while (dl < -180) dl += 360;
  return {
    lon: A.lon + dl * t,
    lat: A.lat + (B.lat - A.lat) * t,
    scale: Math.exp(Math.log(A.scale) + (Math.log(B.scale) - Math.log(A.scale)) * t),
  };
};

/** The settled zoom view framing a (dateline-unwrapped) lon/lat bbox inside a
 *  w×h viewport. `fill` = how much of the short side the target spans. */
export const viewForBBox = (
  bbox: [number, number, number, number], w: number, h: number, fill = 0.62,
): GeoView => {
  const c: LonLat = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
  // angular radius of the box: corners + edge midpoints (lat curvature)
  const probes: LonLat[] = [
    [bbox[0], bbox[1]], [bbox[0], bbox[3]], [bbox[2], bbox[1]], [bbox[2], bbox[3]],
    [c[0], bbox[1]], [c[0], bbox[3]], [bbox[0], c[1]], [bbox[2], c[1]],
  ];
  const theta = Math.min(1.25, Math.max(0.02, ...probes.map((p) => ang(c, p))));
  const scale = (fill * Math.min(w, h)) / 2 / Math.sin(theta);
  return {
    lon: ((c[0] + 540) % 360) - 180,
    lat: Math.max(-75, Math.min(75, c[1])),
    scale: Math.min(9000, Math.max(Math.min(w, h) * 0.46, scale)),
  };
};

// ------------------------------------------------------- ortho draw helpers

/** Split a lon/lat polyline into front-hemisphere pixel runs. */
const orthoRuns = (pts: LonLat[], view: GeoView): [number, number][][] => {
  const runs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (const [lon, lat] of pts) {
    const q = orthographic(lon, lat, view.scale, view.lon, view.lat);
    if (q.visible) cur.push([q.x, q.y]);
    else { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
};
const runStr = (run: [number, number][]) => run.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ");

/** Is any part of this country's bbox inside the viewport's cap of the globe? */
const globeVisible = (ct: GeoCountry, view: GeoView, halfDiag: number): boolean => {
  const cap = view.scale <= halfDiag ? Math.PI : Math.asin(halfDiag / view.scale) + 0.12;
  if (cap >= Math.PI) return true;
  const bc: LonLat = [(ct.bbox[0] + ct.bbox[2]) / 2, (ct.bbox[1] + ct.bbox[3]) / 2];
  const r = ang(bc, [ct.bbox[0], ct.bbox[1]]);
  return ang([view.lon, view.lat], bc) <= cap + r;
};

const TierLand: React.FC<{ tier: GeoTier; view: GeoView; c: Colors; alpha: number; halfDiag: number }> =
({ tier, view, c, alpha, halfDiag }) => {
  if (alpha <= 0.01) return null;
  const stroke = tier === "world" ? 1.4 : 1.1;
  return (
    <g opacity={alpha}>
      {countries(tier).map((ct) => {
        if (!globeVisible(ct, view, halfDiag)) return null;
        return ct.rings.map((ring, k) => {
          const vis = ring.map(([lon, lat]) => orthographic(lon, lat, view.scale, view.lon, view.lat)).filter((q) => q.visible);
          if (vis.length < 3) return null;
          const runs = orthoRuns([...ring, ring[0]], view);
          return (
            <g key={`${ct.iso}${k}`}>
              <polygon points={vis.map((q) => `${f1(q.x)},${f1(q.y)}`).join(" ")} fill={a(c.ink, "1C")} />
              {runs.map((run, j) => <polyline key={j} points={runStr(run)} fill="none" stroke={a(c.ink, "59")} strokeWidth={stroke} />)}
            </g>
          );
        });
      })}
    </g>
  );
};

/** US state borders as faint context at zoom detail — stroke only, so a
 *  sub-national target (e.g. Wisconsin) sits among its neighbours instead of
 *  floating in an undivided country blob. Never drawn at world detail. */
const StateContext: React.FC<{ view: GeoView; c: Colors; alpha: number; halfDiag: number }> =
({ view, c, alpha, halfDiag }) => {
  if (alpha <= 0.01) return null;
  return (
    <g opacity={alpha}>
      {usStates().map((st) => {
        if (!globeVisible(st, view, halfDiag)) return null;
        return st.rings.map((ring, k) => {
          const runs = orthoRuns([...ring, ring[0]], view);
          return runs.map((run, j) => (
            <polyline key={`${st.iso}${k}-${j}`} points={runStr(run)} fill="none" stroke={a(c.ink, "38")} strokeWidth={0.9} strokeLinejoin="round" />
          ));
        });
      })}
    </g>
  );
};

const TierHighlight: React.FC<{ region: GeoRegion | null; view: GeoView; c: Colors; alpha: number; fill: number; border: number }> =
({ region, view, c, alpha, fill, border }) => {
  if (!region || alpha <= 0.01 || (fill <= 0.01 && border <= 0.01)) return null;
  const sw = region.polys.length > 6 ? 1.6 : 2.6;
  return (
    <g opacity={alpha}>
      {region.polys.map((ring, k) => {
        const vis = ring.map(([lon, lat]) => orthographic(lon, lat, view.scale, view.lon, view.lat)).filter((q) => q.visible);
        if (vis.length < 3) return null;
        const runs = orthoRuns([...ring, ring[0]], view);
        return (
          <g key={k}>
            <polygon points={vis.map((q) => `${f1(q.x)},${f1(q.y)}`).join(" ")} fill={c.accent} fillOpacity={clamp01(fill) * 0.4} />
            {runs.map((run, j) => (
              <polyline key={j} points={runStr(run)} fill="none" stroke={c.accent} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"
                pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(border)} opacity={clamp01(border * 1.6)} />
            ))}
          </g>
        );
      })}
    </g>
  );
};

export interface GeoPin { at: LonLat; n: number; pop: number }

const Pins: React.FC<{ pins: GeoPin[]; project: (ll: LonLat) => [number, number] | null; c: Colors }> = ({ pins, project, c }) => (
  <g>
    {pins.map((pin) => {
      if (pin.pop <= 0.02) return null;
      const q = project(pin.at);
      if (!q) return null;
      return (
        <g key={pin.n} transform={`translate(${f1(q[0])} ${f1(q[1])})`} opacity={clamp01(pin.pop * 1.5)}>
          <circle r={16 * Math.min(1.12, pin.pop)} fill={c.accent} stroke={V("paper")} strokeWidth={2.5} />
          <text y={7} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={19} fill={V("accent-ink")}>{pin.n}</text>
        </g>
      );
    })}
  </g>
);

// --------------------------------------------------------------- ZoomGlobe

/** Orthographic globe in a w×h clipped viewport, camera fully animatable.
 *  `detail` crossfades the 110m world tier into the 50m zoom tier (the
 *  graticule fades down as it rises). Compose inside an <svg>. */
export const ZoomGlobe: React.FC<{
  w: number; h: number; c: Colors;
  view: GeoView;
  draw: number;                 // 0..1 land draw-in
  detail: number;               // 0 = world tier, 1 = zoom tier
  highlight?: string;           // country/continent name; border draws + fill
  highlightFill?: number;
  highlightBorder?: number;
  pins?: GeoPin[];
}> = ({ w, h, c, view, draw, detail, highlight, highlightFill = 0, highlightBorder = 0, pins }) => {
  const clipId = React.useId();
  const halfDiag = Math.hypot(w, h) / 2;
  const det = clamp01(detail);
  const gratA = (1 - det) * 0.9 * clamp01(draw);
  const hiWorld = highlight ? findHighlight(highlight, "world") : null;
  const hiZoom = highlight && det > 0.01 ? findHighlight(highlight, "zoom") : null;
  const grat: [number, number][][] = [];
  if (gratA > 0.01) {
    for (let lon = -180; lon < 180; lon += 30) {
      const line: LonLat[] = [];
      for (let lat = -84; lat <= 84; lat += 3) line.push([lon, lat]);
      grat.push(...orthoRuns(line, view));
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const line: LonLat[] = [];
      for (let lon = -180; lon <= 180; lon += 3) line.push([lon, lat]);
      grat.push(...orthoRuns(line, view));
    }
  }
  const project = (ll: LonLat): [number, number] | null => {
    const q = orthographic(ll[0], ll[1], view.scale, view.lon, view.lat);
    return q.visible ? [q.x, q.y] : null;
  };
  return (
    <g clipPath={`url(#${clipId})`}>
      <clipPath id={clipId}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={12} /></clipPath>
      <g opacity={clamp01(draw)}>
        <circle r={view.scale} fill={a(c.ink, "0D")} stroke={a(c.ink, "40")} strokeWidth={2} />
        {gratA > 0.01 && (
          <g opacity={gratA}>
            {grat.map((run, i) => <polyline key={i} points={runStr(run)} fill="none" stroke={a(c.ink, "17")} strokeWidth={1} />)}
          </g>
        )}
        <TierLand tier="world" view={view} c={c} alpha={1 - det} halfDiag={halfDiag} />
        <TierLand tier="zoom" view={view} c={c} alpha={det} halfDiag={halfDiag} />
        <StateContext view={view} c={c} alpha={det} halfDiag={halfDiag} />
        <TierHighlight region={hiWorld} view={view} c={c} alpha={1 - det} fill={highlightFill} border={highlightBorder} />
        <TierHighlight region={hiZoom} view={view} c={c} alpha={det} fill={highlightFill} border={highlightBorder} />
        {pins && <Pins pins={pins} project={project} c={c} />}
      </g>
    </g>
  );
};

// ----------------------------------------------------------------- ZoomMap

/** A flat map camera: the lon/lat at the window centre + px-per-degree. */
export interface MapWindow { lon: number; lat: number; scale: number }

export const lerpWindow = (A: MapWindow, B: MapWindow, t: number): MapWindow => ({
  lon: A.lon + (B.lon - A.lon) * t,
  lat: A.lat + (B.lat - A.lat) * t,
  scale: Math.exp(Math.log(A.scale) + (Math.log(B.scale) - Math.log(A.scale)) * t),
});

/** Window framing a bbox inside w×h (locally cos-lat corrected equirect). */
export const windowForBBox = (
  bbox: [number, number, number, number], w: number, h: number, fill = 0.84,
): MapWindow => {
  const lat = (bbox[1] + bbox[3]) / 2;
  const k = Math.max(0.25, Math.cos(lat * RAD));
  const spanLon = Math.max(0.5, bbox[2] - bbox[0]), spanLat = Math.max(0.5, bbox[3] - bbox[1]);
  return {
    lon: (bbox[0] + bbox[2]) / 2, lat,
    scale: fill * Math.min(w / (spanLon * k), h / spanLat),
  };
};

/** The whole world (84°N..58°S band) inside w×h. */
export const worldWindow = (w: number, h: number): MapWindow => {
  const lat = 13; // centre of the 84..-58 band
  return { lon: 0, lat, scale: Math.min(w / (360 * Math.cos(lat * RAD)), h / 142) };
};

/** lon/lat -> window px (origin at the window centre, like ZoomGlobe). */
export const windowProject = (win: MapWindow) => {
  const k = Math.cos(win.lat * RAD);
  return (lon: number, lat: number): [number, number] =>
    [(lon - win.lon) * win.scale * k, -(lat - win.lat) * win.scale];
};

/** Flat windowed map, same contract as ZoomGlobe (tiers, highlight, pins).
 *  Rings render at lon, lon±360 where the window crosses the dateline. */
export const ZoomMap: React.FC<{
  w: number; h: number; c: Colors;
  window: MapWindow;
  draw: number;
  detail: number;
  highlight?: string;
  highlightFill?: number;
  highlightBorder?: number;
  pins?: GeoPin[];
}> = ({ w, h, c, window: win, draw, detail, highlight, highlightFill = 0, highlightBorder = 0, pins }) => {
  const clipId = React.useId();
  const det = clamp01(detail);
  const proj = windowProject(win);
  const halfLon = w / 2 / (win.scale * Math.max(0.25, Math.cos(win.lat * RAD)));
  const halfLat = h / 2 / win.scale;
  const shiftsFor = (bbox: [number, number, number, number]): number[] => {
    const out: number[] = [];
    for (const s of [-360, 0, 360]) {
      if (bbox[0] + s > win.lon + halfLon + 0.5 || bbox[2] + s < win.lon - halfLon - 0.5) continue;
      if (bbox[1] > win.lat + halfLat + 0.5 || bbox[3] < win.lat - halfLat - 0.5) continue;
      out.push(s);
    }
    return out;
  };
  const ringPathAt = (ring: LonLat[], s: number): string =>
    ring.map(([lon, lat], i) => {
      const [x, y] = proj(lon + s, lat);
      return `${i === 0 ? "M" : "L"} ${f1(x)} ${f1(y)}`;
    }).join(" ") + " Z";
  const tier = (t: GeoTier, alpha: number) =>
    alpha <= 0.01 ? null : (
      <g key={t} opacity={alpha}>
        {countries(t).map((ct) =>
          shiftsFor(ct.bbox).map((s) =>
            ct.rings.map((ring, k) => (
              <path key={`${ct.iso}${s}${k}`} d={ringPathAt(ring, s)} fill={a(c.ink, "1F")}
                stroke={a(c.ink, "4D")} strokeWidth={t === "world" ? 1.2 : 1} strokeLinejoin="round" />
            ))
          )
        )}
      </g>
    );
  const hi = (t: GeoTier, alpha: number) => {
    if (alpha <= 0.01 || !highlight || (highlightFill <= 0.01 && highlightBorder <= 0.01)) return null;
    const region = findHighlight(highlight, t);
    if (!region) return null;
    const sw = region.polys.length > 6 ? 1.6 : 2.4;
    return (
      <g key={`hi${t}`} opacity={alpha}>
        {region.polys.map((ring, k) => (
          <g key={k}>
            <path d={ringPathAt(ring, 0)} fill={c.accent} fillOpacity={clamp01(highlightFill) * 0.4} stroke="none" />
            <path d={ringPathAt(ring, 0)} fill="none" stroke={c.accent} strokeWidth={sw} strokeLinejoin="round"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(highlightBorder)} opacity={clamp01(highlightBorder * 1.6)} />
          </g>
        ))}
      </g>
    );
  };
  const stateCtx = det <= 0.01 ? null : (
    <g opacity={det}>
      {usStates().map((st) =>
        shiftsFor(st.bbox).map((s) =>
          st.rings.map((ring, k) => (
            <path key={`${st.iso}${s}${k}`} d={ringPathAt(ring, s)} fill="none" stroke={a(c.ink, "33")} strokeWidth={0.8} strokeLinejoin="round" />
          ))
        )
      )}
    </g>
  );
  return (
    <g clipPath={`url(#${clipId})`}>
      <clipPath id={clipId}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} /></clipPath>
      <g opacity={clamp01(draw)}>
        {tier("world", 1 - det)}
        {tier("zoom", det)}
        {stateCtx}
        {hi("world", 1 - det)}
        {hi("zoom", det)}
        {pins && <Pins pins={pins} project={(ll) => proj(ll[0], ll[1])} c={c} />}
      </g>
    </g>
  );
};
