// Charles Minard's 1869 flow map of Napoleon's 1812 Russian campaign, as data.
// The army's size is the band WIDTH; the retreat carries temperatures. Figures
// are the well-known approximations from Minard's chart (422,000 marched in,
// ~100,000 reached Moscow, ~10,000 returned). Coordinates are stylised for a
// vertical 1080-wide frame, not a true geographic projection.

export interface RouteNode { lon: number; y: number; n: number; temp?: number; city?: string }

// Advance: west (Niemen) -> east (Moscow), thinning as men are lost.
// y positions spread the infographic across the frame's vertical space.
export const ADVANCE: RouteNode[] = [
  { lon: 24.0, y: 470, n: 422000, city: "Kaunas" },
  { lon: 25.3, y: 462, n: 400000 },
  { lon: 26.8, y: 456, n: 340000 },
  { lon: 28.0, y: 452, n: 300000 },
  { lon: 29.5, y: 446, n: 255000 },
  { lon: 31.0, y: 442, n: 175000 },
  { lon: 32.0, y: 438, n: 145000, city: "Smolensk" },
  { lon: 33.6, y: 434, n: 135000 },
  { lon: 35.0, y: 430, n: 120000 },
  { lon: 37.6, y: 424, n: 100000, city: "Moscow" },
];

// Retreat: east -> west, collapsing. Temperatures in °C (approx of Minard's line).
export const RETREAT: RouteNode[] = [
  { lon: 37.6, y: 660, n: 100000, temp: -5 },
  { lon: 36.0, y: 664, n: 90000, temp: -9 },
  { lon: 34.3, y: 668, n: 55000, temp: -11 },
  { lon: 32.0, y: 673, n: 24000, temp: -21 },
  { lon: 30.2, y: 677, n: 20000, temp: -24 },
  { lon: 28.5, y: 681, n: 14000, temp: -30, city: "Berezina" },
  { lon: 26.5, y: 686, n: 12000, temp: -28 },
  { lon: 24.0, y: 690, n: 10000, temp: -26 },
];

const LON0 = 23.2, LON1 = 38.6, XL = 74, XR = 980;
export const lonToX = (lon: number) => XL + ((lon - LON0) / (LON1 - LON0)) * (XR - XL);
/** Full band width in px for an army of n. Tuned so 422k reads huge, 10k a thread. */
export const widthFor = (n: number) => Math.max(1.6, n / 4200);

export interface Pt { x: number; y: number; n: number; temp?: number; city?: string }

const project = (nodes: RouteNode[]): Pt[] =>
  nodes.map((nd) => ({ x: lonToX(nd.lon), y: nd.y, n: nd.n, temp: nd.temp, city: nd.city }));

const cumLengths = (pts: Pt[]) => {
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return seg;
};

export interface RouteSample {
  revealed: Pt[];          // centreline points revealed so far (last is interpolated)
  lead: Pt;                // current leading edge (interpolated n/temp)
  cities: { x: number; y: number; name: string; passed: number }[]; // 0..1 how long ago passed
}

/** Reveal a route up to fraction p (0..1) of its total length. */
export function sampleRoute(nodes: RouteNode[], p: number): RouteSample {
  const pts = project(nodes);
  const cum = cumLengths(pts);
  const total = cum[cum.length - 1] || 1;
  const target = Math.max(0, Math.min(1, p)) * total;

  const revealed: Pt[] = [pts[0]];
  let lead = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] <= target) { revealed.push(pts[i]); lead = pts[i]; continue; }
    const segLen = cum[i] - cum[i - 1] || 1;
    const f = (target - cum[i - 1]) / segLen;
    const a = pts[i - 1], b = pts[i];
    const mid: Pt = {
      x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f,
      n: a.n + (b.n - a.n) * f,
      temp: a.temp != null && b.temp != null ? a.temp + (b.temp - a.temp) * f : b.temp,
    };
    revealed.push(mid); lead = mid; break;
  }

  const cities = pts
    .filter((pt) => pt.city)
    .map((pt) => {
      const idx = pts.indexOf(pt);
      const passed = target >= cum[idx] ? Math.min(1, (target - cum[idx]) / (total * 0.12)) : 0;
      return { x: pt.x, y: pt.y, name: pt.city!, passed };
    });

  return { revealed, lead, cities };
}

/** Build a variable-width filled-band SVG path from revealed centreline points. */
export function bandPath(pts: Pt[]): string {
  if (pts.length < 2) {
    const p = pts[0]; const h = Math.max(1, widthFor(p?.n ?? 0) / 2);
    return p ? `M ${p.x - 2},${p.y - h} L ${p.x + 2},${p.y - h} L ${p.x + 2},${p.y + h} L ${p.x - 2},${p.y + h} Z` : "";
  }
  const top: [number, number][] = [], bot: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const nx = -dy, ny = dx;                      // unit normal
    const h = Math.max(0.8, widthFor(pts[i].n) / 2);
    top.push([pts[i].x + nx * h, pts[i].y + ny * h]);
    bot.push([pts[i].x - nx * h, pts[i].y - ny * h]);
  }
  const d = "M " + top.map((p) => p.join(",")).join(" L ") + " L " + bot.reverse().map((p) => p.join(",")).join(" L ") + " Z";
  return d;
}
