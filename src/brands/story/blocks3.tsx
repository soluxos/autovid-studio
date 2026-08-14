import React from "react";
import type { VisualBlock } from "./doc-types";
import { CountNumber, clamp01, easeOut, backOut, V, a, type BlockColors } from "./blocks";
import { Header, MONO_LABEL } from "./blocks2";

// Block library wave 2, part 1: the quantitative charts (docs/BRAND-SYSTEM.md
// §3 "never-seen-it-before scale"). Same design laws as blocks.tsx/blocks2.tsx:
// zero layout shift (CountNumber for every animating number, fixed slots),
// translate+opacity entrances only on text (never scaled), backOut landings,
// end labels anchored inward + adjacent labels staggered so nothing ever clips
// or collides, one shared skeleton per chart, everything drawn by us inside
// the 980px stage. No decoration here repeats another block's motif.

type B<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

/** truncate for SVG text (no CSS ellipsis inside <text>) */
export const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(1, n - 1)).trimEnd() + "…" : s);
/** fractional alpha -> 2-digit hex (for heat ramps) */
export const ah = (f: number) => Math.round(clamp01(f) * 255).toString(16).padStart(2, "0").toUpperCase();
/** spread label y-positions so close values can never collide (min gap) */
const spread = (ys: number[], gap: number, lo: number, hi: number) => {
  const order = ys.map((y, i) => [y, i] as const).sort((p, q) => p[0] - q[0]);
  const out = ys.slice();
  let prev = lo - gap;
  for (const [y, i] of order) { out[i] = Math.max(y, prev + gap); prev = out[i]; }
  if (prev > hi) {
    let next = hi + gap;
    for (let k = order.length - 1; k >= 0; k--) { const i = order[k][1]; out[i] = Math.min(out[i], next - gap); next = out[i]; }
  }
  return out;
};
const ELLIPSIS: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// ---------------------------------------------------------------- area

/** Filled silhouette chart — one shape, no dots (that's `line`'s language).
 *  Reveals left-to-right behind a clip; final value counts in the header slot.
 *  variant 0: straight segments · variant 1: smoothed curve. */
export const Area: React.FC<{ block: B<"area">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const pts = block.points, n = pts.length;
  const max = Math.max(...pts.map((d) => d.value)), min = Math.min(...pts.map((d) => d.value), 0);
  const W = 940, H = 380, PAD = 24, BASE = H - PAD;
  const x = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD);
  const y = (v: number) => BASE - ((v - min) / (max - min || 1)) * (H - 2 * PAD);
  const reveal = easeOut(p / 0.75);
  let top: string;
  if (block.variant === 1) {
    // smoothed: cardinal spline through the points
    const t = 0.18;
    let d = `M ${x(0)} ${y(pts[0].value)}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? i - 1 : 0, p3 = i < n - 2 ? i + 2 : n - 1;
      const c1x = x(i) + (x(i + 1) - x(p0)) * t, c1y = y(pts[i].value) + (y(pts[i + 1].value) - y(pts[p0].value)) * t;
      const c2x = x(i + 1) - (x(p3) - x(i)) * t, c2y = y(pts[i + 1].value) - (y(pts[p3].value) - y(pts[i].value)) * t;
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${x(i + 1)} ${y(pts[i + 1].value)}`;
    }
    top = d;
  } else {
    top = `M ${pts.map((d, i) => `${x(i)} ${y(d.value)}`).join(" L ")}`;
  }
  const readout = (
    <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color: c.accent, whiteSpace: "nowrap" }}>
      <CountNumber value={pts[n - 1].value} from={pts[0].value} p={easeOut(p / 0.75)} />{block.unit ? ` ${block.unit}` : ""}
    </span>
  );
  // x labels: first + middle + last, ends anchored inward so they can't clip
  const marks = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, arr) => arr.indexOf(v) === i);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} right={readout} />
      <svg viewBox={`0 0 ${W} ${H + 48}`} width={W} height={H + 48}>
        <defs><clipPath id={id}><rect x={0} y={0} width={W * reveal} height={H} /></clipPath></defs>
        {[0.33, 0.66].map((f) => (
          <line key={f} x1={PAD} y1={BASE - f * (H - 2 * PAD)} x2={W - PAD} y2={BASE - f * (H - 2 * PAD)} stroke={c.ink} strokeOpacity={0.08} strokeWidth={1} />
        ))}
        <g clipPath={`url(#${id})`}>
          <path d={`${top} L ${x(n - 1)} ${BASE} L ${x(0)} ${BASE} Z`} fill={c.accent} fillOpacity={0.2} />
          <path d={top} fill="none" stroke={c.accent} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <line x1={PAD} y1={BASE} x2={W - PAD} y2={BASE} stroke={c.ink} strokeOpacity={0.33} strokeWidth={2} />
        {marks.map((i, k) => (
          <text key={i} x={x(i)} y={H + 30} textAnchor={k === 0 ? "start" : k === marks.length - 1 ? "end" : "middle"}
            fontFamily={V("font-mono")} fontSize={20} fill={c.ink2} opacity={clamp01((reveal * (n - 1) - i + 0.5) * 2)}>
            {trunc(pts[i].label, 14)}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- stackbars

const SB_LBL = 240, SB_VAL = 150, SB_GAP = 24, SB_ROW = 88, SB_BAR = 42;

/** Rows of stacked segments; segments land left-to-right in sequence, legend
 *  chips in the header. variant 0: absolute widths · variant 1: 100% shares. */
export const StackBars: React.FC<{ block: B<"stackbars">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const cols = [c.accent, a(c.ink, "C4"), a(c.ink, "59")];
  const norm = block.variant === 1;
  const totals = block.rows.map((r) => r.values.reduce((s, v) => s + v, 0));
  const max = norm ? 1 : Math.max(...totals, 1);
  const legend = (
    <span style={{ display: "inline-flex", gap: 22, alignItems: "center" }}>
      {block.series.slice(0, 3).map((s, j) => (
        <span key={j} style={{ display: "inline-flex", gap: 8, alignItems: "center", ...MONO_LABEL, fontSize: 18, color: c.ink2, ...ELLIPSIS, maxWidth: 190 }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: cols[j], flexShrink: 0 }} />{s}
        </span>
      ))}
    </span>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} right={legend} />
      {block.rows.map((r, i) => {
        const slide = backOut((p - i * 0.1) / 0.5);
        const rowP = (p - i * 0.1) / 0.7;
        const denom = norm ? totals[i] || 1 : max;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `${SB_LBL}px 1fr ${SB_VAL}px`, columnGap: SB_GAP, alignItems: "center", height: SB_ROW, opacity: 0.1 + 0.9 * clamp01(rowP * 2), transform: `translateX(${(1 - slide) * -30}px)` }}>
            <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 28, color: c.ink, ...ELLIPSIS }}>{r.label}</div>
            <div style={{ position: "relative", height: SB_BAR }}>
              <div style={{ position: "absolute", inset: 0, background: a(c.ink, "0F"), borderRadius: 5 }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", gap: 3 }}>
                {r.values.slice(0, 3).map((v, j) => {
                  const g = easeOut((rowP - j * 0.22) / 0.4);
                  return <div key={j} style={{ width: `calc(${(v / denom) * 100}% * ${g} - ${g > 0.01 ? 3 : 0}px)`, background: cols[j], borderRadius: 5 }} />;
                })}
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 26, color: c.ink, whiteSpace: "nowrap" }}>
              <CountNumber value={norm ? Math.round((r.values[0] / (totals[i] || 1)) * 100) : totals[i]} p={easeOut((rowP - 0.3) / 0.5)} />{norm ? "%" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- groupbars

/** Two series compared per group. variant 0: paired vertical columns, counted
 *  values in a fixed slot above each pair · variant 1: paired horizontal rows. */
export const GroupBars: React.FC<{ block: B<"groupbars">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const groups = block.groups.slice(0, 4);
  const max = Math.max(...groups.flatMap((g) => [g.a, g.b]), 1);
  const legend = (
    <span style={{ display: "inline-flex", gap: 22, alignItems: "center" }}>
      {[[block.seriesA, c.accent], [block.seriesB, a(c.ink, "73")]].map(([s, col], j) => (
        <span key={j} style={{ display: "inline-flex", gap: 8, alignItems: "center", ...MONO_LABEL, fontSize: 18, color: c.ink2, ...ELLIPSIS, maxWidth: 210 }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: col as string, flexShrink: 0 }} />{s}
        </span>
      ))}
    </span>
  );
  if (block.variant === 1) {
    return (
      <div style={{ width: 980 }}>
        <Header title={block.title} unit={block.unit} c={c} right={legend} />
        {groups.map((g, i) => {
          const rowP = (p - i * 0.12) / 0.65;
          const slide = backOut(rowP / 0.75);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "240px 1fr 130px", columnGap: 24, alignItems: "center", height: 104, opacity: 0.1 + 0.9 * clamp01(rowP * 2), transform: `translateX(${(1 - slide) * -30}px)`, borderBottom: i < groups.length - 1 ? `1px solid ${a(c.ink, "14")}` : "none" }}>
              <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 28, color: c.ink, ...ELLIPSIS }}>{g.label}</div>
              <div style={{ display: "grid", rowGap: 7 }}>
                {[[g.a, c.accent, 0], [g.b, a(c.ink, "73"), 0.16]].map(([v, col, d], j) => (
                  <div key={j} style={{ position: "relative", height: 24 }}>
                    <div style={{ position: "absolute", inset: 0, background: a(c.ink, "0D"), borderRadius: 4 }} />
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${((v as number) / max) * easeOut((rowP - (d as number)) / 0.5) * 100}%`, background: col as string, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", rowGap: 7, textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 21 }}>
                <span style={{ color: c.accent }}><CountNumber value={g.a} p={easeOut(rowP / 0.6)} /></span>
                <span style={{ color: c.ink2 }}><CountNumber value={g.b} p={easeOut((rowP - 0.16) / 0.6)} /></span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  const H = 330, slotW = 940 / groups.length;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} right={legend} />
      <div style={{ position: "relative", width: 940, height: H + 118 }}>
        {groups.map((g, i) => {
          const gp = (p - i * 0.12) / 0.62;
          return (
            <div key={i} style={{ position: "absolute", left: i * slotW, width: slotW, top: 0, bottom: 0 }}>
              {/* counted values live in a FIXED top slot — they never ride the column tops */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18, fontFamily: V("font-mono"), fontWeight: 700, fontSize: 21, opacity: clamp01(gp * 1.6) }}>
                <span style={{ color: c.accent }}><CountNumber value={g.a} p={easeOut(gp / 0.6)} /></span>
                <span style={{ color: c.ink2 }}><CountNumber value={g.b} p={easeOut((gp - 0.12) / 0.6)} /></span>
              </div>
              {[[g.a, c.accent, -1, 0], [g.b, a(c.ink, "73"), 1, 0.12]].map(([v, col, side, d], j) => (
                <div key={j} style={{
                  position: "absolute", bottom: 82, left: `calc(50% + ${(side as number) < 0 ? -46 : 4}px)`, width: 42,
                  height: ((v as number) / max) * (H - 44) * easeOut((gp - (d as number)) / 0.55),
                  background: col as string, borderRadius: "5px 5px 0 0",
                }} />
              ))}
              <div style={{ position: "absolute", bottom: 30, left: 8, right: 8, textAlign: "center", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 22, color: c.ink, ...ELLIPSIS, opacity: clamp01(gp * 1.6) }}>{g.label}</div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 80, height: 2, background: a(c.ink, "55") }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- slope

/** Then/now slopegraph: two axes, one drawn line per item; label rows are
 *  spread apart so near-equal values can never collide. variant 0: values on
 *  both ends · variant 1: names left, values right only. */
export const Slope: React.FC<{ block: B<"slope">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const items = block.items.slice(0, 5);
  const H = 440, TOP = 56, BOT = H - 24;
  const all = items.flatMap((d) => [d.from, d.to]);
  const max = Math.max(...all), min = Math.min(...all);
  const y = (v: number) => BOT - ((v - min) / (max - min || 1)) * (BOT - TOP);
  const SIDE = 292, MID = 980 - 2 * SIDE;
  const yF = spread(items.map((d) => y(d.from)), 54, TOP, BOT);
  const yT = spread(items.map((d) => y(d.to)), 54, TOP, BOT);
  const lab = (it: (typeof items)[0], hot: boolean, showVal: boolean, delay: number, right: boolean) => (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: right ? "flex-start" : "flex-end", opacity: clamp01(easeOut((p - delay) / 0.4)), transform: `translateX(${(1 - easeOut((p - delay) / 0.4)) * (right ? 18 : -18)}px)` }}>
      {right && showVal && <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: hot ? c.accent : c.ink, whiteSpace: "nowrap" }}><CountNumber value={it.to} from={it.from} p={easeOut((p - delay) / 0.6)} />{it.suffix ?? ""}</span>}
      <span style={{ fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 23, color: hot ? c.accent : c.ink, ...ELLIPSIS, maxWidth: showVal ? 178 : 262 }}>{it.label}</span>
      {!right && showVal && <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: hot ? c.accent : c.ink2, whiteSpace: "nowrap" }}>{Math.round(it.from).toLocaleString()}{it.suffix ?? ""}</span>}
    </div>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        {/* column headers sit atop their axes */}
        <div style={{ position: "absolute", top: 0, left: SIDE - 60, width: 120, textAlign: "center", ...MONO_LABEL, fontSize: 19, color: c.ink2 }}>{block.left ?? "then"}</div>
        <div style={{ position: "absolute", top: 0, left: SIDE + MID - 60, width: 120, textAlign: "center", ...MONO_LABEL, fontSize: 19, color: c.ink2 }}>{block.right ?? "now"}</div>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <line x1={SIDE} y1={TOP - 12} x2={SIDE} y2={BOT} stroke={c.ink} strokeOpacity={0.3} strokeWidth={2} />
          <line x1={SIDE + MID} y1={TOP - 12} x2={SIDE + MID} y2={BOT} stroke={c.ink} strokeOpacity={0.3} strokeWidth={2} />
          {items.map((it, i) => {
            const hot = block.highlight === i;
            const draw = easeOut((p - 0.15 - i * 0.08) / 0.45);
            return (
              <g key={i}>
                <line x1={SIDE} y1={y(it.from)} x2={SIDE + MID * draw} y2={y(it.from) + (y(it.to) - y(it.from)) * draw}
                  stroke={hot ? c.accent : a(c.ink, "8C")} strokeWidth={hot ? 5 : 3} strokeLinecap="round" />
                <circle cx={SIDE} cy={y(it.from)} r={hot ? 8 : 6} fill={hot ? c.accent : c.ink} opacity={clamp01(easeOut((p - i * 0.08) / 0.3) * 2)} />
                <circle cx={SIDE + MID} cy={y(it.to)} r={hot ? 8 : 6} fill={hot ? c.accent : c.ink} opacity={draw >= 0.99 ? 1 : 0} />
              </g>
            );
          })}
        </svg>
        {items.map((it, i) => {
          const hot = block.highlight === i;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: 0, width: SIDE - 22, top: yF[i] - 16 }}>{lab(it, hot, block.variant !== 1, i * 0.08, false)}</div>
              <div style={{ position: "absolute", left: SIDE + MID + 22, width: SIDE - 22, top: yT[i] - 16 }}>{lab(it, hot, true, 0.45 + i * 0.08, true)}</div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- lollipop

/** Stem + head chart — lighter than bars, for sparse comparisons.
 *  variant 0: horizontal rows · variant 1: vertical stems on a baseline. */
export const Lollipop: React.FC<{ block: B<"lollipop">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const data = block.data.slice(0, 6);
  const max = Math.max(...data.map((d) => d.value), 1);
  if (block.variant === 1) {
    const H = 340, slotW = 940 / data.length;
    return (
      <div style={{ width: 980 }}>
        <Header title={block.title} unit={block.unit} c={c} />
        <div style={{ position: "relative", width: 940, height: H + 112 }}>
          {data.map((d, i) => {
            const gp = (p - i * 0.1) / 0.6;
            const grow = easeOut(gp / 0.8);
            const hot = block.highlight === i;
            const col = hot ? c.accent : a(c.ink, "A6");
            const h = (d.value / max) * (H - 60) * grow;
            return (
              <div key={i} style={{ position: "absolute", left: i * slotW, width: slotW, top: 0, bottom: 0 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 22, color: hot ? c.accent : c.ink, opacity: clamp01(gp * 1.5) }}>
                  <CountNumber value={d.value} p={grow} />
                </div>
                <div style={{ position: "absolute", bottom: 76, left: "50%", width: 5, marginLeft: -2.5, height: h, background: col, borderRadius: 3 }} />
                <div style={{ position: "absolute", bottom: 76 + h - 13, left: "50%", width: 26, height: 26, marginLeft: -13, borderRadius: "50%", background: col, opacity: clamp01(grow * 3) }} />
                <div style={{ position: "absolute", bottom: 26, left: 6, right: 6, textAlign: "center", fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 21, color: hot ? c.accent : c.ink2, ...ELLIPSIS, opacity: clamp01(gp * 1.5) }}>{d.label}</div>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 74, height: 2, background: a(c.ink, "55") }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 264 + 24, width: 2, background: a(c.ink, "55") }} />
        {data.map((d, i) => {
          const grow = easeOut((p - i * 0.1) / 0.55);
          const hot = block.highlight === i;
          const col = hot ? c.accent : a(c.ink, "A6");
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "264px 1fr 148px", columnGap: 24, alignItems: "center", height: 72, opacity: 0.1 + 0.9 * grow }}>
              <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 28, color: hot ? c.accent : c.ink, ...ELLIPSIS }}>{d.label}</div>
              <div style={{ position: "relative", height: 30 }}>
                <div style={{ position: "absolute", left: 0, top: 13, height: 4, width: `calc(${(d.value / max) * grow * 100}% - 13px)`, background: col, borderRadius: 2 }} />
                <div style={{ position: "absolute", top: 0, left: `calc(${(d.value / max) * grow * 100}% - 30px)`, width: 30, height: 30, borderRadius: "50%", background: col }} />
              </div>
              <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 26, color: hot ? c.accent : c.ink, opacity: 0.25 + 0.75 * grow }}>
                <CountNumber value={d.value} p={grow} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- bullet

/** Target vs actual: faint rail, accent actual bar, an ink target tick.
 *  variant 0: up to 4 rows · variant 1: one hero bullet with a labeled target. */
export const Bullet: React.FC<{ block: B<"bullet">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rows = block.rows.slice(0, block.variant === 1 ? 1 : 4);
  const max = Math.max(...rows.flatMap((r) => [r.actual, r.target]), 1) * 1.08;
  const legend = (
    <span style={{ display: "inline-flex", gap: 22, alignItems: "center", ...MONO_LABEL, fontSize: 18, color: c.ink2 }}>
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span style={{ width: 22, height: 10, borderRadius: 3, background: c.accent }} />actual</span>
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span style={{ width: 4, height: 18, background: c.ink }} />target</span>
    </span>
  );
  if (block.variant === 1) {
    const r = rows[0];
    const grow = easeOut(p / 0.65);
    const tf = r.target / max;
    return (
      <div style={{ width: 980 }}>
        <Header title={block.title} unit={block.unit} c={c} right={legend} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
          <span style={{ fontFamily: V("font-ui"), fontWeight: 700, fontSize: 34, color: c.ink, ...ELLIPSIS, maxWidth: 620 }}>{r.label}</span>
          <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 34, color: c.accent, whiteSpace: "nowrap" }}>
            <CountNumber value={r.actual} p={grow} />{r.suffix ?? ""}
          </span>
        </div>
        <div style={{ position: "relative", height: 64 }}>
          <div style={{ position: "absolute", inset: 0, background: a(c.ink, "0F"), borderRadius: 8 }} />
          <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: `${(r.actual / max) * grow * 100}%`, background: c.accent, borderRadius: 6 }} />
          <div style={{ position: "absolute", top: -8, bottom: -8, left: `${tf * 100}%`, width: 4, background: c.ink, opacity: clamp01((p - 0.35) * 3) }} />
        </div>
        {/* target label anchors inward when the tick sits near either edge */}
        <div style={{ position: "relative", height: 44, marginTop: 10 }}>
          <div style={{
            position: "absolute", top: 6, ...MONO_LABEL, fontSize: 19, color: c.ink2, whiteSpace: "nowrap", opacity: clamp01((p - 0.45) * 3),
            ...(tf > 0.82 ? { right: `${(1 - tf) * 100}%` } : tf < 0.18 ? { left: `${tf * 100}%` } : { left: `${tf * 100}%`, transform: "translateX(-50%)" }),
          }}>
            target {Math.round(r.target).toLocaleString()}{r.suffix ?? ""}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} right={legend} />
      {rows.map((r, i) => {
        const grow = easeOut((p - i * 0.11) / 0.55);
        const hit = r.actual >= r.target;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "250px 1fr 150px", columnGap: 24, alignItems: "center", height: 82, opacity: 0.1 + 0.9 * grow }}>
            <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 27, color: c.ink, ...ELLIPSIS }}>{r.label}</div>
            <div style={{ position: "relative", height: 36 }}>
              <div style={{ position: "absolute", inset: 0, background: a(c.ink, "0F"), borderRadius: 5 }} />
              <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: `${(r.actual / max) * grow * 100}%`, background: c.accent, borderRadius: 4 }} />
              <div style={{ position: "absolute", top: -6, bottom: -6, left: `${(r.target / max) * 100}%`, width: 3.5, background: c.ink, opacity: clamp01((p - 0.3 - i * 0.11) * 3) }} />
            </div>
            <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 25, color: hit ? c.accent : c.ink, whiteSpace: "nowrap" }}>
              <CountNumber value={r.actual} p={grow} /><span style={{ color: c.ink2, fontWeight: 400 }}>/{Math.round(r.target).toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- gauge

/** Dial: a 240° arc sweeping to the value, needle tracking it.
 *  variant 0: needle + ticks · variant 1: thin open arc, ends labeled inward. */
export const Gauge: React.FC<{ block: B<"gauge">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const max = block.max ?? 100;
  const frac = clamp01(block.value / max);
  const draw = easeOut(p / 0.7);
  const CX = 470, CY = 320, R = 236;
  const SWEEP = block.variant === 1 ? 180 : 240;
  const A0 = -SWEEP / 2;
  const pt = (deg: number, r: number) => ({ x: CX + r * Math.sin((deg * Math.PI) / 180), y: CY - r * Math.cos((deg * Math.PI) / 180) });
  const arc = (from: number, to: number, r: number) => {
    const s = pt(from, r), e = pt(to, r);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
  };
  const angle = A0 + SWEEP * frac * draw;
  const sw = block.variant === 1 ? 16 : 34;
  return (
    <div style={{ position: "relative", width: 940, height: block.variant === 1 ? 410 : 550 }}>
      <svg viewBox="0 0 940 470" width={940} height={470} style={{ position: "absolute", top: 0, left: 0 }}>
        <path d={arc(A0, A0 + SWEEP, R)} fill="none" stroke={a(c.ink, "14")} strokeWidth={sw} strokeLinecap="round" />
        {frac * draw > 0.004 && <path d={arc(A0, angle, R)} fill="none" stroke={c.accent} strokeWidth={sw} strokeLinecap="round" />}
        {block.variant !== 1 && Array.from({ length: 9 }).map((_, i) => {
          const d = A0 + (SWEEP / 8) * i;
          const o = pt(d, R - 34), q = pt(d, R - 52);
          return <line key={i} x1={o.x} y1={o.y} x2={q.x} y2={q.y} stroke={c.ink} strokeOpacity={0.35} strokeWidth={i % 2 ? 2 : 3.5} />;
        })}
        {block.variant !== 1 && (
          <g opacity={clamp01(p * 3)}>
            <line x1={CX} y1={CY} x2={pt(angle, R - 74).x} y2={pt(angle, R - 74).y} stroke={c.ink} strokeWidth={6} strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={15} fill={c.ink} />
          </g>
        )}
        {block.variant === 1 && (
          <>
            <text {...pt(A0, R + 40)} textAnchor="start" fontFamily={V("font-mono")} fontSize={21} fill={c.ink2}>0</text>
            <text {...pt(A0 + SWEEP, R + 40)} textAnchor="end" fontFamily={V("font-mono")} fontSize={21} fill={c.ink2}>{Math.round(max).toLocaleString()}</text>
          </>
        )}
      </svg>
      {/* readout in a fixed slot under the hub — never rides the needle */}
      <div style={{ position: "absolute", left: 0, right: 0, top: block.variant === 1 ? 210 : 350, textAlign: "center" }}>
        <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 96, lineHeight: 1, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
          <CountNumber value={block.value} p={draw} />{block.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 8 }}>{block.suffix}</span> : null}
        </div>
        <div style={{ ...MONO_LABEL, fontSize: 24, color: c.ink2, marginTop: 16, ...ELLIPSIS }}>{block.label}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- calheat

/** Heat strip: cells shaded by intensity, popping in sequence, ramp legend in
 *  the header. variant 0: one labeled row · variant 1: 7-column week grid. */
export const CalHeat: React.FC<{ block: B<"calheat">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const vals = block.values.slice(0, block.variant === 1 ? 35 : 14);
  const max = Math.max(...vals, 0.0001);
  const ramp = (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center", ...MONO_LABEL, fontSize: 18, color: c.ink2 }}>
      less
      {[0.12, 0.32, 0.55, 0.78, 1].map((f) => <span key={f} style={{ width: 18, height: 18, borderRadius: 5, background: `${c.accent}${ah(0.08 + 0.84 * f)}` }} />)}
      more
    </span>
  );
  const cell = (v: number, i: number, size: number, ring: boolean) => {
    const s = backOut((p - i * 0.035) / 0.32);
    return (
      <span key={i} style={{
        width: size, height: size, borderRadius: 8, boxSizing: "border-box",
        background: `${c.accent}${ah(0.08 + 0.84 * (v / max))}`,
        border: ring ? `3px solid ${c.ink}` : `1px solid ${a(c.ink, "1A")}`,
        opacity: clamp01(s * 2), transform: `scale(${0.5 + 0.5 * clamp01(s)})`,
      }} />
    );
  };
  if (block.variant === 1) {
    const size = 58;
    return (
      <div style={{ width: 980 }}>
        <Header title={block.title} c={c} right={ramp} />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${size}px)`, gap: 12, justifyContent: "center" }}>
          {vals.map((v, i) => cell(v, i, size, block.highlight === i))}
        </div>
      </div>
    );
  }
  const n = vals.length, size = Math.min(66, Math.floor((940 - (n - 1) * 10) / n));
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} right={ramp} />
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {vals.map((v, i) => cell(v, i, size, block.highlight === i))}
      </div>
      {block.labels && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
          {vals.map((_, i) => (
            <span key={i} style={{ width: size, textAlign: "center", fontFamily: V("font-mono"), fontSize: 17, color: block.highlight === i ? c.accent : c.ink2, fontWeight: block.highlight === i ? 700 : 400, opacity: clamp01((p - i * 0.035) * 3) }}>
              {trunc(block.labels?.[i] ?? "", Math.max(2, Math.floor(size / 11)))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- matrix

/** 2×2 quadrant map: axes draw through the centre, quadrant names pop in, the
 *  highlighted quadrant tints. variant 0: all quads named · variant 1: only
 *  the highlight named, the rest dimmed dots. */
export const Matrix: React.FC<{ block: B<"matrix">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const W = 700, H = 480, LX = 140, TY = 46;
  const axis = easeOut((p - 0.05) / 0.45);
  const hi = block.highlight;
  const axisLab: React.CSSProperties = { position: "absolute", ...MONO_LABEL, fontSize: 18, color: c.ink2, opacity: clamp01(axis * 1.6) };
  return (
    <div style={{ position: "relative", width: 980, height: H + TY + 56 }}>
      {/* frame + quads */}
      <div style={{ position: "absolute", left: LX, top: TY, width: W, height: H, border: `1.5px solid ${a(c.ink, "26")}`, borderRadius: 10 }}>
        {[0, 1, 2, 3].map((q) => {
          const pop = easeOut((p - 0.3 - q * 0.1) / 0.4);
          const isHi = hi === q;
          const named = block.variant !== 1 || isHi;
          return (
            <div key={q} style={{
              position: "absolute", left: q % 2 ? "50%" : 0, top: q < 2 ? 0 : "50%", width: "50%", height: "50%",
              background: isHi ? a(c.accent, "1F") : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box",
              opacity: clamp01(pop), transform: `translateY(${(1 - pop) * 14}px)`,
            }}>
              {named ? (
                <span style={{ fontFamily: V("font-ui"), fontWeight: isHi ? 700 : 600, fontSize: isHi ? 30 : 25, color: isHi ? c.accent : c.ink2, textAlign: "center", overflow: "hidden", maxHeight: 76, lineHeight: 1.25 }}>{block.quads[q]}</span>
              ) : (
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: a(c.ink, "40") }} />
              )}
            </div>
          );
        })}
        {/* centre axes draw on */}
        <div style={{ position: "absolute", left: "50%", top: "50%", width: W * axis, height: 2.5, background: a(c.ink, "59"), transform: "translate(-50%,-50%)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 2.5, height: H * axis, background: a(c.ink, "59"), transform: "translate(-50%,-50%)" }} />
      </div>
      {/* axis end labels live OUTSIDE the frame in fixed slots */}
      <div style={{ ...axisLab, top: TY + H / 2 - 24, left: 0, width: LX - 16, textAlign: "right", lineHeight: 1.3, maxHeight: 48, overflow: "hidden" }}>{block.xAxis[0]}</div>
      <div style={{ ...axisLab, top: TY + H / 2 - 24, left: LX + W + 16, width: 980 - LX - W - 16, textAlign: "left", lineHeight: 1.3, maxHeight: 48, overflow: "hidden" }}>{block.xAxis[1]}</div>
      <div style={{ ...axisLab, top: 8, left: LX, width: W, textAlign: "center", ...ELLIPSIS }}>{block.yAxis[0]}</div>
      <div style={{ ...axisLab, top: TY + H + 20, left: LX, width: W, textAlign: "center", ...ELLIPSIS }}>{block.yAxis[1]}</div>
    </div>
  );
};

// ---------------------------------------------------------------- bump

/** Rank change between two moments: fixed rank slots on both sides (so labels
 *  can never collide), crossing lines drawn between them. variant 0: names on
 *  both ends · variant 1: names left only, heavier lines. */
export const Bump: React.FC<{ block: B<"bump">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const items = block.items.slice(0, 5);
  const ROW = 84, TOP = 52;
  const H = TOP + items.length * ROW;
  const XL = 330, XR = 650;
  const y = (rank: number) => TOP + (rank - 0.5) * ROW;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <div style={{ position: "absolute", top: 0, left: XL - 60, width: 120, textAlign: "center", ...MONO_LABEL, fontSize: 19, color: c.ink2 }}>{block.cols?.[0] ?? "before"}</div>
        <div style={{ position: "absolute", top: 0, left: XR - 60, width: 120, textAlign: "center", ...MONO_LABEL, fontSize: 19, color: c.ink2 }}>{block.cols?.[1] ?? "after"}</div>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {items.map((it, i) => {
            const hot = block.highlight === i;
            const draw = easeOut((p - 0.2 - i * 0.08) / 0.45);
            const y1 = y(it.from), y2 = y(it.to);
            return (
              <g key={i}>
                {draw > 0.01 && (
                  <path d={`M ${XL + 30} ${y1} C ${XL + 170} ${y1} ${XR - 170} ${y2} ${XR - 30} ${y2}`} fill="none"
                    stroke={hot ? c.accent : a(c.ink, "66")} strokeWidth={block.variant === 1 ? (hot ? 8 : 5) : hot ? 5.5 : 3.5}
                    strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(draw)} />
                )}
                <g opacity={clamp01(easeOut((p - i * 0.08) / 0.35) * 2)}>
                  <circle cx={XL} cy={y1} r={26} fill={hot ? c.accent : V("paper")} stroke={hot ? c.accent : a(c.ink, "8C")} strokeWidth={2.5} />
                  <text x={XL} y={y1 + 9} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={25} fill={hot ? V("accent-ink") : c.ink}>{it.from}</text>
                </g>
                <g opacity={draw >= 0.98 ? 1 : 0}>
                  <circle cx={XR} cy={y2} r={26} fill={hot ? c.accent : V("paper")} stroke={hot ? c.accent : a(c.ink, "8C")} strokeWidth={2.5} />
                  <text x={XR} y={y2 + 9} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={25} fill={hot ? V("accent-ink") : c.ink}>{it.to}</text>
                </g>
              </g>
            );
          })}
        </svg>
        {items.map((it, i) => {
          const hot = block.highlight === i;
          const inP = easeOut((p - i * 0.08) / 0.4);
          const outP = easeOut((p - 0.55 - i * 0.08) / 0.4);
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: 0, width: XL - 48, top: y(it.from) - 17, textAlign: "right", fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 24, color: hot ? c.accent : c.ink, ...ELLIPSIS, opacity: clamp01(inP), transform: `translateX(${(1 - inP) * -18}px)` }}>{it.label}</div>
              {block.variant !== 1 && (
                <div style={{ position: "absolute", left: XR + 48, width: 980 - XR - 48, top: y(it.to) - 17, textAlign: "left", fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 24, color: hot ? c.accent : c.ink, ...ELLIPSIS, opacity: clamp01(outP), transform: `translateX(${(1 - outP) * 18}px)` }}>{it.label}</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- dumbbell

/** From→to range rows: hollow start dot, accent end dot, a connector growing
 *  between them. variant 0: from→to values · variant 1: signed delta pill. */
export const Dumbbell: React.FC<{ block: B<"dumbbell">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rows = block.rows.slice(0, 5);
  const all = rows.flatMap((r) => [r.from, r.to]);
  const max = Math.max(...all), min = Math.min(...all, 0);
  const f = (v: number) => (v - min) / (max - min || 1);
  const legend = (
    <span style={{ display: "inline-flex", gap: 22, alignItems: "center", ...MONO_LABEL, fontSize: 18, color: c.ink2 }}>
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span style={{ width: 16, height: 16, borderRadius: "50%", boxSizing: "border-box", border: `3px solid ${a(c.ink, "8C")}` }} />{block.from ?? "from"}</span>
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: c.accent }} />{block.to ?? "to"}</span>
    </span>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} right={legend} />
      {rows.map((r, i) => {
        const rowP = (p - i * 0.1) / 0.65;
        const draw = easeOut((rowP - 0.15) / 0.55);
        const delta = r.to - r.from;
        const x1 = f(r.from), x2 = f(r.to);
        const lx = Math.min(x1, x2), lw = Math.abs(x2 - x1);
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "250px 1fr 190px", columnGap: 24, alignItems: "center", height: 82, opacity: 0.1 + 0.9 * clamp01(rowP * 2) }}>
            <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 27, color: c.ink, ...ELLIPSIS }}>{r.label}</div>
            <div style={{ position: "relative", height: 30, margin: "0 15px" }}>
              <div style={{ position: "absolute", left: -15, right: -15, top: 14, height: 1.5, background: a(c.ink, "14") }} />
              <div style={{ position: "absolute", top: 12.5, left: `${lx * 100}%`, width: `${lw * clamp01(draw) * 100}%`, height: 5, background: a(c.accent, "73"), borderRadius: 3, ...(x2 < x1 ? { left: "auto", right: `${(1 - x1) * 100}%` } : {}) }} />
              <div style={{ position: "absolute", top: 2, left: `calc(${x1 * 100}% - 13px)`, width: 26, height: 26, borderRadius: "50%", boxSizing: "border-box", border: `4px solid ${a(c.ink, "8C")}`, background: V("paper"), opacity: clamp01(rowP * 2.5) }} />
              <div style={{ position: "absolute", top: 2, left: `calc(${x2 * 100}% - 13px)`, width: 26, height: 26, borderRadius: "50%", background: c.accent, opacity: draw >= 0.97 ? 1 : 0 }} />
            </div>
            {block.variant === 1 ? (
              <div style={{ textAlign: "right" }}>
                <span style={{ display: "inline-block", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 23, color: c.accent, background: a(c.accent, "1F"), borderRadius: 8, padding: "5px 12px", whiteSpace: "nowrap", opacity: clamp01((draw - 0.4) * 3) }}>
                  {delta >= 0 ? "+" : "−"}<CountNumber value={Math.abs(delta)} p={easeOut(rowP / 0.7)} />{r.suffix ?? ""}
                </span>
              </div>
            ) : (
              <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, whiteSpace: "nowrap" }}>
                <span style={{ color: c.ink2, fontWeight: 400 }}>{Math.round(r.from).toLocaleString()} → </span>
                <span style={{ color: c.accent }}><CountNumber value={r.to} from={r.from} p={easeOut(rowP / 0.7)} />{r.suffix ?? ""}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- histogram

/** Distribution columns on one baseline, rising staggered. variant 0: clean
 *  shape · variant 1: accent bin + counted callout in a fixed top slot. */
export const Histogram: React.FC<{ block: B<"histogram">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const bins = block.bins.slice(0, 12);
  const max = Math.max(...bins.map((b) => b.value), 1);
  const n = bins.length, gap = 8, W = 940, colW = (W - (n - 1) * gap) / n;
  const H = 340, hiIdx = block.variant === 1 ? (block.highlight ?? bins.indexOf(bins.reduce((m, b) => (b.value > m.value ? b : m), bins[0]))) : -1;
  const every = colW >= 66 ? 1 : 2;
  const hi = bins[hiIdx];
  const hiX = hiIdx >= 0 ? hiIdx * (colW + gap) + colW / 2 : 0;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <div style={{ position: "relative", width: W, height: H + 108 }}>
        {/* callout lives in a fixed top slot; anchors inward near the edges */}
        {hi && (
          <div style={{
            position: "absolute", top: 0, fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: c.accent, whiteSpace: "nowrap", opacity: clamp01((p - 0.55) * 3),
            ...(hiX < 150 ? { left: Math.max(0, hiX - 20) } : hiX > W - 150 ? { right: Math.max(0, W - hiX - 20) } : { left: hiX, transform: "translateX(-50%)" }),
          }}>
            {trunc(hi.label, 16)} · <CountNumber value={hi.value} p={easeOut((p - 0.45) / 0.5)} />
          </div>
        )}
        {bins.map((b, i) => {
          const grow = easeOut((p - 0.06 - i * (0.4 / n)) / 0.5);
          const isHi = i === hiIdx;
          return (
            <div key={i} style={{ position: "absolute", left: i * (colW + gap), width: colW, bottom: 66, height: (b.value / max) * (H - 20) * grow, background: isHi ? c.accent : a(c.ink, "A6"), borderRadius: "6px 6px 0 0" }} />
          );
        })}
        {hi && <div style={{ position: "absolute", left: hiX - 1, bottom: 66 + (hi.value / max) * (H - 20), height: Math.max(0, H - 20 - (hi.value / max) * (H - 20) + 26), width: 2, background: a(c.accent, "66"), opacity: clamp01((p - 0.6) * 3) }} />}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 2, background: a(c.ink, "55") }} />
        {bins.map((b, i) =>
          i % every === 0 ? (
            <div key={i} style={{ position: "absolute", left: i * (colW + gap) - gap / 2, width: colW + gap, bottom: 22, textAlign: "center", fontFamily: V("font-mono"), fontSize: 18, color: i === hiIdx ? c.accent : c.ink2, fontWeight: i === hiIdx ? 700 : 400, opacity: clamp01((p - 0.15 - i * (0.4 / n)) * 3), ...ELLIPSIS }}>
              {b.label}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- funnel

/** Narrowing stages: trapezoid bands slimming toward the last stage, labels
 *  and counted values in fixed side columns. variant 0: symmetric funnel ·
 *  variant 1: left-anchored wedge. */
export const Funnel: React.FC<{ block: B<"funnel">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const stages = block.stages.slice(0, 5);
  const max = Math.max(...stages.map((s) => s.value), 1);
  const ROW = 96, FW = 460;
  const wOf = (i: number) => Math.max(0.12, stages[i].value / max) * FW;
  const alphas = ["F2", "C4", "96", "6E", "4D"];
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <div style={{ display: "grid", gridTemplateColumns: `250px ${FW}px 1fr`, columnGap: 26 }}>
        <div>
          {stages.map((s, i) => {
            const e = easeOut((p - i * 0.11) / 0.45);
            return (
              <div key={i} style={{ height: ROW, display: "flex", alignItems: "center", justifyContent: "flex-end", opacity: clamp01(e), transform: `translateX(${(1 - e) * -22}px)` }}>
                <span style={{ fontFamily: V("font-ui"), fontWeight: i === stages.length - 1 ? 700 : 600, fontSize: 27, color: i === stages.length - 1 ? c.accent : c.ink, textAlign: "right", ...ELLIPSIS, width: "100%" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <svg viewBox={`0 0 ${FW} ${stages.length * ROW}`} width={FW} height={stages.length * ROW}>
          {stages.map((s, i) => {
            const e = backOut((p - i * 0.11) / 0.45);
            if (e <= 0.02) return null;
            const w1 = wOf(i), w2 = i < stages.length - 1 ? wOf(i + 1) : w1 * 0.82;
            const yT = i * ROW + 5, yB = (i + 1) * ROW - 5;
            const last = i === stages.length - 1;
            const pts = block.variant === 1
              ? `0,${yT} ${w1},${yT} ${w2},${yB} 0,${yB}`
              : `${(FW - w1) / 2},${yT} ${(FW + w1) / 2},${yT} ${(FW + w2) / 2},${yB} ${(FW - w2) / 2},${yB}`;
            return <polygon key={i} points={pts} fill={last ? c.accent : `${c.ink}${alphas[i]}`} opacity={clamp01(e * 1.4)} transform={`translate(0 ${(1 - clamp01(e)) * 16})`} />;
          })}
        </svg>
        <div>
          {stages.map((s, i) => {
            const e = easeOut((p - 0.12 - i * 0.11) / 0.5);
            return (
              <div key={i} style={{ height: ROW, display: "flex", alignItems: "center", opacity: clamp01(e), transform: `translateX(${(1 - e) * 22}px)` }}>
                <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 26, color: i === stages.length - 1 ? c.accent : c.ink, whiteSpace: "nowrap" }}>
                  <CountNumber value={s.value} p={easeOut((p - i * 0.11) / 0.6)} />{s.suffix ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- pyramid

/** Triangle hierarchy: tiers slice a single triangle, labels ledger out to one
 *  fixed side column. variant 0: labels right · variant 1: labels left. */
export const Pyramid: React.FC<{ block: B<"pyramid">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const tiers = block.tiers.slice(0, 4);
  const n = tiers.length, ROW = 108, BASE_W = 500;
  const left = block.variant === 1;
  const PX = left ? 980 - 30 - BASE_W / 2 : 30 + BASE_W / 2; // triangle centre x
  const alphas = ["F2", "BF", "8C", "63"];
  const hiIdx = block.highlight ?? 0;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: n * ROW + 8 }}>
        <svg viewBox={`0 0 980 ${n * ROW + 8}`} width={980} height={n * ROW + 8} style={{ position: "absolute", inset: 0 }}>
          {tiers.map((t, i) => {
            const e = backOut((p - i * 0.12) / 0.45);
            if (e <= 0.02) return null;
            const wT = (BASE_W * i) / n, wB = (BASE_W * (i + 1)) / n;
            const yT = i * ROW + (i === 0 ? 0 : 5), yB = (i + 1) * ROW;
            const hot = i === hiIdx;
            const pts = i === 0
              ? `${PX},0 ${PX + wB / 2},${yB} ${PX - wB / 2},${yB}`
              : `${PX - wT / 2},${yT} ${PX + wT / 2},${yT} ${PX + wB / 2},${yB} ${PX - wB / 2},${yB}`;
            const lineX1 = left ? PX - (wT + wB) / 4 - 14 : PX + (wT + wB) / 4 + 14;
            const lineX2 = left ? 430 : 550;
            return (
              <g key={i} opacity={clamp01(e * 1.4)} transform={`translate(0 ${(1 - clamp01(e)) * 14})`}>
                <polygon points={pts} fill={hot ? c.accent : `${c.ink}${alphas[i]}`} />
                <line x1={lineX1} y1={(yT + yB) / 2} x2={lineX2} y2={(yT + yB) / 2} stroke={a(c.ink, "40")} strokeWidth={1.5} strokeDasharray="4 5" />
              </g>
            );
          })}
        </svg>
        {tiers.map((t, i) => {
          const e = easeOut((p - 0.1 - i * 0.12) / 0.5);
          const hot = i === hiIdx;
          return (
            <div key={i} style={{
              position: "absolute", top: i * ROW + ROW / 2 - 26, ...(left ? { left: 30, width: 385, textAlign: "right" as const } : { left: 565, width: 385, textAlign: "left" as const }),
              opacity: clamp01(e), transform: `translateX(${(1 - e) * (left ? -20 : 20)}px)`,
            }}>
              <div style={{ fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 26, color: hot ? c.accent : c.ink, ...ELLIPSIS }}>{t.label}</div>
              {t.value && <div style={{ fontFamily: V("font-mono"), fontSize: 20, color: c.ink2, marginTop: 4, ...ELLIPSIS }}>{t.value}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- treemap

/** 3-6 area tiles: the biggest takes the left column, the rest stack right;
 *  areas ∝ values. variant 0: accent on the largest · variant 1: accent on the
 *  smallest (the "sliver" story). */
export const Treemap: React.FC<{ block: B<"treemap">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const tiles = [...block.tiles].slice(0, 6).sort((x, q) => q.value - x.value);
  const total = tiles.reduce((s, t) => s + t.value, 0) || 1;
  const W = 940, H = 500, GAP = 8;
  const w0 = Math.max(0.34, Math.min(0.62, tiles[0].value / total)) * W;
  const rest = tiles.slice(1);
  const restTotal = rest.reduce((s, t) => s + t.value, 0) || 1;
  let acc = 0;
  const rects = [
    { t: tiles[0], x: 0, y: 0, w: w0, h: H },
    ...rest.map((t) => {
      const h = (t.value / restTotal) * (H - GAP * (rest.length - 1));
      const r = { t, x: w0 + GAP, y: acc, w: W - w0 - GAP, h };
      acc += h + GAP;
      return r;
    }),
  ];
  const accentIdx = block.variant === 1 ? rects.length - 1 : 0;
  const alphas = ["D9", "A6", "7A", "59", "40", "2E"];
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <div style={{ position: "relative", width: W, height: H }}>
        {rects.map((r, i) => {
          const e = easeOut((p - i * 0.09) / 0.45);
          const hot = i === accentIdx;
          const dark = hot || i < 2; // fills D9/A6 are dark enough for paper ink
          const small = r.h < 96 || r.w < 200;
          return (
            <div key={i} style={{
              position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 10,
              background: hot ? c.accent : `${c.ink}${alphas[i]}`, boxSizing: "border-box",
              padding: small ? "10px 14px" : "16px 18px", overflow: "hidden",
              opacity: clamp01(e), transform: `translateY(${(1 - e) * 18}px)`,
            }}>
              <div style={{ fontFamily: V("font-ui"), fontWeight: 700, fontSize: small ? 19 : 25, color: hot ? V("accent-ink") : dark ? V("paper") : c.ink, ...ELLIPSIS }}>{r.t.label}</div>
              <div style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: small ? 18 : 24, marginTop: small ? 2 : 8, color: hot ? V("accent-ink") : dark ? V("paper") : c.ink, opacity: 0.85, whiteSpace: "nowrap" }}>
                <CountNumber value={r.t.value} p={easeOut((p - i * 0.09) / 0.6)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- gantt

/** 3-4 spans on one time grid: labeled rows, bars growing from their start
 *  unit. variant 0: plain · variant 1: adds an accent "now" marker line. */
export const Gantt: React.FC<{ block: B<"gantt">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const spans = block.spans.slice(0, 4);
  const units = Math.max(block.cols?.length ?? 0, ...spans.map((s) => s.end), 1);
  const LBL = 250, GAP = 24, TRACK = 940 - LBL - GAP;
  const ROW = 86;
  const x = (u: number) => (u / units) * TRACK;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 940 }}>
        {/* unit grid + column labels span all rows: one shared skeleton */}
        <div style={{ position: "absolute", left: LBL + GAP, right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
          {Array.from({ length: units + 1 }).map((_, u) => (
            <div key={u} style={{ position: "absolute", top: 34, bottom: 0, left: x(u), width: u === 0 ? 2 : 1, background: a(c.ink, u === 0 ? "55" : "14") }} />
          ))}
          {block.cols?.slice(0, units).map((lab, u) => (
            <div key={u} style={{ position: "absolute", top: 0, left: x(u), width: x(u + 1) - x(u), textAlign: "center", fontFamily: V("font-mono"), fontSize: 17, color: c.ink2, letterSpacing: ".1em", textTransform: "uppercase", ...ELLIPSIS, opacity: clamp01((p - u * 0.05) * 3) }}>{lab}</div>
          ))}
          {block.variant === 1 && block.marker != null && (
            <div style={{ position: "absolute", top: 30, bottom: -6, left: x(block.marker), width: 3, background: c.accent, opacity: clamp01((p - 0.6) * 3), borderRadius: 2 }} />
          )}
        </div>
        <div style={{ height: 34 }} />
        {spans.map((s, i) => {
          const grow = easeOut((p - 0.12 - i * 0.11) / 0.5);
          const hot = block.highlight === i;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: `${LBL}px ${TRACK}px`, columnGap: GAP, alignItems: "center", height: ROW, opacity: 0.1 + 0.9 * clamp01((p - i * 0.11) * 2.5) }}>
              <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 26, color: hot ? c.accent : c.ink, ...ELLIPSIS }}>{s.label}</div>
              <div style={{ position: "relative", height: 34 }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: x(s.start), width: (x(s.end) - x(s.start)) * grow, background: hot ? c.accent : a(c.ink, "B3"), borderRadius: 8 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
