import React from "react";
import { Easing, interpolate } from "remotion";
import type { VisualBlock } from "./doc-types";
import { Ranking, Donut, BigPercent, Steps, Scale, Iceberg, Waterfall, DotStrip, SparkRow, Definition } from "./blocks2";
import { Area, StackBars, GroupBars, Slope, Lollipop, Bullet, Gauge, CalHeat, Matrix, Bump, Dumbbell, Histogram, Funnel, Pyramid, Treemap, Gantt } from "./blocks3";
import { Venn, WordStack, Checklist, Versus, Odometer, FlowShare, Orbit, Thermometer, Receipt, Ticket, Polaroid, Clipping, FactCard, Letter, CountGrid, Tally } from "./blocks4";
import { WorldMapBlock, Globe, MapRoute, MapPins, MapSpread, MapDots, MapCompare, GlobeSpin, MapZoom, MapFlow, GlobeZoom } from "./blocks5";
import { CursorPath, DevicePhone, DeviceBrowser, UiMock, BeforeAfter, StateChips, FormDemo, MenuDemo, HeatZone, GazePath, Diagram, Sequence, Anatomy, Race, Stack, Toggle, Grid8, ContrastCheck, TypeScale, ZoomCompare } from "./blocks6";

export const V = (n: string) => `var(--${n})`;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeOut = (p: number) => Easing.out(Easing.cubic)(clamp01(p));
/** settle with a slight overshoot — entrances LAND instead of fading in */
export const backOut = (p: number) => { const q = clamp01(p) - 1; return 1 + 2.70158 * q ** 3 + 1.70158 * q ** 2; };

export interface BlockColors { ink: string; ink2: string; accent: string }

const fmt = (v: number, plain?: boolean) => (plain ? String(Math.round(v)) : Math.round(v).toLocaleString());
/** hex + alpha (8-digit hex) */
export const a = (hex: string, aa: string) => `${hex}${aa}`;

/** DESIGN LAW: numbers that animate must never cause layout shift. The FINAL
 *  value reserves the width invisibly; the live value overlays it right-anchored
 *  (odometer style), so prefixes, suffixes and siblings never move a pixel. */
export const CountNumber: React.FC<{ value: number; from?: number; p: number; plain?: boolean; style?: React.CSSProperties }> =
({ value, from = 0, p, plain, style }) => {
  const v = interpolate(easeOut(p), [0, 1], [from, value]);
  return (
    <span style={{ position: "relative", display: "inline-block", fontVariantNumeric: "tabular-nums", ...style }}>
      <span style={{ visibility: "hidden" }}>{fmt(value, plain)}</span>
      <span style={{ position: "absolute", top: 0, right: 0 }}>{fmt(v, plain)}</span>
    </span>
  );
};

/** Renders a data visual (stat / bars / line) centred in the stage. `p` is the
 *  beat-local animation progress (0..1). */
export const DataBlock: React.FC<{ block: VisualBlock; p: number; c: BlockColors }> = ({ block, p, c }) => {
  if (block.type === "stat") return <Stat block={block} p={p} c={c} />;
  if (block.type === "bars") return <Bars block={block} p={p} c={c} />;
  if (block.type === "line") return <LineChart block={block} p={p} c={c} />;
  if (block.type === "pictogram") return <Pictogram block={block} p={p} c={c} />;
  if (block.type === "compare") return <Compare block={block} p={p} c={c} />;
  if (block.type === "timeline") return <Timeline block={block} p={p} c={c} />;
  if (block.type === "quote") return <Quote block={block} p={p} c={c} />;
  // expanded library (blocks2.tsx)
  if (block.type === "ranking") return <Ranking block={block} p={p} c={c} />;
  if (block.type === "donut") return <Donut block={block} p={p} c={c} />;
  if (block.type === "bigpercent") return <BigPercent block={block} p={p} c={c} />;
  if (block.type === "steps") return <Steps block={block} p={p} c={c} />;
  if (block.type === "scale") return <Scale block={block} p={p} c={c} />;
  if (block.type === "iceberg") return <Iceberg block={block} p={p} c={c} />;
  if (block.type === "waterfall") return <Waterfall block={block} p={p} c={c} />;
  if (block.type === "dotstrip") return <DotStrip block={block} p={p} c={c} />;
  if (block.type === "sparkrow") return <SparkRow block={block} p={p} c={c} />;
  if (block.type === "definition") return <Definition block={block} p={p} c={c} />;
  // expanded library wave 2, charts (blocks3.tsx)
  if (block.type === "area") return <Area block={block} p={p} c={c} />;
  if (block.type === "stackbars") return <StackBars block={block} p={p} c={c} />;
  if (block.type === "groupbars") return <GroupBars block={block} p={p} c={c} />;
  if (block.type === "slope") return <Slope block={block} p={p} c={c} />;
  if (block.type === "lollipop") return <Lollipop block={block} p={p} c={c} />;
  if (block.type === "bullet") return <Bullet block={block} p={p} c={c} />;
  if (block.type === "gauge") return <Gauge block={block} p={p} c={c} />;
  if (block.type === "calheat") return <CalHeat block={block} p={p} c={c} />;
  if (block.type === "matrix") return <Matrix block={block} p={p} c={c} />;
  if (block.type === "bump") return <Bump block={block} p={p} c={c} />;
  if (block.type === "dumbbell") return <Dumbbell block={block} p={p} c={c} />;
  if (block.type === "histogram") return <Histogram block={block} p={p} c={c} />;
  if (block.type === "funnel") return <Funnel block={block} p={p} c={c} />;
  if (block.type === "pyramid") return <Pyramid block={block} p={p} c={c} />;
  if (block.type === "treemap") return <Treemap block={block} p={p} c={c} />;
  if (block.type === "gantt") return <Gantt block={block} p={p} c={c} />;
  // expanded library wave 2, kinetic type + props (blocks4.tsx)
  if (block.type === "venn") return <Venn block={block} p={p} c={c} />;
  if (block.type === "wordstack") return <WordStack block={block} p={p} c={c} />;
  if (block.type === "checklist") return <Checklist block={block} p={p} c={c} />;
  if (block.type === "versus") return <Versus block={block} p={p} c={c} />;
  if (block.type === "odometer") return <Odometer block={block} p={p} c={c} />;
  if (block.type === "flowshare") return <FlowShare block={block} p={p} c={c} />;
  if (block.type === "orbit") return <Orbit block={block} p={p} c={c} />;
  if (block.type === "thermometer") return <Thermometer block={block} p={p} c={c} />;
  if (block.type === "receipt") return <Receipt block={block} p={p} c={c} />;
  if (block.type === "ticket") return <Ticket block={block} p={p} c={c} />;
  if (block.type === "polaroid") return <Polaroid block={block} p={p} c={c} />;
  if (block.type === "clipping") return <Clipping block={block} p={p} c={c} />;
  if (block.type === "factcard") return <FactCard block={block} p={p} c={c} />;
  if (block.type === "letter") return <Letter block={block} p={p} c={c} />;
  if (block.type === "countgrid") return <CountGrid block={block} p={p} c={c} />;
  if (block.type === "tally") return <Tally block={block} p={p} c={c} />;
  // expanded library wave 3, maps + globes (blocks5.tsx)
  if (block.type === "worldmap") return <WorldMapBlock block={block} p={p} c={c} />;
  if (block.type === "globe") return <Globe block={block} p={p} c={c} />;
  if (block.type === "maproute") return <MapRoute block={block} p={p} c={c} />;
  if (block.type === "mappins") return <MapPins block={block} p={p} c={c} />;
  if (block.type === "mapspread") return <MapSpread block={block} p={p} c={c} />;
  if (block.type === "mapdots") return <MapDots block={block} p={p} c={c} />;
  if (block.type === "mapcompare") return <MapCompare block={block} p={p} c={c} />;
  if (block.type === "globespin") return <GlobeSpin block={block} p={p} c={c} />;
  if (block.type === "mapzoom") return <MapZoom block={block} p={p} c={c} />;
  if (block.type === "mapflow") return <MapFlow block={block} p={p} c={c} />;
  if (block.type === "globezoom") return <GlobeZoom block={block} p={p} c={c} />;
  // expanded library wave 4, demonstrations — blocks that SHOW a concept
  // happening rather than describe data (blocks6.tsx)
  if (block.type === "cursorpath") return <CursorPath block={block} p={p} c={c} />;
  if (block.type === "devicephone") return <DevicePhone block={block} p={p} c={c} />;
  if (block.type === "devicebrowser") return <DeviceBrowser block={block} p={p} c={c} />;
  if (block.type === "uimock") return <UiMock block={block} p={p} c={c} />;
  if (block.type === "beforeafter") return <BeforeAfter block={block} p={p} c={c} />;
  if (block.type === "statechips") return <StateChips block={block} p={p} c={c} />;
  if (block.type === "formdemo") return <FormDemo block={block} p={p} c={c} />;
  if (block.type === "menudemo") return <MenuDemo block={block} p={p} c={c} />;
  if (block.type === "heatzone") return <HeatZone block={block} p={p} c={c} />;
  if (block.type === "gazepath") return <GazePath block={block} p={p} c={c} />;
  if (block.type === "diagram") return <Diagram block={block} p={p} c={c} />;
  if (block.type === "sequence") return <Sequence block={block} p={p} c={c} />;
  if (block.type === "anatomy") return <Anatomy block={block} p={p} c={c} />;
  if (block.type === "race") return <Race block={block} p={p} c={c} />;
  if (block.type === "stack") return <Stack block={block} p={p} c={c} />;
  if (block.type === "toggle") return <Toggle block={block} p={p} c={c} />;
  if (block.type === "grid8") return <Grid8 block={block} p={p} c={c} />;
  if (block.type === "contrastcheck") return <ContrastCheck block={block} p={p} c={c} />;
  if (block.type === "typescale") return <TypeScale block={block} p={p} c={c} />;
  if (block.type === "zoomcompare") return <ZoomCompare block={block} p={p} c={c} />;
  return null;
};

/** Hand-drawn accent circle that sketches itself around its parent — the
 *  editorial "scribble" that marks THE number. Parent must be position:relative. */
const AccentCircle: React.FC<{ draw: number; color: string }> = ({ draw, color }) => {
  if (draw <= 0.01) return null;
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: "absolute", inset: "-30px -52px", width: "calc(100% + 104px)", height: "calc(100% + 60px)", overflow: "visible", pointerEvents: "none" }}>
      <ellipse cx={50} cy={30} rx={47} ry={25} fill="none" stroke={color} strokeWidth={2.2} pathLength={1}
        strokeDasharray={1} strokeDashoffset={1 - Math.min(1, draw)} transform="rotate(-3 50 30)" strokeLinecap="round" />
      <ellipse cx={51} cy={31} rx={46} ry={24} fill="none" stroke={color} strokeWidth={1.4} opacity={0.55} pathLength={1}
        strokeDasharray={1} strokeDashoffset={1 - Math.min(1, Math.max(0, draw - 0.12))} transform="rotate(2 50 30)" strokeLinecap="round" />
    </svg>
  );
};

// ---------------------------------------------------------------- stat

const Stat: React.FC<{ block: Extract<VisualBlock, { type: "stat" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const pips = !!block.plain && Number.isInteger(block.value) && block.value >= 2 && block.value <= 12;
  const rule = easeOut((p - 0.1) / 0.5);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block", fontFamily: V("font-display"), fontWeight: 700, fontSize: 210, lineHeight: 0.9, letterSpacing: "-.04em", color: c.accent, whiteSpace: "nowrap" }}>
        {block.prefix ? <span style={{ fontSize: "0.45em", marginRight: 10, verticalAlign: "baseline" }}>{block.prefix}</span> : null}
        <CountNumber value={block.value} from={block.from} p={p / 0.62} plain={block.plain} />
        {block.suffix ? <span style={{ fontSize: "0.45em", marginLeft: 14, verticalAlign: "baseline" }}>{block.suffix}</span> : null}
        {block.circle === true && <AccentCircle draw={(p - 0.66) / 0.32} color={c.ink} />}
      </div>
      {pips && (
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 34 }}>
          {Array.from({ length: block.value }).map((_, i) => {
            const s = backOut((p - 0.18 - i * 0.11) / 0.35);
            return <span key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: c.accent, opacity: clamp01(0.25 + 0.75 * s), transform: `scale(${0.4 + 0.6 * s})` }} />;
          })}
        </div>
      )}
      <div style={{ width: 74, height: 4, background: c.accent, borderRadius: 2, margin: "36px auto 0", transform: `scaleX(${rule})` }} />
      <div style={{ fontFamily: V("font-mono"), fontSize: 28, letterSpacing: ".18em", textTransform: "uppercase", color: c.ink2, marginTop: 22 }}>{block.label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- bars

const LABEL_W = 264, VALUE_W = 148, GAP = 24, ROW_H = 74, BAR_H = 38;

const Bars: React.FC<{ block: Extract<VisualBlock, { type: "bars" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const data = block.data;
  const max = Math.max(...data.map((d) => d.value), 1);
  const segmented = block.style === "segments" && (block.segment ?? 0) > 0;
  return (
    <div style={{ width: 980 }}>
      {block.title && (
        <div style={{ marginBottom: 26 }}>
          <span style={{ fontFamily: V("font-mono"), fontSize: 24, letterSpacing: ".16em", textTransform: "uppercase", color: c.ink2 }}>
            {block.title}{block.unit ? ` · ${block.unit}` : ""}
          </span>
          <div style={{ height: 1, background: a(c.ink, "2E"), marginTop: 14 }} />
        </div>
      )}

      {/* rows live in one strict grid; gridlines + axis span all rows so every
          element sits on the same skeleton (DESIGN LAW: one shared rail) */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: LABEL_W + GAP, right: VALUE_W + GAP, pointerEvents: "none" }}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <div key={f} style={{ position: "absolute", top: 0, bottom: 0, left: `${f * 100}%`, width: 1, background: a(c.ink, "14") }} />
          ))}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 2, background: a(c.ink, "55") }} />
        </div>

        {data.map((d, i) => {
          const grow = easeOut((p - i * 0.11) / 0.55);
          const slide = backOut((p - i * 0.11) / 0.5);
          const frac = d.value / max;
          const hot = block.highlight === i;
          const color = hot ? c.accent : c.ink;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px 1fr ${VALUE_W}px`, columnGap: GAP, alignItems: "center", height: ROW_H, opacity: 0.1 + 0.9 * grow, transform: `translateX(${(1 - slide) * -30}px)` }}>
              <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 29, color, whiteSpace: "nowrap" }}>{d.label}</div>
              <div style={{ position: "relative", height: BAR_H }}>
                <div style={{ position: "absolute", inset: 0, background: a(c.ink, "0F"), borderRadius: 5 }} />
                {segmented ? (
                  <Segments frac={frac} grow={grow} unitFrac={(block.segment as number) / max} color={color} />
                ) : (
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${frac * grow * 100}%`, background: color, borderRadius: 5 }} />
                )}
              </div>
              <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color, opacity: 0.25 + 0.75 * grow }}>
                <CountNumber value={d.value} p={grow} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Discrete increment cells that pop in sequentially — the tactile "counting
 *  in increments" bar style. */
const Segments: React.FC<{ frac: number; grow: number; unitFrac: number; color: string }> = ({ frac, grow, unitFrac, color }) => {
  const cells = Math.max(1, Math.round(frac / unitFrac));
  const filled = cells * grow;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 4 }}>
      {Array.from({ length: cells }).map((_, i) => {
        const s = backOut((filled - i) / 1.2);
        return <div key={i} style={{ width: `calc(${unitFrac * 100}% - 4px)`, flexShrink: 0, background: color, borderRadius: 3, opacity: clamp01(s * 2), transform: `scaleY(${0.4 + 0.6 * s})` }} />;
      })}
    </div>
  );
};

// ---------------------------------------------------------------- line

const LineChart: React.FC<{ block: Extract<VisualBlock, { type: "line" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const pts = block.points, n = pts.length;
  const max = Math.max(...pts.map((d) => d.value)), min = Math.min(...pts.map((d) => d.value), 0);
  const W = 940, H = 400, PAD = 24, BASE = H - PAD;
  const x = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD);
  const y = (val: number) => BASE - ((val - min) / (max - min || 1)) * (H - 2 * PAD);

  const prog = easeOut(p / 0.8) * (n - 1);
  const full = Math.min(n - 1, Math.floor(prog));
  const fracSeg = prog - full;
  const tip = full >= n - 1
    ? { x: x(n - 1), y: y(pts[n - 1].value), v: pts[n - 1].value }
    : {
        x: x(full) + (x(full + 1) - x(full)) * fracSeg,
        y: y(pts[full].value) + (y(pts[full + 1].value) - y(pts[full].value)) * fracSeg,
        v: pts[full].value + (pts[full + 1].value - pts[full].value) * fracSeg,
      };
  const revealed = pts.slice(0, full + 1).map((d, i) => `${x(i)},${y(d.value)}`);
  const lineStr = [...revealed, `${tip.x},${tip.y}`].join(" ");
  const areaStr = `${lineStr} ${tip.x},${BASE} ${PAD},${BASE}`;

  return (
    <div style={{ width: 980 }}>
      {block.title && (
        <div style={{ marginBottom: 22 }}>
          <span style={{ fontFamily: V("font-mono"), fontSize: 24, letterSpacing: ".16em", textTransform: "uppercase", color: c.ink2 }}>
            {block.title}{block.unit ? ` · ${block.unit}` : ""}
          </span>
          <div style={{ height: 1, background: a(c.ink, "2E"), marginTop: 14 }} />
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H + 54}`} width={W} height={H + 54}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} y1={BASE - f * (H - 2 * PAD)} x2={W - PAD} y2={BASE - f * (H - 2 * PAD)} stroke={c.ink} strokeOpacity={0.08} strokeWidth={1} />
        ))}
        <line x1={PAD} y1={BASE} x2={W - PAD} y2={BASE} stroke={c.ink} strokeOpacity={0.33} strokeWidth={2} />
        <polygon points={areaStr} fill={c.accent} fillOpacity={0.13} />
        <polyline points={lineStr} fill="none" stroke={c.accent} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((d, i) => (
          <g key={i} opacity={i <= prog ? 1 : 0}>
            <circle cx={x(i)} cy={y(d.value)} r={5.5} fill={c.accent} />
            <text x={x(i)} y={H + 34} textAnchor="middle" fontFamily={V("font-mono")} fontSize={20} fill={c.ink2}>{d.label}</text>
          </g>
        ))}
        <circle cx={tip.x} cy={tip.y} r={9} fill={c.accent} opacity={p < 0.95 ? 1 : 0} />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- pictogram

/** "K in N" unit chart — a field of dots fills in, then the K highlighted units
 *  pop in accent. The strongest way to show a ratio (e.g. 1 in 40). */
const Pictogram: React.FC<{ block: Extract<VisualBlock, { type: "pictogram" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const total = Math.min(120, block.total), hi = Math.min(block.highlight, total);
  const cols = total <= 20 ? 5 : total <= 60 ? 10 : 12;
  const size = total <= 20 ? 44 : total <= 60 ? 34 : 26, gap = Math.round(size * 0.42);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap, justifyContent: "center" }}>
        {Array.from({ length: total }).map((_, i) => {
          const inP = easeOut((p - i * (0.55 / total)) / 0.25);
          const isHi = i < hi;
          const hiP = backOut((p - 0.62 - i * 0.06) / 0.3);
          return (
            <span key={i} style={{
              width: size, height: size, borderRadius: "50%",
              background: isHi && hiP > 0.02 ? c.accent : a(c.ink, "30"),
              opacity: clamp01(inP),
              transform: `scale(${isHi && hiP > 0.02 ? 0.7 + 0.5 * clamp01(hiP) : 0.6 + 0.4 * inP})`,
            }} />
          );
        })}
      </div>
      <div style={{ fontFamily: V("font-mono"), fontSize: 27, letterSpacing: ".18em", textTransform: "uppercase", color: c.ink2, marginTop: 40 }}>{block.label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- compare

const Compare: React.FC<{ block: Extract<VisualBlock, { type: "compare" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const acc = block.accent ?? 1;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2px 1fr", alignItems: "center", columnGap: 44, width: 980 }}>
      {block.items.map((it, i) => {
        const delay = i * 0.16;
        const hot = acc === i;
        return (
          <div key={i} style={{ textAlign: "center", order: i === 0 ? 0 : 2, opacity: clamp01(easeOut((p - delay) / 0.4)) }}>
            <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 118, lineHeight: 0.9, letterSpacing: "-.035em", color: hot ? c.accent : c.ink, whiteSpace: "nowrap" }}>
              {it.prefix ? <span style={{ fontSize: "0.5em", marginRight: 6 }}>{it.prefix}</span> : null}
              <CountNumber value={it.value} p={(p - delay) / 0.6} plain={it.plain} />
              {it.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 8 }}>{it.suffix}</span> : null}
            </div>
            <div style={{ fontFamily: V("font-mono"), fontSize: 24, letterSpacing: ".16em", textTransform: "uppercase", color: hot ? c.accent : c.ink2, marginTop: 18 }}>{it.label}</div>
          </div>
        );
      })}
      <div style={{ order: 1, height: 170, width: 2, background: a(c.ink, "30"), transform: `scaleY(${easeOut((p - 0.1) / 0.4)})` }} />
    </div>
  );
};

// ---------------------------------------------------------------- timeline

const Timeline: React.FC<{ block: Extract<VisualBlock, { type: "timeline" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const ev = block.events, n = ev.length;
  const W = 940, PAD = 60;
  const x = (i: number) => PAD + (i / Math.max(1, n - 1)) * (W - 2 * PAD);
  const lineP = easeOut(p / 0.55);
  return (
    <div style={{ width: 980 }}>
      {block.title && (
        <div style={{ marginBottom: 34 }}>
          <span style={{ fontFamily: V("font-mono"), fontSize: 24, letterSpacing: ".16em", textTransform: "uppercase", color: c.ink2 }}>{block.title}</span>
          <div style={{ height: 1, background: a(c.ink, "2E"), marginTop: 14 }} />
        </div>
      )}
      <svg viewBox={`0 0 ${W} 230`} width={W} height={230}>
        <line x1={PAD} y1={115} x2={PAD + (W - 2 * PAD) * lineP} y2={115} stroke={c.ink} strokeOpacity={0.4} strokeWidth={2} />
        {ev.map((e, i) => {
          const pop = backOut((p - 0.12 - i * (0.5 / n)) / 0.35);
          const last = i === n - 1;
          if (pop <= 0.02) return null;
          // end labels anchor inward so text can never clip the chart bounds
          const anchor = i === 0 ? "start" : last ? "end" : "middle";
          const tx = i === 0 ? -14 : last ? 14 : 0;
          return (
            <g key={i} transform={`translate(${x(i)},115)`} opacity={clamp01(pop * 1.4)}>
              <circle r={(last ? 11 : 7) * Math.min(1.15, pop)} fill={last ? c.accent : c.ink} />
              <text x={tx} y={-26} textAnchor={anchor} fontFamily={V("font-mono")} fontSize={23} fontWeight={700} fill={last ? c.accent : c.ink}>{e.year}</text>
              <text x={tx} y={44} textAnchor={anchor} fontFamily={V("font-ui")} fontSize={21} fill={c.ink2}>{e.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- quote

const Quote: React.FC<{ block: Extract<VisualBlock, { type: "quote" }>; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const underline = easeOut((p - 0.5) / 0.4);
  return (
    <div style={{ width: 920, position: "relative", paddingLeft: 56 }}>
      <span style={{ position: "absolute", left: -10, top: -34, fontFamily: V("font-display"), fontSize: 150, lineHeight: 1, color: c.accent, opacity: 0.9 * clamp01(easeOut(p / 0.3)) }}>“</span>
      <div style={{ fontFamily: V("font-display"), fontStyle: "italic", fontWeight: 600, fontSize: 55, lineHeight: 1.28, color: c.ink, opacity: clamp01(easeOut(p / 0.45)) }}>{block.text}</div>
      {block.attribution && (
        <div style={{ marginTop: 26, opacity: clamp01(underline * 1.6) }}>
          <span style={{ fontFamily: V("font-mono"), fontSize: 24, letterSpacing: ".12em", textTransform: "uppercase", color: c.ink2 }}>— {block.attribution}</span>
          <div style={{ width: 120, height: 3, background: c.accent, borderRadius: 2, marginTop: 12, transform: `scaleX(${underline})`, transformOrigin: "left" }} />
        </div>
      )}
    </div>
  );
};
