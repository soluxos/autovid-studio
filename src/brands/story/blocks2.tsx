import React from "react";
import type { VisualBlock } from "./doc-types";
import { CountNumber, clamp01, easeOut, backOut, V, a, type BlockColors } from "./blocks";

// The expanded block library (Phase D of docs/BRAND-SYSTEM.md), split from
// blocks.tsx purely for file size. The same design laws apply to every block:
// zero layout shift (CountNumber for every animating number, fixed slots),
// translate+opacity entrances only on text (never scaled), backOut landings,
// end labels anchored inward so nothing ever clips, one shared skeleton per
// chart, everything drawn by us inside the 980px stage.

type B<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

/** Shared chart header: mono title · unit over a hairline rule (same skeleton
 *  as Bars/Line, so every chart in a story reads as one system). */
export const Header: React.FC<{ title?: string; unit?: string; c: BlockColors; right?: React.ReactNode }> = ({ title, unit, c, right }) =>
  !title && !right ? null : (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: V("font-mono"), fontSize: 24, letterSpacing: ".16em", textTransform: "uppercase", color: c.ink2 }}>
          {title ?? ""}{title && unit ? ` · ${unit}` : ""}
        </span>
        {right}
      </div>
      <div style={{ height: 1, background: a(c.ink, "2E"), marginTop: 14 }} />
    </div>
  );

export const MONO_LABEL: React.CSSProperties = { fontFamily: "var(--font-mono)", letterSpacing: ".16em", textTransform: "uppercase" };

// ---------------------------------------------------------------- ranking

const RANK_NUM_W = 92, RANK_VAL_W = 168, RANK_GAP = 24, RANK_ROW_H = 92;

/** Ordered list with rank numerals; rows slide-land staggered, #1 accented.
 *  variant 0: big display numerals · variant 1: circled rank badges. */
export const Ranking: React.FC<{ block: B<"ranking">; p: number; c: BlockColors }> = ({ block, p, c }) => (
  <div style={{ width: 980 }}>
    <Header title={block.title} unit={block.unit} c={c} />
    {block.items.map((it, i) => {
      const slide = backOut((p - i * 0.11) / 0.5);
      const grow = easeOut((p - i * 0.11) / 0.55);
      const hot = i === 0;
      const color = hot ? c.accent : c.ink;
      return (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: `${RANK_NUM_W}px 1fr ${RANK_VAL_W}px`, columnGap: RANK_GAP,
          alignItems: "center", height: RANK_ROW_H, opacity: 0.1 + 0.9 * grow, transform: `translateX(${(1 - slide) * -34}px)`,
          borderBottom: i < block.items.length - 1 ? `1px solid ${a(c.ink, "1A")}` : "none",
        }}>
          {block.variant === 1 ? (
            <span style={{
              justifySelf: "center", width: 58, height: 58, borderRadius: "50%", boxSizing: "border-box",
              border: `2.5px solid ${color}`, background: hot ? color : "transparent", color: hot ? V("accent-ink") : color,
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27,
            }}>{i + 1}</span>
          ) : (
            <span style={{ textAlign: "right", fontFamily: V("font-display"), fontWeight: 700, fontSize: 54, lineHeight: 1, color, opacity: hot ? 1 : 0.45 }}>{i + 1}</span>
          )}
          <div style={{ fontFamily: V("font-ui"), fontWeight: hot ? 700 : 600, fontSize: 33, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
          <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 28, color, whiteSpace: "nowrap" }}>
            {it.value != null && <><CountNumber value={it.value} p={grow} />{it.suffix ?? ""}</>}
          </div>
        </div>
      );
    })}
  </div>
);

// ---------------------------------------------------------------- donut

/** Share-of-whole ring drawing on, percent counted in the centre.
 *  variant 0: centred, label below · variant 1: ring left, legend right. */
export const Donut: React.FC<{ block: B<"donut">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const frac = clamp01(block.value / 100);
  const draw = easeOut(p / 0.7);
  const R = 152, SW = 46;
  const ring = (
    <div style={{ position: "relative", width: 400, height: 400, flexShrink: 0 }}>
      <svg viewBox="0 0 400 400" width={400} height={400}>
        <circle cx={200} cy={200} r={R} fill="none" stroke={a(c.ink, "14")} strokeWidth={SW} />
        <circle cx={200} cy={200} r={R} fill="none" stroke={c.accent} strokeWidth={SW} strokeLinecap="round" pathLength={1}
          strokeDasharray={`${Math.max(0.001, frac * draw)} 1`} transform="rotate(-90 200 200)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 86, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
          <CountNumber value={block.value} p={draw} /><span style={{ fontSize: "0.5em" }}>%</span>
        </span>
      </div>
    </div>
  );
  if (block.variant === 1) {
    const legend = [
      { swatch: c.accent, label: block.label, value: block.value },
      { swatch: a(c.ink, "30"), label: block.rest ?? "everything else", value: 100 - block.value },
    ];
    return (
      <div style={{ width: 980, display: "flex", alignItems: "center", gap: 56 }}>
        {ring}
        <div style={{ flex: 1, minWidth: 0 }}>
          {legend.map((l, i) => {
            const s = easeOut((p - 0.25 - i * 0.14) / 0.4);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr 120px", columnGap: 20, alignItems: "center", height: 84, opacity: clamp01(s), transform: `translateX(${(1 - s) * 26}px)`, borderBottom: i === 0 ? `1px solid ${a(c.ink, "1A")}` : "none" }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: l.swatch }} />
                <span style={{ fontFamily: V("font-ui"), fontWeight: i === 0 ? 700 : 600, fontSize: 29, color: i === 0 ? c.accent : c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.label}</span>
                <span style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color: i === 0 ? c.accent : c.ink2, whiteSpace: "nowrap" }}>
                  <CountNumber value={l.value} p={draw} />%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-block" }}>{ring}</div>
      <div style={{ ...MONO_LABEL, fontSize: 27, color: c.ink2, marginTop: 26 }}>{block.label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- bigpercent

/** A huge percentage over a fill bar that fills in sync with the count.
 *  variant 0: vertical column behind the number · variant 1: horizontal band. */
export const BigPercent: React.FC<{ block: B<"bigpercent">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const grow = easeOut(p / 0.62);
  const fill = clamp01(block.value / 100) * grow;
  const num = (size: number) => (
    <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: size, lineHeight: 0.9, letterSpacing: "-.04em", color: c.accent, whiteSpace: "nowrap" }}>
      <CountNumber value={block.value} p={grow} /><span style={{ fontSize: "0.45em", marginLeft: 8 }}>%</span>
    </span>
  );
  if (block.variant === 1) {
    return (
      <div style={{ width: 980, textAlign: "center" }}>
        <div style={{ position: "relative", height: 300, borderRadius: 16, background: a(c.ink, "0D"), overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: a(c.accent, "26") }}>
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, background: c.accent }} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{num(190)}</div>
        </div>
        <div style={{ ...MONO_LABEL, fontSize: 27, color: c.ink2, marginTop: 30 }}>{block.label}</div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: 980, height: 660 }}>
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 0, width: 360, height: 560, borderRadius: 16, background: a(c.ink, "0D"), overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${fill * 100}%`, background: a(c.accent, "26") }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, background: c.accent }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 560, display: "flex", alignItems: "center", justifyContent: "center" }}>{num(210)}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", ...MONO_LABEL, fontSize: 27, color: c.ink2 }}>{block.label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- steps

/** 2-5 step flow: numbered circles on a drawing line, sequential pops.
 *  variant 0: horizontal · variant 1: vertical list with labels beside. */
export const Steps: React.FC<{ block: B<"steps">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const steps = block.steps.slice(0, 5);
  const n = steps.length;
  if (block.variant === 1) {
    const ROW = 118, CIRC = 68, lineP = easeOut((p - 0.05) / 0.55);
    return (
      <div style={{ width: 860 }}>
        <Header title={block.title} c={c} />
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: CIRC / 2 - 1, top: ROW / 2, width: 2, height: (n - 1) * ROW * lineP, background: a(c.ink, "40") }} />
          {steps.map((s, i) => {
            const pop = backOut((p - 0.1 - i * (0.55 / n)) / 0.35);
            const last = i === n - 1;
            return (
              <div key={i} style={{ position: "relative", display: "grid", gridTemplateColumns: `${CIRC}px 1fr`, columnGap: 30, alignItems: "center", height: ROW, opacity: clamp01(pop * 1.4), transform: `translateY(${(1 - clamp01(pop)) * 18}px)` }}>
                <span style={{ width: CIRC, height: CIRC, borderRadius: "50%", boxSizing: "border-box", background: last ? c.accent : V("paper"), border: `2.5px solid ${last ? c.accent : a(c.ink, "8C")}`, color: last ? V("accent-ink") : c.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 29 }}>{i + 1}</span>
                <span style={{ fontFamily: V("font-ui"), fontWeight: last ? 700 : 600, fontSize: 32, color: last ? c.accent : c.ink }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const W = 940, PAD = 96, CY = 76, R = 36;
  const x = (i: number) => PAD + (i / Math.max(1, n - 1)) * (W - 2 * PAD);
  const lineP = easeOut(p / 0.55);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <svg viewBox={`0 0 ${W} 226`} width={W} height={226}>
        <line x1={PAD} y1={CY} x2={PAD + (W - 2 * PAD) * lineP} y2={CY} stroke={c.ink} strokeOpacity={0.4} strokeWidth={2.5} />
        {steps.map((s, i) => {
          const pop = backOut((p - 0.1 - i * (0.55 / n)) / 0.35);
          const last = i === n - 1;
          if (pop <= 0.02) return null;
          // end labels anchor inward so text can never clip the stage
          const anchor = i === 0 ? "start" : last ? "end" : "middle";
          const tx = i === 0 ? -R - 4 : last ? R + 4 : 0;
          return (
            <g key={i} transform={`translate(${x(i)},${CY})`} opacity={clamp01(pop * 1.4)}>
              <circle r={R * Math.min(1.12, pop)} fill={last ? c.accent : V("paper")} stroke={last ? c.accent : a(c.ink, "8C")} strokeWidth={2.5} />
              <text y={11} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={30} fill={last ? V("accent-ink") : c.ink}>{i + 1}</text>
              {/* alternate label rows so adjacent labels can never collide */}
              <text x={tx} y={R + 44 + (i % 2) * 36} textAnchor={anchor} fontFamily={V("font-ui")} fontWeight={last ? 700 : 600} fontSize={23} fill={last ? c.accent : c.ink2}>{s}</text>
              {i % 2 === 1 && <line x1={0} y1={R + 6} x2={0} y2={R + 52} stroke={a(c.ink, "30")} strokeWidth={1} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- scale

/** "One X equals N units": one accent square vs a counted grid of ink units
 *  with a × multiplier. variant 0: side by side · variant 1: stacked. */
export const Scale: React.FC<{ block: B<"scale">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const count = Math.min(60, Math.max(1, Math.round(block.count)));
  const stacked = block.variant === 1;
  const gridW = stacked ? 760 : 520;
  const cols = count <= 10 ? Math.min(count, 5) : count <= 24 ? 8 : 10;
  const rows = Math.ceil(count / cols);
  const size = Math.max(22, Math.min(52, Math.floor((gridW - (cols - 1) * 10) / cols), Math.floor((300 - (rows - 1) * 10) / rows)));
  const onePop = backOut(p / 0.4);
  const one = (
    <div style={{ textAlign: "center", flexShrink: 0 }}>
      <div style={{ width: 132, height: 132, borderRadius: 14, background: c.accent, margin: "0 auto", opacity: clamp01(onePop * 2), transform: `scale(${0.5 + 0.5 * onePop})` }} />
      <div style={{ ...MONO_LABEL, fontSize: 23, color: c.accent, marginTop: 18, whiteSpace: "nowrap" }}>{block.one}</div>
    </div>
  );
  const eq = <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 84, color: c.ink2, opacity: clamp01(easeOut((p - 0.18) / 0.3)), lineHeight: 1 }}>=</div>;
  const grid = (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: 10, justifyContent: "center" }}>
        {Array.from({ length: count }).map((_, i) => {
          const s = backOut((p - 0.3 - i * (0.5 / count)) / 0.3);
          return <span key={i} style={{ width: size, height: size, borderRadius: Math.max(4, size * 0.14), background: a(c.ink, "BF"), opacity: clamp01(s * 2), transform: `scale(${0.5 + 0.5 * clamp01(s)})` }} />;
        })}
      </div>
      <div style={{ marginTop: 22, fontFamily: V("font-mono"), fontWeight: 700, fontSize: 34, color: c.ink, whiteSpace: "nowrap" }}>
        × <CountNumber value={count} p={easeOut((p - 0.3) / 0.55)} plain />
        <span style={{ ...MONO_LABEL, fontSize: 23, color: c.ink2, marginLeft: 14 }}>{block.unit}</span>
      </div>
    </div>
  );
  return stacked ? (
    <div style={{ width: 980, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>{one}{eq}{grid}</div>
  ) : (
    <div style={{ width: 980, display: "flex", alignItems: "center", justifyContent: "center", gap: 48 }}>{one}{eq}{grid}</div>
  );
};

// ---------------------------------------------------------------- iceberg

/** Visible vs hidden: a drawing waterline, a small accent block above it and a
 *  large ink block revealing DOWNWARD below it; heights ∝ values. Labels sit in
 *  a fixed side column (variant 0 right, variant 1 left) so nothing shifts. */
export const Iceberg: React.FC<{ block: B<"iceberg">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const av = Math.max(0.0001, block.above.value), bv = Math.max(0.0001, block.below.value);
  const unit = 520 / (av + bv);
  const aH = Math.max(76, Math.min(280, av * unit));
  const bH = Math.max(140, Math.min(430, bv * unit));
  const BW = 430;
  const left = block.variant === 1;                     // labels-left, blocks-right
  const blockX = left ? 980 - 40 - BW : 40;
  const lineP = easeOut(p / 0.45);
  const slide = backOut((p - 0.12) / 0.5);              // above block lands
  const growB = easeOut((p - 0.42) / 0.55);             // below block reveals downward
  // the above block can be short, so its label anchors its BOTTOM to the
  // waterline (never centred into it); the below block is always tall enough
  // to centre on. Fixed slots — no label can ever touch the line.
  const label = (part: B<"iceberg">["above"], color: string, anchor: { centerY?: number; bottomAboveLine?: boolean }, delay: number) => {
    const s = easeOut((p - delay) / 0.4);
    const pos = anchor.bottomAboveLine
      ? { top: aH - 22, transform: `translateY(-100%) translateX(${(1 - s) * (left ? -26 : 26)}px)` }
      : { top: anchor.centerY, transform: `translateY(-50%) translateX(${(1 - s) * (left ? -26 : 26)}px)` };
    return (
      <div style={{
        position: "absolute", ...pos,
        opacity: clamp01(s), ...(left ? { left: 40, width: 980 - BW - 130, textAlign: "right" as const } : { right: 40, width: 980 - BW - 130, textAlign: "left" as const }),
      }}>
        <div style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 40, color, whiteSpace: "nowrap" }}>
          <CountNumber value={part.value} p={easeOut((p - delay) / 0.6)} />{part.suffix ?? ""}
        </div>
        <div style={{ ...MONO_LABEL, fontSize: 22, color: c.ink2, marginTop: 8 }}>{part.label}</div>
      </div>
    );
  };
  return (
    <div style={{ position: "relative", width: 980, height: aH + bH + 4 }}>
      {/* above the waterline: lands from above, bottom edge fixed to the line */}
      <div style={{ position: "absolute", left: blockX, width: BW, top: 0, height: aH - 8, borderRadius: "12px 12px 4px 4px", background: c.accent, opacity: clamp01(slide * 1.6), transform: `translateY(${(1 - clamp01(slide)) * -26}px)` }} />
      {/* waterline draws across the full stage */}
      <div style={{ position: "absolute", left: 0, top: aH, width: 980 * lineP, borderTop: `3px dashed ${a(c.ink, "73")}` }} />
      {block.waterline && (
        <div style={{ position: "absolute", top: aH + 10, ...(left ? { left: 8 } : { right: 8 }), ...MONO_LABEL, fontSize: 19, color: c.ink2, opacity: clamp01(lineP * 1.4) }}>{block.waterline}</div>
      )}
      {/* below: reveals downward (rect scales, text never does) */}
      <div style={{ position: "absolute", left: blockX, width: BW, top: aH + 8, height: bH * clamp01(growB), borderRadius: "4px 4px 12px 12px", background: a(c.ink, "E0") }} />
      {label(block.above, c.accent, { bottomAboveLine: true }, 0.2)}
      {label(block.below, c.ink, { centerY: aH + 8 + bH / 2 }, 0.5)}
    </div>
  );
};

// ---------------------------------------------------------------- waterfall

/** 3-6 signed deltas stepping to a total; bars land sequentially with dashed
 *  carry-over connectors; the final total bar is accented. variant 0 keeps a
 *  running-total readout in the header; variant 1 labels the total bar. */
export const Waterfall: React.FC<{ block: B<"waterfall">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const data = block.data.slice(0, 6);
  const cum = [0]; data.forEach((d) => cum.push(cum[cum.length - 1] + d.value));
  const total = cum[cum.length - 1];
  const bars = [
    ...data.map((d, i) => ({ label: d.label, from: cum[i], to: cum[i + 1], delta: d.value, isTotal: false })),
    { label: block.totalLabel ?? "Total", from: 0, to: total, delta: total, isTotal: true },
  ];
  const n = bars.length, step = 0.62 / n;
  const lo = Math.min(0, ...cum), hi = Math.max(0, ...cum);
  const W = 940, H = 430, PADX = 16, TOP = 64, BASE = H - 60;
  const y = (v: number) => BASE - ((v - lo) / (hi - lo || 1)) * (BASE - TOP);
  const slot = (W - 2 * PADX) / n, bw = Math.min(104, slot * 0.6);
  const x = (i: number) => PADX + slot * i + (slot - bw) / 2;
  // running-total readout: animates cum[k] -> cum[k+1] as bar k lands
  let k = 0;
  for (let i = 0; i < data.length; i++) if (p >= 0.06 + i * step) k = i;
  const segP = easeOut((p - 0.06 - k * step) / 0.3);
  const readout = block.variant !== 1 && (
    <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color: c.accent, whiteSpace: "nowrap" }}>
      <span style={{ ...MONO_LABEL, fontSize: 19, color: c.ink2, marginRight: 14 }}>running</span>
      <span style={{ display: "inline-block", width: 170, textAlign: "right" }}>
        <CountNumber value={cum[k + 1]} from={cum[k]} p={segP} />{block.unit ? ` ${block.unit}` : ""}
      </span>
    </span>
  );
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.title ? block.unit : undefined} c={c} right={readout || undefined} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <line x1={PADX} y1={y(0)} x2={W - PADX} y2={y(0)} stroke={c.ink} strokeOpacity={0.33} strokeWidth={2} />
        {bars.map((b, i) => {
          const gi = easeOut((p - 0.06 - i * step) / 0.3);
          if (gi <= 0.001) return null;
          const end = b.from + (b.to - b.from) * gi;
          const yA = y(b.from), yB = y(end);
          const rTop = Math.min(yA, yB), rH = Math.max(2, Math.abs(yA - yB));
          const fill = b.isTotal ? c.accent : b.delta >= 0 ? c.ink : a(c.ink, "59");
          const dTxt = b.isTotal ? "" : `${b.delta >= 0 ? "+" : "−"}${Math.abs(Math.round(b.delta)).toLocaleString()}`;
          const labY = Math.min(yA, y(b.to)) - 14;
          return (
            <g key={i}>
              {i > 0 && !b.isTotal && (
                <line x1={x(i - 1) + bw} y1={y(bars[i - 1].to)} x2={x(i)} y2={y(bars[i - 1].to)} stroke={c.ink} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="5 5" opacity={clamp01(gi * 2)} />
              )}
              <rect x={x(i)} y={rTop} width={bw} height={rH} rx={5} fill={fill} />
              <text x={x(i) + bw / 2} y={labY} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={22}
                fill={b.isTotal ? c.accent : b.delta >= 0 ? c.ink : c.ink2} opacity={clamp01((gi - 0.5) * 3)}>
                {b.isTotal ? (block.variant === 1 ? Math.round(b.to).toLocaleString() : "") : dTxt}
              </text>
              <text x={x(i) + bw / 2} y={BASE + 38} textAnchor="middle" fontFamily={V("font-mono")} fontSize={20}
                fill={b.isTotal ? c.accent : c.ink2} fontWeight={b.isTotal ? 700 : 400} opacity={clamp01(gi * 2)}>{b.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- dotstrip

/** One horizontal strip of N dots with the first K accented and a drawing
 *  bracket + label on the accent span. variant 0: bracket above · 1: below. */
export const DotStrip: React.FC<{ block: B<"dotstrip">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const total = Math.min(30, Math.max(2, block.total)), hi = Math.min(block.highlight, total);
  const gap = 12, size = Math.min(46, Math.floor((940 - (total - 1) * gap) / total));
  const stripW = total * size + (total - 1) * gap;
  const spanW = hi * size + (hi - 1) * gap;
  const below = block.variant === 1;
  const brDraw = easeOut((p - 0.55) / 0.35);
  const bracket = (
    <div style={{ position: "relative", height: 86 }}>
      <svg viewBox={`0 0 ${stripW} 20`} width={stripW} height={20} style={{ position: "absolute", left: 0, [below ? "top" : "bottom"]: 0, overflow: "visible" }}>
        <path d={below ? `M1,2 v10 h${spanW - 2} v-10` : `M1,18 v-10 h${spanW - 2} v10`}
          fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" pathLength={1}
          strokeDasharray={1} strokeDashoffset={1 - clamp01(brDraw)} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, [below ? "top" : "bottom"]: 30, textAlign: "left", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 26, letterSpacing: ".08em", color: c.accent, opacity: clamp01((brDraw - 0.3) * 2.2), transform: `translateY(${(1 - clamp01(brDraw)) * (below ? -8 : 8)}px)` }}>
        {block.label}
      </div>
    </div>
  );
  return (
    <div style={{ width: stripW }}>
      {!below && bracket}
      <div style={{ display: "flex", gap, margin: "14px 0" }}>
        {Array.from({ length: total }).map((_, i) => {
          const inP = easeOut((p - i * (0.45 / total)) / 0.22);
          const isHi = i < hi;
          const hiP = backOut((p - 0.5 - i * 0.05) / 0.28);
          return <span key={i} style={{
            width: size, height: size, borderRadius: "50%",
            background: isHi && hiP > 0.02 ? c.accent : a(c.ink, "30"),
            opacity: clamp01(inP), transform: `scale(${isHi && hiP > 0.02 ? 0.7 + 0.5 * clamp01(hiP) : 0.6 + 0.4 * inP})`,
          }} />;
        })}
      </div>
      {below && bracket}
    </div>
  );
};

// ---------------------------------------------------------------- sparkrow

const SPARK_LABEL_W = 240, SPARK_VAL_W = 170, SPARK_GAP = 28, SPARK_ROW_H = 104, SPARK_W = 980 - SPARK_LABEL_W - SPARK_VAL_W - 2 * SPARK_GAP, SPARK_H = 64;

/** 2-4 rows of label + drawing sparkline + counted end value, staggered.
 *  variant 0: stroke only · variant 1: soft area fill under each line. */
export const SparkRow: React.FC<{ block: B<"sparkrow">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rows = block.rows.slice(0, 4);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      {rows.map((r, i) => {
        const grow = easeOut((p - i * 0.13) / 0.6);
        const slide = backOut((p - i * 0.13) / 0.5);
        const hot = block.highlight == null || block.highlight === i;
        const stroke = hot ? c.accent : a(c.ink, "8C");
        const vals = r.values, m = vals.length;
        const vmax = Math.max(...vals), vmin = Math.min(...vals);
        const sx = (j: number) => 4 + (j / Math.max(1, m - 1)) * (SPARK_W - 8);
        const sy = (v: number) => 6 + (1 - (v - vmin) / (vmax - vmin || 1)) * (SPARK_H - 12);
        // reveal like the line chart: interpolate a moving tip along the points
        const prog = grow * (m - 1);
        const full = Math.min(m - 1, Math.floor(prog)), fs = prog - full;
        const tip = full >= m - 1
          ? { x: sx(m - 1), y: sy(vals[m - 1]) }
          : { x: sx(full) + (sx(full + 1) - sx(full)) * fs, y: sy(vals[full]) + (sy(vals[full + 1]) - sy(vals[full])) * fs };
        const pts = [...vals.slice(0, full + 1).map((v, j) => `${sx(j)},${sy(v)}`), `${tip.x},${tip.y}`].join(" ");
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `${SPARK_LABEL_W}px ${SPARK_W}px ${SPARK_VAL_W}px`, columnGap: SPARK_GAP, alignItems: "center", height: SPARK_ROW_H, opacity: 0.1 + 0.9 * grow, transform: `translateX(${(1 - slide) * -30}px)`, borderBottom: i < rows.length - 1 ? `1px solid ${a(c.ink, "14")}` : "none" }}>
            <div style={{ textAlign: "right", fontFamily: V("font-ui"), fontWeight: hot && block.highlight != null ? 700 : 600, fontSize: 29, color: hot ? c.ink : c.ink2, whiteSpace: "nowrap" }}>{r.label}</div>
            <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H}>
              <line x1={0} y1={SPARK_H - 1} x2={SPARK_W} y2={SPARK_H - 1} stroke={c.ink} strokeOpacity={0.14} strokeWidth={1} />
              {block.variant === 1 && grow > 0.01 && (
                <polygon points={`${pts} ${tip.x},${SPARK_H - 1} ${sx(0)},${SPARK_H - 1}`} fill={stroke} fillOpacity={0.14} />
              )}
              {grow > 0.01 && <polyline points={pts} fill="none" stroke={stroke} strokeWidth={hot ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" />}
              {grow > 0.01 && <circle cx={tip.x} cy={tip.y} r={5.5} fill={stroke} />}
            </svg>
            <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 28, color: hot ? c.accent : c.ink2, whiteSpace: "nowrap" }}>
              <CountNumber value={r.value ?? vals[m - 1]} p={grow} />{r.suffix ?? ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- definition

/** Dictionary-style card: display word, mono phonetic, numbered definition,
 *  accent underline drawing on. variant 0: left-aligned · 1: centred. */
export const Definition: React.FC<{ block: B<"definition">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const center = block.variant === 1;
  const wordSize = block.word.length > 12 ? 78 : 112;
  const seg = (delay: number) => ({ opacity: clamp01(easeOut((p - delay) / 0.4)), transform: `translateY(${(1 - easeOut((p - delay) / 0.4)) * 22}px)` });
  const underline = easeOut((p - 0.3) / 0.4);
  return (
    <div style={{ width: 880, textAlign: center ? "center" : "left" }}>
      <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: wordSize, lineHeight: 1, letterSpacing: "-.03em", color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...seg(0) }}>{block.word}</div>
      <div style={{ width: 190, height: 5, background: c.accent, borderRadius: 3, margin: center ? "26px auto 0" : "26px 0 0", transform: `scaleX(${clamp01(underline)})`, transformOrigin: center ? "center" : "left" }} />
      {(block.phonetic || block.pos) && (
        <div style={{ marginTop: 24, ...seg(0.14) }}>
          {block.phonetic && <span style={{ fontFamily: V("font-mono"), fontSize: 30, color: c.ink2 }}>{block.phonetic}</span>}
          {block.phonetic && block.pos && <span style={{ color: a(c.ink, "40"), margin: "0 18px", fontSize: 30 }}>·</span>}
          {block.pos && <span style={{ fontFamily: V("font-ui"), fontStyle: "italic", fontSize: 30, color: c.ink2 }}>{block.pos}</span>}
        </div>
      )}
      <div style={{ marginTop: 34, display: center ? "block" : "grid", gridTemplateColumns: center ? undefined : "58px 1fr", ...seg(0.3) }}>
        <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 36, color: c.accent, lineHeight: 1.4, ...(center ? { marginRight: 18 } : {}) }}>{block.num ?? 1}.</span>
        <span style={{ fontFamily: V("font-ui"), fontSize: 35, lineHeight: 1.42, color: c.ink }}>{block.def}</span>
      </div>
    </div>
  );
};
