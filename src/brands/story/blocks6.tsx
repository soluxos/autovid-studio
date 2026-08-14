import React from "react";
import type { VisualBlock } from "./doc-types";
import { CountNumber, clamp01, easeOut, backOut, V, a, type BlockColors } from "./blocks";
import { Header, MONO_LABEL } from "./blocks2";
import { trunc } from "./blocks3";
import { contrastRatio } from "./a11y";

// Block library wave 4: DEMONSTRATION blocks. Every other block in this library
// DESCRIBES data (charts, stats, cards); these SHOW a concept happening — a
// pointer travelling to a target, a form failing then passing, layers peeling
// apart, a menu welded to the screen edge. Reusable across video types (UX,
// product, science, process); everything drawn by us, coloured from tokens.
//
// Same design laws as the rest of the library: zero layout shift (every readout
// lives in a FIXED slot or reserved column, CountNumber for every animating
// number), translate+opacity entrances on text (never scaled), backOut
// landings, long labels ellipsised or truncated, nothing clipping the 980px
// stage. ONLY pointers, ripples, arrows and drawn art move freely — text never
// does. No decoration motif here repeats another block's (no accent circle).

type B<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

const ELLIPSIS: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
/** two-line safe clamp for prose slots (fixed height reserved by the caller) */
const CLAMP2: React.CSSProperties = { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" };
/** staggered translate+opacity entrance (the only legal text entrance) */
const rise = (p: number, delay: number, dist = 18): React.CSSProperties => {
  const e = easeOut((p - delay) / 0.45);
  return { opacity: clamp01(e), transform: `translateY(${(1 - e) * dist}px)` };
};

/** Counting readout with decimals (CountNumber is integer-only). Same
 *  zero-layout-shift trick: the final string reserves the width invisibly. */
const CountFixed: React.FC<{ value: number; p: number; digits?: number; style?: React.CSSProperties }> = ({ value, p, digits = 1, style }) => {
  const v = value * easeOut(clamp01(p));
  return (
    <span style={{ position: "relative", display: "inline-block", fontVariantNumeric: "tabular-nums", ...style }}>
      <span style={{ visibility: "hidden" }}>{value.toFixed(digits)}</span>
      <span style={{ position: "absolute", top: 0, right: 0 }}>{v.toFixed(digits)}</span>
    </span>
  );
};

// ---------------------------------------------------------------- shared art

/** The mouse pointer — tip anchored at (x,y) so it lands exactly on target. */
const POINTER_D = "M0 0 L0 31 L8.4 24 L13.4 34.6 L19 31.9 L14 21.5 L23.4 21 Z";
const Pointer: React.FC<{ x: number; y: number; c: BlockColors; opacity?: number }> = ({ x, y, c, opacity = 1 }) => (
  <g transform={`translate(${x} ${y})`} opacity={opacity}>
    <path d={POINTER_D} fill={c.ink} stroke={V("paper")} strokeWidth={2.6} strokeLinejoin="round" />
  </g>
);

/** Click ripple — two rings expanding out of the landing point. */
const Ripple: React.FC<{ x: number; y: number; t: number; color: string; r0?: number }> = ({ x, y, t, color, r0 = 12 }) => {
  if (t <= 0) return null;
  return (
    <>
      {[0, 0.3].map((d, i) => {
        const q = clamp01((t - d) / 0.7);
        if (q <= 0 || q >= 1) return null;
        return <circle key={i} cx={x} cy={y} r={r0 + 40 * easeOut(q)} fill="none" stroke={color} strokeWidth={4 * (1 - q)} opacity={0.9 * (1 - q)} />;
      })}
    </>
  );
};

/** Arrowhead triangle pointing along `deg` with its tip at (x,y). */
const head = (x: number, y: number, deg: number, s = 13) => {
  const r = (d: number) => (d * Math.PI) / 180;
  return `M ${x} ${y} L ${x - s * Math.cos(r(deg - 24))} ${y - s * Math.sin(r(deg - 24))} L ${x - s * Math.cos(r(deg + 24))} ${y - s * Math.sin(r(deg + 24))} Z`;
};

/** A numbered badge (used by gazepath / sequence / stack lists). */
const Badge: React.FC<{ x: number; y: number; n: number; c: BlockColors; on: boolean; r?: number }> = ({ x, y, n, c, on, r = 21 }) => (
  <g opacity={on ? 1 : 0}>
    <circle cx={x} cy={y} r={r} fill={c.accent} stroke={V("paper")} strokeWidth={3} />
    <text x={x} y={y + r * 0.35} textAnchor="middle" fontFamily={V("font-mono")} fontWeight={700} fontSize={r * 0.95} fill={V("accent-ink")}>{n}</text>
  </g>
);

/** Fixed caption strip under a demo — never floats over the art. */
const Note: React.FC<{ text?: string; c: BlockColors; p: number; width?: number; top: number; delay?: number }> = ({ text, c, p, width = 720, top, delay = 0.5 }) =>
  text ? (
    <div style={{ position: "absolute", top, left: (980 - width) / 2, width, height: 76, textAlign: "center", ...MONO_LABEL, fontSize: 20, lineHeight: 1.5, color: c.ink2, ...CLAMP2, ...rise(p, delay) }}>{text}</div>
  ) : null;

// ---------------------------------------------------------------- cursorpath

const DEFAULT_RUNS = [
  { label: "Small target, far away", targetSize: 10, distance: 100, ms: 1137 },
  { label: "Big target, close by", targetSize: 64, distance: 62, ms: 706 },
];

/** THE hero demo: a pointer travels from a start dot to a target and lands with
 *  a click ripple. Up to two runs play as stacked lanes IN SEQUENCE, each lane
 *  taking screen-time in proportion to its modelled `ms` — so you literally see
 *  the small far target take longer. Times count in a fixed right-hand column.
 *  variant 0: free-standing targets · variant 1: targets welded to a screen
 *  edge (the "infinite target" — the pointer slams into the wall and stops). */
export const CursorPath: React.FC<{ block: B<"cursorpath">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const runs = (block.runs?.length ? block.runs : DEFAULT_RUNS).slice(0, 2);
  const welded = block.variant === 1;
  const maxSize = Math.max(...runs.map((r) => r.targetSize ?? 40), 1);
  const maxDist = Math.max(...runs.map((r) => r.distance ?? 100), 1);
  const totalMs = runs.reduce((s, r) => s + (r.ms ?? 700), 0) || 1;

  // lane windows: proportional to ms, run one after the other
  const SPAN = 0.9, GAP = 0.05;
  let acc = 0.02;
  const win = runs.map((r) => {
    const w = (SPAN - GAP * (runs.length - 1)) * ((r.ms ?? 700) / totalMs);
    const s = acc; acc += w + GAP;
    return { s, e: s + w };
  });

  const LANE = 224, X0 = 44, WALL = 906, TRACK = 132;
  const H = runs.length * LANE + (block.label ? 66 : 0);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit ?? "milliseconds"} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {runs.map((r, i) => {
            const w = win[i];
            const q = clamp01((p - w.s) / Math.max(0.02, w.e - w.s));
            const size = Math.max(34, ((r.targetSize ?? 40) / maxSize) * 122);
            const dfrac = (r.distance ?? maxDist) / maxDist;
            const cx = welded ? WALL - size / 2 : X0 + dfrac * 740;
            const y = i * LANE + TRACK;
            const px = X0 + (cx - X0) * easeOut(q);
            const lit = clamp01((p - w.e) * 6);
            return (
              <g key={i}>
                {/* the rail every lane shares */}
                <line x1={X0} y1={y} x2={welded ? WALL : cx + size / 2} y2={y} stroke={c.ink} strokeOpacity={0.16} strokeWidth={3} strokeLinecap="round" />
                {/* travelled trail */}
                <line x1={X0} y1={y} x2={px} y2={y} stroke={c.accent} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="7 8" strokeLinecap="round" />
                {/* screen edge wall (variant 1) — the pointer cannot pass it */}
                {welded && <rect x={WALL} y={y - 78} width={14} height={156} rx={4} fill={a(c.ink, "D9")} />}
                {/* the target */}
                <rect x={cx - size / 2} y={y - size / 2} width={size} height={size} rx={Math.min(12, size / 4)}
                  fill={lit > 0.02 ? c.accent : a(c.ink, "12")} stroke={lit > 0.02 ? c.accent : a(c.ink, "59")}
                  strokeWidth={2.5} strokeDasharray={lit > 0.02 ? undefined : "8 7"} />
                {/* start dot */}
                <circle cx={X0} cy={y} r={11} fill={V("paper")} stroke={a(c.ink, "8C")} strokeWidth={4} />
                <Ripple x={cx} y={y} t={(p - w.e) / 0.55} color={c.accent} r0={size / 2} />
                {q > 0.001 && <Pointer x={px} y={y - 4} c={c} />}
              </g>
            );
          })}
        </svg>
        {runs.map((r, i) => {
          const w = win[i];
          const q = clamp01((p - w.s) / Math.max(0.02, w.e - w.s));
          const done = p >= w.e;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", top: i * LANE + 6, left: 0, width: 560, fontFamily: V("font-ui"), fontWeight: done ? 700 : 600, fontSize: 27, color: done ? c.accent : c.ink, ...ELLIPSIS, ...rise(p, w.s) }}>{r.label}</div>
              <div style={{ position: "absolute", top: i * LANE + 8, right: 0, width: 250, textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color: done ? c.accent : c.ink2, whiteSpace: "nowrap", opacity: clamp01((p - w.s) * 5) }}>
                <CountNumber value={r.ms ?? 700} p={q} /> ms
              </div>
            </React.Fragment>
          );
        })}
        {block.label && (
          <div style={{ position: "absolute", top: runs.length * LANE + 8, left: 40, width: 900, textAlign: "center", ...MONO_LABEL, fontSize: 20, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.72) }}>{block.label}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- devicephone

const NAV_FALLBACK = ["Home", "Search", "Saved", "You"];

/** A drawn phone: rounded frame, notch, home bar, a header bar, list rows and a
 *  bottom nav — all from tokens, no images. `highlight` tints a row, `tapAt`
 *  drops a click ripple on a nav item, `thumbZone` overlays the one-thumb reach
 *  arc. variant 0: phone centred, note strip below · variant 1: phone left,
 *  note in a fixed right column. */
export const DevicePhone: React.FC<{ block: B<"devicephone">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const rows = (block.rows ?? []).slice(0, 4);
  const nav = (block.nav ?? NAV_FALLBACK).slice(0, 4);
  const side = block.variant === 1;
  // FT: the frame is STROKED, so it must be inset by more than half the stroke
  // width or the outer half of that stroke falls outside the SVG and the top
  // corners render squared-off (the "cut off / misshapen" bug).
  const FT = 10, STROKE = 12;
  const PW = side ? 380 : 400, PH = side ? 740 : 780, PX = side ? 30 : (980 - 400) / 2;
  const sx = PX + STROKE, sy = FT + STROKE, sw = PW - STROKE * 2, sh = PH - STROKE * 2;
  const HOME = 32, NAV_H = 88;                  // reserve a home-bar strip below the nav
  const rowTop = sy + 126, ROW = 92, navTop = sy + sh - HOME - NAV_H;
  const navW = sw / nav.length;
  const H = FT + PH + 10 + (side ? 0 : block.note ? 96 : 12);
  const tapIdx = block.tapAt;
  const tapX = tapIdx != null && tapIdx >= 0 && tapIdx < nav.length ? sx + navW * (tapIdx + 0.5) : null;
  const shell = easeOut(p / 0.4);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <clipPath id={`${id}s`}><rect x={sx} y={sy} width={sw} height={sh} rx={38} /></clipPath>
            <radialGradient id={`${id}g`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.34} />
              <stop offset="60%" stopColor={c.accent} stopOpacity={0.14} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* frame */}
          <rect x={PX} y={FT} width={PW} height={PH} rx={48} fill={V("card")} stroke={a(c.ink, "D9")} strokeWidth={STROKE} opacity={clamp01(shell)} />
          <g clipPath={`url(#${id}s)`} opacity={clamp01(shell)}>
            <rect x={sx} y={sy} width={sw} height={sh} fill={V("paper")} />
            {/* header bar */}
            <rect x={sx} y={sy + 44} width={sw} height={70} fill={a(c.ink, "0F")} />
            <rect x={sx} y={sy + 113} width={sw} height={1.5} fill={a(c.ink, "26")} />
            {/* list rows */}
            {rows.map((_, i) => {
              const e = easeOut((p - 0.22 - i * 0.09) / 0.4);
              const hot = block.highlight === i;
              const y = rowTop + i * ROW;
              return (
                <g key={i} opacity={clamp01(e)}>
                  {hot && <rect x={sx + 8} y={y + 6} width={sw - 16} height={ROW - 14} rx={12} fill={a(c.accent, "1F")} stroke={c.accent} strokeWidth={2.5} />}
                  <rect x={sx + 24} y={y + 18} width={54} height={54} rx={13} fill={hot ? c.accent : a(c.ink, "21")} />
                  <rect x={sx + 94} y={y + 56} width={sw - 130} height={9} rx={4.5} fill={a(c.ink, "1A")} />
                </g>
              );
            })}
            {/* bottom nav */}
            <rect x={sx} y={navTop} width={sw} height={NAV_H + HOME} fill={a(c.ink, "0D")} />
            <rect x={sx} y={navTop} width={sw} height={1.5} fill={a(c.ink, "26")} />
            {nav.map((_, i) => {
              const on = tapIdx === i;
              return <rect key={i} x={sx + navW * (i + 0.5) - 15} y={navTop + 16} width={30} height={30} rx={9} fill={on ? c.accent : a(c.ink, "33")} opacity={clamp01(easeOut((p - 0.3) / 0.4))} />;
            })}
            {/* one-thumb reach arc, pivoting off the bottom-right corner */}
            {block.thumbZone && (
              <g opacity={clamp01(easeOut((p - 0.45) / 0.5))}>
                <circle cx={sx + sw - 26} cy={sy + sh + 34} r={330} fill={`url(#${id}g)`} />
                {[188, 262, 330].map((r, k) => (
                  <circle key={r} cx={sx + sw - 26} cy={sy + sh + 34} r={r * easeOut((p - 0.45 - k * 0.07) / 0.5)} fill="none" stroke={c.accent} strokeOpacity={0.42} strokeWidth={2.5} strokeDasharray="9 10" />
                ))}
              </g>
            )}
            {tapX != null && <Ripple x={tapX} y={navTop + 31} t={(p - 0.6) / 0.55} color={c.accent} r0={18} />}
          </g>
          {/* notch + home bar sit on the frame, over the screen */}
          <rect x={PX + PW / 2 - 72} y={sy + 9} width={144} height={30} rx={15} fill={a(c.ink, "D9")} opacity={clamp01(shell)} />
          <rect x={PX + PW / 2 - 62} y={sy + sh - 19} width={124} height={7} rx={3.5} fill={a(c.ink, "59")} opacity={clamp01(shell)} />
          {tapX != null && <Pointer x={tapX} y={navTop + 26} c={c} opacity={clamp01((p - 0.5) * 5)} />}
        </svg>

        {/* every label lives in a fixed slot on the DOM layer (ellipsis-safe) */}
        {block.appTitle && (
          <div style={{ position: "absolute", left: sx + 22, top: sy + 62, width: sw - 44, fontFamily: V("font-ui"), fontWeight: 700, fontSize: 25, color: c.ink, ...ELLIPSIS, ...rise(p, 0.14, 10) }}>{block.appTitle}</div>
        )}
        {rows.map((r, i) => (
          <div key={i} style={{ position: "absolute", left: sx + 94, top: rowTop + i * ROW + 20, width: sw - 130, fontFamily: V("font-ui"), fontWeight: block.highlight === i ? 700 : 600, fontSize: 22, color: block.highlight === i ? c.accent : c.ink, ...ELLIPSIS, ...rise(p, 0.24 + i * 0.09, 10) }}>{r}</div>
        ))}
        {nav.map((n, i) => (
          <div key={i} style={{ position: "absolute", left: sx + navW * i, top: navTop + 52, width: navW, textAlign: "center", fontFamily: V("font-mono"), fontSize: 15, letterSpacing: ".06em", color: block.tapAt === i ? c.accent : c.ink2, padding: "0 4px", boxSizing: "border-box", ...ELLIPSIS, opacity: clamp01(easeOut((p - 0.32) / 0.4)) }}>{n}</div>
        ))}
        {side ? (
          block.note && (
            <div style={{ position: "absolute", left: 500, top: 150, width: 460, fontFamily: V("font-ui"), fontWeight: 600, fontSize: 30, lineHeight: 1.42, color: c.ink, maxHeight: 260, overflow: "hidden", ...rise(p, 0.5) }}>{block.note}</div>
          )
        ) : (
          <Note text={block.note} c={c} p={p} top={FT + PH + 26} />
        )}
        {block.thumbZone && side && (
          <div style={{ position: "absolute", left: 500, top: 430, width: 460, display: "flex", gap: 12, alignItems: "center", ...MONO_LABEL, fontSize: 19, color: c.ink2, opacity: clamp01(easeOut((p - 0.6) / 0.4)) }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: a(c.accent, "52"), flexShrink: 0 }} />one-thumb reach
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- devicebrowser

/** A drawn desktop window: title bar with traffic lights, address bar, optional
 *  menu row, and a page mock (sidebar + hero + text bars). `highlight` outlines
 *  a zone and points the cursor at it. variant 0: window flush to the screen
 *  edge · variant 1: window floating inside the screen (with the gap that costs
 *  you the infinite edge). */
export const DeviceBrowser: React.FC<{ block: B<"devicebrowser">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const float = block.variant === 1;
  const menu = (block.menu ?? []).slice(0, 5);
  const SX = 10, SY = 8, SW = 960, SH = 552;                 // the "screen" (SY: stroke room)
  const M = float ? 46 : 0;
  const wx = SX + M, wy = SY + M, ww = SW - M * 2, wh = SH - M * 2;
  const BAR = 58, MENU_H = menu.length ? 40 : 0;
  const pageY = wy + BAR + MENU_H;
  const zones: Record<string, { x: number; y: number; w: number; h: number }> = {
    menu: menu.length ? { x: wx + 14, y: wy + BAR + 3, w: 118, h: MENU_H - 6 } : { x: wx + 148, y: wy + 14, w: ww - 220, h: 30 },
    corner: { x: wx, y: wy, w: 118, h: 58 },
    sidebar: { x: wx + 12, y: pageY + 12, w: 200, h: wh - BAR - MENU_H - 24 },
    content: { x: wx + 228, y: pageY + 12, w: ww - 244, h: 200 },
  };
  const z = block.highlight ? zones[block.highlight] : null;
  const shell = easeOut(p / 0.4);
  const glow = clamp01(easeOut((p - 0.45) / 0.4));
  const H = SY + SH + 8 + (block.note ? 100 : 16);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs><clipPath id={`${id}w`}><rect x={wx} y={wy} width={ww} height={wh} rx={16} /></clipPath></defs>
          {/* the screen the window lives on */}
          <rect x={SX} y={SY} width={SW} height={SH} rx={float ? 18 : 16} fill={float ? a(c.ink, "26") : V("paper")} stroke={a(c.ink, "8C")} strokeWidth={float ? 8 : 6} opacity={clamp01(shell)} />
          <g opacity={clamp01(shell)}>
            <rect x={wx} y={wy} width={ww} height={wh} rx={16} fill={V("card")} stroke={a(c.ink, "33")} strokeWidth={2} />
            <g clipPath={`url(#${id}w)`}>
              {/* title bar */}
              <rect x={wx} y={wy} width={ww} height={BAR} fill={a(c.ink, "12")} />
              {[0, 1, 2].map((k) => <circle key={k} cx={wx + 30 + k * 30} cy={wy + BAR / 2} r={9} fill={a(c.ink, k === 0 ? "8C" : "4D")} />)}
              <rect x={wx + 148} y={wy + 14} width={ww - 220} height={30} rx={15} fill={V("paper")} stroke={a(c.ink, "26")} strokeWidth={1.5} />
              <line x1={wx} y1={wy + BAR} x2={wx + ww} y2={wy + BAR} stroke={a(c.ink, "26")} strokeWidth={1.5} />
              {menu.length > 0 && <line x1={wx} y1={wy + BAR + MENU_H} x2={wx + ww} y2={wy + BAR + MENU_H} stroke={a(c.ink, "1A")} strokeWidth={1.5} />}
              {/* page mock */}
              <rect x={wx + 12} y={pageY + 12} width={200} height={wh - BAR - MENU_H - 24} rx={10} fill={a(c.ink, "0D")} />
              {[0, 1, 2, 3].map((k) => (
                <rect key={k} x={wx + 30} y={pageY + 44 + k * 46} width={140 - k * 14} height={12} rx={6} fill={a(c.ink, "26")} opacity={clamp01(easeOut((p - 0.2 - k * 0.05) / 0.4))} />
              ))}
              <rect x={wx + 228} y={pageY + 12} width={ww - 244} height={200} rx={12} fill={a(c.ink, "29")} opacity={clamp01(easeOut((p - 0.24) / 0.45))} />
              {[0, 1, 2, 3, 4].map((k) => (
                <rect key={k} x={wx + 228} y={pageY + 240 + k * 34} width={(ww - 244) * [1, 0.94, 0.98, 0.72, 0.86][k]} height={14} rx={7} fill={a(c.ink, "1F")} opacity={clamp01(easeOut((p - 0.3 - k * 0.05) / 0.4))} />
              ))}
            </g>
            {z && (
              <>
                <rect x={z.x - 5} y={z.y - 5} width={z.w + 10} height={z.h + 10} rx={12} fill={a(c.accent, "1A")} stroke={c.accent} strokeWidth={3.5} opacity={glow} />
                <Ripple x={z.x + z.w / 2} y={z.y + z.h / 2} t={(p - 0.5) / 0.6} color={c.accent} r0={Math.min(40, z.h / 2)} />
                <Pointer x={z.x + Math.min(z.w * 0.5, 60)} y={z.y + Math.min(z.h * 0.55, 30)} c={c} opacity={glow} />
              </>
            )}
          </g>
        </svg>
        {block.url && (
          <div style={{ position: "absolute", left: wx + 166, top: wy + 20, width: ww - 256, fontFamily: V("font-mono"), fontSize: 17, color: c.ink2, ...ELLIPSIS, opacity: clamp01(shell) }}>{block.url}</div>
        )}
        {menu.map((m, i) => (
          <div key={i} style={{ position: "absolute", left: wx + 20 + i * 122, top: wy + BAR + 10, width: 114, fontFamily: V("font-ui"), fontWeight: 600, fontSize: 20, color: block.highlight === "menu" && i === 0 ? c.accent : c.ink2, ...ELLIPSIS, ...rise(p, 0.2 + i * 0.05, 8) }}>{m}</div>
        ))}
        <Note text={block.note} c={c} p={p} top={SH + 22} width={820} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- uimock

/** Generic wireframe panel — title, rows, buttons — with an optional accent
 *  `highlight` row and an `annotate` callout on a leader line. The callout text
 *  lives in a reserved column (v0 right / v1 below), never over the art. */
export const UiMock: React.FC<{ block: B<"uimock">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rows = (block.rows ?? []).slice(0, 4);
  const buttons = (block.buttons ?? []).slice(0, 2);
  const below = block.variant === 1;
  const PW = below ? 640 : 556, PX = below ? 170 : 10;
  const TITLE_H = 76, ROW = 72;
  const PH = TITLE_H + rows.length * ROW + (buttons.length ? 108 : 24);
  const hi = block.highlight;
  const hiY = hi != null && hi < rows.length ? TITLE_H + hi * ROW + ROW / 2 : null;
  const lead = easeOut((p - 0.5) / 0.45);
  const H = PH + (below && block.annotate ? 130 : 10);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <rect x={PX} y={0} width={PW} height={PH} rx={16} fill={V("card")} stroke={a(c.ink, "33")} strokeWidth={2.5} opacity={clamp01(easeOut(p / 0.4))} />
          <line x1={PX} y1={TITLE_H} x2={PX + PW} y2={TITLE_H} stroke={a(c.ink, "26")} strokeWidth={1.5} opacity={clamp01(easeOut(p / 0.4))} />
          {rows.map((_, i) => {
            const e = easeOut((p - 0.16 - i * 0.09) / 0.42);
            const hot = hi === i;
            const y = TITLE_H + i * ROW;
            return (
              <g key={i} opacity={clamp01(e)}>
                {hot && <rect x={PX + 10} y={y + 6} width={PW - 20} height={ROW - 12} rx={10} fill={a(c.accent, "1C")} stroke={c.accent} strokeWidth={2.5} />}
                <rect x={PX + 26} y={y + ROW / 2 - 11} width={22} height={22} rx={6} fill={hot ? c.accent : a(c.ink, "2E")} />
                {i < rows.length - 1 && <line x1={PX + 20} y1={y + ROW} x2={PX + PW - 20} y2={y + ROW} stroke={a(c.ink, "14")} strokeWidth={1.5} />}
              </g>
            );
          })}
          {buttons.map((_, i) => {
            const e = backOut((p - 0.42 - i * 0.1) / 0.45);
            const bw = (PW - 72) / 2;
            return (
              <rect key={i} x={PX + 26 + i * (bw + 20)} y={PH - 84} width={bw} height={58} rx={12}
                fill={i === 0 ? c.accent : "transparent"} stroke={i === 0 ? c.accent : a(c.ink, "73")} strokeWidth={2.5}
                opacity={clamp01(e * 1.6)} />
            );
          })}
          {/* leader line from the highlighted row out to the reserved slot */}
          {block.annotate && hiY != null && (
            below ? (
              // route OUTSIDE the panel — a leader must never cross other rows' text
              <g opacity={clamp01(lead)}>
                <path d={`M ${PX + PW + 8} ${hiY} L ${PX + PW + 44} ${hiY} L ${PX + PW + 44} ${PH + 22} L ${PX + PW - 60} ${PH + 22}`}
                  fill="none" stroke={c.accent} strokeWidth={2.5} strokeDasharray="6 7" strokeLinejoin="round" />
                <circle cx={PX + PW + 8} cy={hiY} r={5.5} fill={c.accent} />
              </g>
            ) : (
              <g opacity={clamp01(lead)}>
                <line x1={PX + PW + 6} y1={hiY} x2={PX + PW + 6 + 76 * clamp01(lead)} y2={hiY} stroke={c.accent} strokeWidth={2.5} strokeDasharray="6 7" />
                <circle cx={PX + PW + 6} cy={hiY} r={5.5} fill={c.accent} />
              </g>
            )
          )}
        </svg>
        <div style={{ position: "absolute", left: PX + 26, top: 22, width: PW - 52, fontFamily: V("font-ui"), fontWeight: 700, fontSize: 30, color: c.ink, ...ELLIPSIS, ...rise(p, 0.06, 10) }}>{block.panel ?? "Panel"}</div>
        {rows.map((r, i) => (
          <div key={i} style={{ position: "absolute", left: PX + 62, top: TITLE_H + i * ROW + ROW / 2 - 16, width: PW - 92, fontFamily: V("font-ui"), fontWeight: hi === i ? 700 : 600, fontSize: 25, color: hi === i ? c.accent : c.ink, ...ELLIPSIS, ...rise(p, 0.18 + i * 0.09, 10) }}>{r}</div>
        ))}
        {buttons.map((b, i) => {
          const bw = (PW - 72) / 2;
          return (
            <div key={i} style={{ position: "absolute", left: PX + 26 + i * (bw + 20), top: PH - 84 + 15, width: bw, textAlign: "center", fontFamily: V("font-ui"), fontWeight: 700, fontSize: 24, color: i === 0 ? V("accent-ink") : c.ink2, padding: "0 12px", boxSizing: "border-box", ...ELLIPSIS, opacity: clamp01(easeOut((p - 0.46 - i * 0.1) / 0.4)) }}>{b}</div>
          );
        })}
        {block.annotate && (
          below ? (
            <div style={{ position: "absolute", left: 170, top: PH + 44, width: 640, textAlign: "center", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 26, lineHeight: 1.4, color: c.accent, ...CLAMP2, ...rise(p, 0.58) }}>{block.annotate}</div>
          ) : (
            <div style={{ position: "absolute", left: PX + PW + 96, top: (hiY ?? PH / 2) - 46, width: 980 - (PX + PW + 96), fontFamily: V("font-ui"), fontWeight: 600, fontSize: 25, lineHeight: 1.38, color: c.accent, ...CLAMP2, WebkitLineClamp: 3, ...rise(p, 0.58) }}>{block.annotate}</div>
          )
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- beforeafter

/** Two drawn mocks labelled Before / After: the "before" is cramped and
 *  misaligned, the "after" lands on a grid with a real target size. variant 0:
 *  side by side · variant 1: one frame with the after wiping across the before. */
export const BeforeAfter: React.FC<{ block: B<"beforeafter">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const before = block.before ?? { label: "Before" };
  const after = block.after ?? { label: "After" };
  const wipe = block.variant === 1;
  const MW = wipe ? 660 : 452, MH = 400;
  const bx = wipe ? 160 : 20, ax = wipe ? 160 : 508;
  const LABEL_Y = MH + 22, CAP_Y = MH + 66;
  const H = MH + 180;

  const mock = (x: number, good: boolean, e: number) => (
    <g opacity={clamp01(e)}>
      <rect x={x} y={0} width={MW} height={MH} rx={14} fill={V("card")} stroke={a(c.ink, good ? "40" : "26")} strokeWidth={2.5} />
      <rect x={x + (good ? 30 : 22)} y={good ? 30 : 24} width={good ? 180 : 132} height={good ? 20 : 14} rx={7} fill={a(c.ink, "40")} />
      {[0, 1, 2].map((k) =>
        good ? (
          <rect key={k} x={x + 30} y={86 + k * 44} width={MW - 60} height={16} rx={8} fill={a(c.ink, "21")} />
        ) : (
          <rect key={k} x={x + 18 + [0, 31, 13][k]} y={68 + k * 31 + [0, 9, 21][k]} width={MW - 52 - [0, 74, 30][k]} height={[13, 9, 11][k]} rx={5.5} fill={a(c.ink, "21")} />
        )
      )}
      {good ? (
        <>
          <rect x={x + 30} y={MH - 108} width={236} height={64} rx={12} fill={c.accent} />
          <rect x={x + 286} y={MH - 108} width={150} height={64} rx={12} fill="none" stroke={a(c.ink, "73")} strokeWidth={2.5} />
        </>
      ) : (
        <>
          <rect x={x + 24} y={MH - 74} width={78} height={26} rx={6} fill={a(c.ink, "8C")} />
          <rect x={x + 108} y={MH - 71} width={66} height={26} rx={6} fill="none" stroke={a(c.ink, "59")} strokeWidth={2} />
          <rect x={x + 180} y={MH - 76} width={58} height={26} rx={6} fill="none" stroke={a(c.ink, "59")} strokeWidth={2} />
        </>
      )}
    </g>
  );

  const w = easeOut((p - 0.35) / 0.55);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {/* the AFTER reveals from the right, so "before" stays on the left of
              the divider and the two labels below never contradict the art */}
          <defs><clipPath id={`${id}c`}><rect x={ax + MW * (1 - w)} y={0} width={MW * w} height={MH} /></clipPath></defs>
          {mock(bx, false, easeOut(p / 0.4))}
          {wipe ? (
            <>
              <g clipPath={`url(#${id}c)`}>{mock(ax, true, 1)}</g>
              {w > 0.01 && w < 0.995 && <line x1={ax + MW * (1 - w)} y1={-8} x2={ax + MW * (1 - w)} y2={MH + 8} stroke={c.accent} strokeWidth={4} />}
              {w > 0.01 && w < 0.995 && <circle cx={ax + MW * (1 - w)} cy={MH / 2} r={17} fill={c.accent} stroke={V("paper")} strokeWidth={3} />}
            </>
          ) : (
            mock(ax, true, easeOut((p - 0.28) / 0.45))
          )}
        </svg>
        {([[bx, before, false, 0.1], [ax, after, true, 0.4]] as const).map(([x, side, good, d], i) => (
          <React.Fragment key={i}>
            <div style={{
              position: "absolute", top: LABEL_Y, left: wipe ? (good ? 500 : 160) : x, width: wipe ? 320 : MW,
              textAlign: wipe ? (good ? "right" : "left") : "center",
              ...MONO_LABEL, fontSize: 21, color: good ? c.accent : c.ink2, ...ELLIPSIS, ...rise(p, d),
            }}>{side.label ?? (good ? "After" : "Before")}</div>
            <div style={{
              position: "absolute", top: CAP_Y, left: wipe ? (good ? 500 : 160) : x, width: wipe ? 320 : MW,
              textAlign: wipe ? (good ? "right" : "left") : "center", height: 100,
              fontFamily: V("font-ui"), fontWeight: 600, fontSize: 23, lineHeight: 1.4, color: good ? c.ink : c.ink2, ...CLAMP2, WebkitLineClamp: 3, ...rise(p, d + 0.12),
            }}>{side.caption ?? ""}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- statechips

const STATE_FALLBACK = ["Default", "Hover", "Active", "Disabled"];

/** One component drawn in its UI states, revealing in sequence, each named in a
 *  fixed slot. variant 0: a row of four · variant 1: 2×2 with names beside. */
export const StateChips: React.FC<{ block: B<"statechips">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const states = (block.states ?? STATE_FALLBACK).slice(0, 4);
  const grid = block.variant === 1;
  const CW = grid ? 470 : 236, CH = grid ? 168 : 210;
  const BW = grid ? 224 : 208, BH = 92;
  const cols = grid ? 2 : 4;
  const H = Math.ceil(states.length / cols) * CH + (block.note ? 86 : 8);
  const pos = (i: number) => ({ x: (i % cols) * CW + (grid ? 10 : 0), y: Math.floor(i / cols) * CH });
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {states.map((_, i) => {
            const e = backOut((p - 0.08 - i * 0.13) / 0.45);
            if (e <= 0.02) return null;
            const { x, y } = pos(i);
            const bx = x + 14, by = y + 18 + (i === 2 ? 4 : 0);   // "active" sits pressed
            const fill = i === 0 ? V("card") : i === 1 ? V("tint") : i === 2 ? c.accent : a(c.ink, "0D");
            const stroke = i === 1 ? c.accent : i === 2 ? c.accent : i === 3 ? a(c.ink, "3D") : a(c.ink, "73");
            return (
              <g key={i} opacity={clamp01(e * 1.5)}>
                {i !== 2 && <rect x={bx} y={by + 5} width={BW} height={BH} rx={14} fill={a(c.ink, "0D")} />}
                <rect x={bx} y={by} width={BW} height={BH} rx={14} fill={fill} stroke={stroke} strokeWidth={i === 3 ? 2.5 : 3} strokeDasharray={i === 3 ? "8 7" : undefined} />
                {i === 1 && <Pointer x={bx + BW - 52} y={by + 46} c={c} opacity={clamp01((p - 0.3) * 4)} />}
                {i === 2 && <Ripple x={bx + BW / 2} y={by + BH / 2} t={(p - 0.44) / 0.6} color={c.accent} r0={30} />}
              </g>
            );
          })}
        </svg>
        {states.map((s, i) => {
          const { x, y } = pos(i);
          const on = clamp01(easeOut((p - 0.14 - i * 0.13) / 0.4));
          return (
            <React.Fragment key={i}>
              <div style={{
                position: "absolute", left: x + 14, top: y + 18 + (i === 2 ? 4 : 0) + 30, width: BW, textAlign: "center",
                fontFamily: V("font-ui"), fontWeight: 700, fontSize: 24, padding: "0 14px", boxSizing: "border-box",
                color: i === 2 ? V("accent-ink") : i === 3 ? a(c.ink2, "8C") : i === 1 ? c.accent : c.ink, ...ELLIPSIS, opacity: on,
              }}>{block.label ?? "Continue"}</div>
              <div style={{
                position: "absolute", ...(grid ? { left: x + BW + 26, top: y + 52, width: CW - BW - 42 } : { left: x, top: y + 138, width: CW, textAlign: "center" as const }),
                ...MONO_LABEL, fontSize: 19, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.2 + i * 0.13, 10),
              }}>{s}</div>
            </React.Fragment>
          );
        })}
        <Note text={block.note} c={c} p={p} top={Math.ceil(states.length / cols) * CH + 6} delay={0.66} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- formdemo

/** A field fills with text, fails validation, then passes — the message always
 *  occupies the SAME reserved slot, so nothing on screen ever moves. variant 0:
 *  message under the field · variant 1: inline message in a right column. */
export const FormDemo: React.FC<{ block: B<"formdemo">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const inline = block.variant === 1;
  const text = block.text ?? "";
  const FW = inline ? 560 : 660, FX = inline ? 10 : 160;
  const typed = clamp01((p - 0.06) / 0.3);
  const errAt = 0.42, okAt = 0.72;
  const stage = p >= okAt ? 2 : p >= errAt ? 1 : 0;
  // the correction lands with the success stage — nothing sits to the right of
  // the value (the status glyph is absolutely placed), so the width can change
  const shown = stage === 2 && block.fixed ? block.fixed : text.slice(0, Math.round(typed * text.length));
  const msg = stage === 2 ? block.success : stage === 1 ? block.error : "";
  const msgP = clamp01((p - (stage === 2 ? okAt : errAt)) / 0.28);
  const border = stage === 1 ? c.accent : stage === 2 ? a(c.ink, "A6") : a(c.ink, "40");
  const FH = 88, BOXY = 52;
  const H = (inline ? BOXY + FH + 122 : BOXY + FH + 96 + 96) + 10;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <rect x={FX} y={BOXY} width={FW} height={FH} rx={12} fill={V("card")} stroke={border} strokeWidth={stage === 1 ? 4 : 2.5} opacity={clamp01(easeOut(p / 0.35))} />
          {/* caret rides the typed text — the only free-moving thing here */}
          {typed > 0.02 && typed < 0.999 && (
            <rect x={FX + 28 + shown.length * 13.4} y={BOXY + 22} width={3} height={44} fill={c.accent} opacity={Math.round(p * 40) % 2 ? 0.25 : 1} />
          )}
          {/* status glyph in a fixed slot inside the field */}
          {stage > 0 && (
            <g opacity={clamp01(msgP * 1.6)} transform={`translate(${FX + FW - 62} ${BOXY + FH / 2})`}>
              <circle r={22} fill={stage === 1 ? c.accent : "transparent"} stroke={stage === 1 ? c.accent : a(c.ink, "A6")} strokeWidth={3} />
              {stage === 1 ? (
                <>
                  <rect x={-2.5} y={-12} width={5} height={15} rx={2.5} fill={V("accent-ink")} />
                  <circle cy={8} r={3} fill={V("accent-ink")} />
                </>
              ) : (
                <path d="M -10 1 L -3 8 L 11 -8" fill="none" stroke={c.accent} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(msgP)} />
              )}
            </g>
          )}
          {!inline && (
            <rect x={FX} y={BOXY + FH + 96} width={230} height={68} rx={12} fill={stage === 2 ? c.accent : a(c.ink, "26")} opacity={clamp01(easeOut((p - 0.2) / 0.4))} />
          )}
        </svg>
        <div style={{ position: "absolute", left: FX + 2, top: 8, width: FW, ...MONO_LABEL, fontSize: 20, color: c.ink2, ...ELLIPSIS, ...rise(p, 0, 10) }}>{block.field ?? "Email address"}</div>
        <div style={{ position: "absolute", left: FX + 28, top: BOXY + 26, width: FW - 110, fontFamily: V("font-mono"), fontSize: 28, color: c.ink, whiteSpace: "pre", overflow: "hidden" }}>{shown}</div>
        {/* the reserved message slot — same box for both states, so no shift */}
        <div style={{
          position: "absolute", height: 76,
          ...(inline ? { left: FX + FW + 34, top: BOXY + 16, width: 980 - FX - FW - 44 } : { left: FX, top: BOXY + FH + 14, width: FW }),
          fontFamily: V("font-ui"), fontWeight: 600, fontSize: 24, lineHeight: 1.4,
          color: stage === 1 ? c.accent : c.ink2, ...CLAMP2, opacity: clamp01(msgP * 1.4),
        }}>{msg ?? ""}</div>
        {!inline && (
          <div style={{ position: "absolute", left: FX, top: BOXY + FH + 96 + 20, width: 230, textAlign: "center", fontFamily: V("font-ui"), fontWeight: 700, fontSize: 24, color: stage === 2 ? V("accent-ink") : c.ink2, ...ELLIPSIS, opacity: clamp01(easeOut((p - 0.24) / 0.4)) }}>{block.submit ?? "Submit"}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- menudemo

const MENU_FALLBACK = ["File", "Edit", "View", "Window", "Help"];

/** The screen-edge argument, demonstrated: the cursor is thrown at a menu with
 *  the SAME overshoot in both variants. variant 0: the menu is welded to the
 *  screen edge, so the edge stops the cursor dead on target · variant 1: the
 *  menu floats inside a window, so the overshoot sails past and has to be
 *  corrected back down. */
export const MenuDemo: React.FC<{ block: B<"menudemo">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const items = (block.items ?? MENU_FALLBACK).slice(0, 5);
  const floatMenu = block.variant === 1;
  const SX = 20, SY = 0, SW = 940, SH = 520;
  const M = floatMenu ? 58 : 0;
  const barY = SY + M, BAR = 54;
  const ITEM_W = 150, ITEM_X = (i: number) => SX + M + 26 + i * ITEM_W;
  const target = Math.min(items.length - 1, Math.max(0, block.target ?? 1));
  const tx = ITEM_X(target) + ITEM_W / 2 - 12, ty = barY + BAR / 2;

  // one throw: x eases to the target, y overshoots ABOVE the bar. Welded to the
  // edge, y is clamped by the screen; floating, it sails into the gap and has
  // to be corrected back down (an extra move you can see).
  const q = easeOut(clamp01((p - 0.15) / 0.42));
  const startX = SX + 250, startY = SY + SH - 120;
  const rawY = startY + (ty - 120 - startY) * q;                     // aims 120px past
  const corr = easeOut(clamp01((p - 0.6) / 0.3));
  const cy = floatMenu ? (q < 0.999 ? Math.max(SY + 8, rawY) : rawY + (ty - rawY) * corr) : Math.max(ty, rawY);
  const cx = startX + (tx - startX) * q;
  const landed = floatMenu ? p >= 0.86 : q >= 0.999;
  const H = SY + SH + 8 + (block.note ? 100 : 16);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs><clipPath id={`${id}s`}><rect x={SX} y={SY} width={SW} height={SH} rx={14} /></clipPath></defs>
          <rect x={SX} y={SY} width={SW} height={SH} rx={14} fill={floatMenu ? a(c.ink, "26") : V("paper")} stroke={a(c.ink, "A6")} strokeWidth={7} opacity={clamp01(easeOut(p / 0.35))} />
          <g clipPath={`url(#${id}s)`}>
            {floatMenu && <rect x={SX + M} y={SY + M} width={SW - M * 2} height={SH - M} rx={14} fill={V("card")} stroke={a(c.ink, "33")} strokeWidth={2.5} opacity={clamp01(easeOut(p / 0.35))} />}
            {/* the menu bar */}
            <rect x={SX + M} y={barY} width={SW - M * 2} height={BAR} fill={a(c.ink, "12")} opacity={clamp01(easeOut(p / 0.35))} />
            <line x1={SX + M} y1={barY + BAR} x2={SX + SW - M} y2={barY + BAR} stroke={a(c.ink, "26")} strokeWidth={1.5} />
            {landed && <rect x={ITEM_X(target) - 16} y={barY + 4} width={ITEM_W - 14} height={BAR - 8} rx={8} fill={c.accent} />}
            {/* page bars under the bar */}
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={SX + M + 30} y={barY + BAR + 46 + k * 40} width={(SW - M * 2 - 60) * [0.9, 0.68, 0.82, 0.5][k]} height={15} rx={7.5} fill={a(c.ink, "14")} opacity={clamp01(easeOut((p - 0.16 - k * 0.05) / 0.4))} />
            ))}
            {/* thrown path + the overshoot */}
            {q > 0.01 && <path d={`M ${startX} ${startY} L ${cx} ${cy}`} stroke={c.accent} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="8 9" fill="none" />}
            {floatMenu && q >= 0.999 && corr > 0.01 && corr < 0.999 && (
              <path d={`M ${cx} ${Math.max(SY + 8, rawY)} L ${cx} ${cy}`} stroke={c.accent} strokeWidth={3.5} fill="none" />
            )}
            <circle cx={startX} cy={startY} r={11} fill={V("paper")} stroke={a(c.ink, "8C")} strokeWidth={4} opacity={clamp01(easeOut(p / 0.35))} />
            {landed && <Ripple x={tx + 12} y={ty} t={(p - (floatMenu ? 0.86 : 0.57)) / 0.6} color={c.accent} r0={26} />}
            {p > 0.16 && <Pointer x={cx} y={cy} c={c} />}
          </g>
        </svg>
        {items.map((m, i) => (
          <div key={i} style={{ position: "absolute", left: ITEM_X(i) - 16, top: barY + 15, width: ITEM_W - 14, textAlign: "center", fontFamily: V("font-ui"), fontWeight: i === target ? 700 : 600, fontSize: 21, color: landed && i === target ? V("accent-ink") : c.ink2, padding: "0 6px", boxSizing: "border-box", ...ELLIPSIS, ...rise(p, 0.08 + i * 0.04, 8) }}>{m}</div>
        ))}
        <Note text={block.note} c={c} p={p} top={SH + 22} width={860} delay={0.62} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- heatzone

/** A soft attention / reach field over a drawn surface, with the ramp explained
 *  in a fixed legend strip — no numbers ever float on the art. variant 0: reach
 *  on a phone (hot at the thumb) · variant 1: attention on a page (hot top-left). */
export const HeatZone: React.FC<{ block: B<"heatzone">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const page = block.variant === 1;
  const AW = page ? 880 : 400, AH = page ? 520 : 700, AX = (980 - AW) / 2;
  const hx = page ? AX + 110 : AX + AW - 34, hy = page ? 92 : AH + 24;
  const R = page ? 620 : 470;
  const shell = clamp01(easeOut(p / 0.4));
  const heat = easeOut((p - 0.24) / 0.55);
  const H = AH + 110;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <clipPath id={`${id}c`}><rect x={AX} y={0} width={AW} height={AH} rx={page ? 16 : 44} /></clipPath>
            <radialGradient id={`${id}h`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.62} />
              <stop offset="38%" stopColor={c.accent} stopOpacity={0.3} />
              <stop offset="72%" stopColor={c.accent} stopOpacity={0.1} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={AX} y={0} width={AW} height={AH} rx={page ? 16 : 44} fill={V("card")} stroke={a(c.ink, page ? "40" : "D9")} strokeWidth={page ? 3 : 13} opacity={shell} />
          <g clipPath={`url(#${id}c)`}>
            {/* a plain drawn surface — deliberately quiet under the field */}
            <rect x={AX} y={page ? 0 : 40} width={AW} height={page ? 64 : 62} fill={a(c.ink, "12")} opacity={shell} />
            {Array.from({ length: page ? 8 : 6 }).map((_, k) => (
              <rect key={k} x={AX + 32} y={(page ? 108 : 132) + k * (page ? 52 : 92)} width={(AW - 64) * [0.94, 0.7, 0.86, 0.58, 0.9, 0.66, 0.8, 0.5][k]} height={page ? 17 : 15} rx={8} fill={a(c.ink, "1A")} opacity={clamp01(easeOut((p - 0.1 - k * 0.04) / 0.4))} />
            ))}
            <g opacity={clamp01(heat)}>
              <circle cx={hx} cy={hy} r={R} fill={`url(#${id}h)`} />
              {[0.36, 0.58, 0.8, 1].map((f, k) => (
                <circle key={f} cx={hx} cy={hy} r={R * f * easeOut((p - 0.24 - k * 0.06) / 0.5)} fill="none" stroke={c.accent} strokeOpacity={0.4} strokeWidth={2.5} strokeDasharray="10 11" />
              ))}
            </g>
          </g>
        </svg>
        {/* legend strip — the only place any word about the ramp appears */}
        <div style={{ position: "absolute", left: 140, top: AH + 26, width: 700, display: "flex", gap: 14, alignItems: "center", justifyContent: "center", ...rise(p, 0.6) }}>
          <span style={{ ...MONO_LABEL, fontSize: 19, color: c.accent, whiteSpace: "nowrap" }}>{block.hot ?? "easy"}</span>
          {[0.85, 0.62, 0.42, 0.24, 0.1].map((f, k) => (
            <span key={k} style={{ width: 44, height: 18, borderRadius: 5, background: c.accent, opacity: f }} />
          ))}
          <span style={{ ...MONO_LABEL, fontSize: 19, color: c.ink2, whiteSpace: "nowrap" }}>{block.cold ?? "a stretch"}</span>
        </div>
        {block.label && (
          <div style={{ position: "absolute", left: 90, top: AH + 66, width: 800, textAlign: "center", ...MONO_LABEL, fontSize: 19, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.7) }}>{block.label}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- gazepath

const F_STOPS: [number, number][] = [[96, 96], [520, 96], [96, 236], [386, 236], [96, 392]];
const Z_STOPS: [number, number][] = [[96, 96], [520, 96], [128, 400], [520, 400]];

/** How the eye actually travels a page: a scan path draws over a drawn layout,
 *  numbered stops popping in order, every label safe in a fixed numbered list.
 *  variant 0: F-pattern · variant 1: Z-pattern. */
export const GazePath: React.FC<{ block: B<"gazepath">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const z = block.variant === 1;
  const pts = (z ? Z_STOPS : F_STOPS).slice(0, Math.max(2, Math.min((block.stops ?? []).length || 5, z ? 4 : 5)));
  const stops = (block.stops ?? []).slice(0, pts.length);
  const PX = 20, PW = 600, PH = 500;
  const LX = 668, LW = 980 - LX;
  const segs = pts.length - 1;
  const prog = easeOut((p - 0.12) / 0.68) * segs;
  const ROW = Math.min(96, Math.floor((PH - 20) / Math.max(1, stops.length)));
  const H = PH + 16;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          <rect x={PX} y={0} width={PW} height={PH} rx={14} fill={V("card")} stroke={a(c.ink, "33")} strokeWidth={2.5} opacity={clamp01(easeOut(p / 0.35))} />
          <rect x={PX} y={0} width={PW} height={54} rx={14} fill={a(c.ink, "12")} opacity={clamp01(easeOut(p / 0.35))} />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <rect key={k} x={PX + 34} y={110 + k * 54} width={(PW - 68) * [0.92, 0.74, 0.88, 0.6, 0.84, 0.7, 0.46][k]} height={16} rx={8} fill={a(c.ink, "1A")} opacity={clamp01(easeOut((p - 0.06 - k * 0.04) / 0.4))} />
          ))}
          {/* the scan path itself */}
          {pts.slice(0, -1).map((s, i) => {
            const e = pts[i + 1];
            const f = clamp01(prog - i);
            if (f <= 0) return null;
            const x2 = PX + s[0] + (e[0] - s[0]) * f, y2 = s[1] + (e[1] - s[1]) * f;
            const deg = (Math.atan2(e[1] - s[1], e[0] - s[0]) * 180) / Math.PI;
            return (
              <g key={i}>
                <line x1={PX + s[0]} y1={s[1]} x2={x2} y2={y2} stroke={c.accent} strokeWidth={4} strokeLinecap="round" strokeOpacity={0.75} />
                {f >= 0.999 && <path d={head(x2, y2, deg, 15)} fill={c.accent} />}
              </g>
            );
          })}
          {pts.map((s, i) => <Badge key={i} x={PX + s[0]} y={s[1]} n={i + 1} c={c} on={prog >= i - 0.35} r={22} />)}
        </svg>
        {stops.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: LX, top: 10 + i * ROW, width: LW, display: "flex", gap: 14, alignItems: "flex-start", ...rise(p, 0.16 + i * 0.11, 14) }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: c.accent, color: V("accent-ink"), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 19 }}>{i + 1}</span>
            <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 23, lineHeight: 1.34, color: c.ink, maxHeight: ROW - 24, ...CLAMP2 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- diagram

/** Labelled boxes wired together by arrows that draw on. variant 0: a row
 *  (A → B → C) · variant 1: hub and spokes (arrows out of the centre). */
export const Diagram: React.FC<{ block: B<"diagram">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const nodes = block.nodes.slice(0, 5);
  const spoke = block.variant === 1;
  const boxStyle = (hot: boolean): React.CSSProperties => ({
    boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "10px 16px", borderRadius: 14, textAlign: "center",
    background: hot ? c.accent : V("card"), border: `2.5px solid ${hot ? c.accent : a(c.ink, "40")}`,
    fontFamily: V("font-ui"), fontWeight: 700, fontSize: 23, lineHeight: 1.24,
    color: hot ? V("accent-ink") : c.ink, overflow: "hidden",
  });

  if (spoke) {
    const hub = nodes[0], spokes = nodes.slice(1, 5);
    const CX = 490, CY = 250, HW = 260, HH = 120;
    const slots = [
      { x: 20, y: 190, w: 220, h: 120, dir: 180 },
      { x: 740, y: 190, w: 220, h: 120, dir: 0 },
      { x: 380, y: 10, w: 220, h: 110, dir: 270 },
      { x: 380, y: 380, w: 220, h: 110, dir: 90 },
    ];
    const H = 510;
    return (
      <div style={{ width: 980 }}>
        <Header title={block.title} c={c} />
        <div style={{ position: "relative", width: 980, height: H }}>
          <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
            {spokes.map((_, i) => {
              const s = slots[i];
              const d = easeOut((p - 0.24 - i * 0.11) / 0.42);
              if (d <= 0.01) return null;
              const from = { x: CX + (s.dir === 0 ? HW / 2 : s.dir === 180 ? -HW / 2 : 0), y: CY + (s.dir === 90 ? HH / 2 : s.dir === 270 ? -HH / 2 : 0) };
              const to = { x: s.x + s.w / 2 + (s.dir === 0 ? -s.w / 2 - 12 : s.dir === 180 ? s.w / 2 + 12 : 0), y: s.y + s.h / 2 + (s.dir === 90 ? -s.h / 2 - 12 : s.dir === 270 ? s.h / 2 + 12 : 0) };
              const x2 = from.x + (to.x - from.x) * d, y2 = from.y + (to.y - from.y) * d;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={x2} y2={y2} stroke={a(c.ink, "8C")} strokeWidth={3.5} strokeLinecap="round" />
                  {d >= 0.99 && <path d={head(to.x, to.y, s.dir, 15)} fill={a(c.ink, "8C")} />}
                </g>
              );
            })}
          </svg>
          <div style={{ position: "absolute", left: CX - HW / 2, top: CY - HH / 2, width: HW, height: HH, ...boxStyle(true), ...rise(p, 0.02, 14) }}>
            <span style={{ ...CLAMP2 }}>{hub}</span>
          </div>
          {spokes.map((n, i) => (
            <div key={i} style={{ position: "absolute", left: slots[i].x, top: slots[i].y, width: slots[i].w, height: slots[i].h, ...boxStyle(false), ...rise(p, 0.3 + i * 0.11, 14) }}>
              <span style={{ ...CLAMP2 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const n = nodes.length, GAP = 46;
  const BW = Math.min(n <= 3 ? 282 : 210, Math.floor((940 - GAP * (n - 1)) / n)), BH = 168;
  const totalW = n * BW + (n - 1) * GAP, X0 = (980 - totalW) / 2;
  const H = BH + (block.label ? 92 : 12);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {nodes.slice(0, -1).map((_, i) => {
            const d = easeOut((p - 0.22 - i * 0.14) / 0.4);
            if (d <= 0.01) return null;
            const x1 = X0 + (i + 1) * BW + i * GAP + 8, x2 = x1 + (GAP - 26) * d;
            return (
              <g key={i}>
                <line x1={x1} y1={BH / 2} x2={x2} y2={BH / 2} stroke={c.accent} strokeWidth={3.5} strokeLinecap="round" />
                {d >= 0.99 && <path d={head(x2 + 4, BH / 2, 0, 14)} fill={c.accent} />}
              </g>
            );
          })}
        </svg>
        {nodes.map((nd, i) => (
          <div key={i} style={{ position: "absolute", left: X0 + i * (BW + GAP), top: 0, width: BW, height: BH, ...boxStyle(i === n - 1), ...rise(p, 0.06 + i * 0.14, 16) }}>
            <span style={{ ...CLAMP2, WebkitLineClamp: 3 }}>{nd}</span>
          </div>
        ))}
        {block.label && (
          <div style={{ position: "absolute", left: 60, top: BH + 34, width: 860, textAlign: "center", ...MONO_LABEL, fontSize: 20, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.62) }}>{block.label}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- sequence

/** An exchange between 2-3 actors: arrows fire in order, each in its own fixed
 *  band so labels can never collide. variant 0: labels ride above their arrow ·
 *  variant 1: numbered arrows with the wording in a fixed list below. */
export const Sequence: React.FC<{ block: B<"sequence">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const actors = block.actors.slice(0, 3);
  const msgs = block.messages.slice(0, 4);
  const listed = block.variant === 1;
  const n = actors.length;
  const colW = 940 / n, X = (i: number) => 20 + colW * (i + 0.5);
  const HEAD = 92, BAND = listed ? 72 : 104;
  const H = HEAD + msgs.length * BAND + (listed ? msgs.length * 64 + 20 : 16);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {actors.map((_, i) => (
            <line key={i} x1={X(i)} y1={HEAD - 12} x2={X(i)} y2={HEAD + msgs.length * BAND - 10} stroke={a(c.ink, "33")} strokeWidth={2} strokeDasharray="7 9" opacity={clamp01(easeOut((p - i * 0.06) / 0.4))} />
          ))}
          {msgs.map((m, i) => {
            const d = easeOut((p - 0.2 - i * 0.16) / 0.4);
            if (d <= 0.01) return null;
            const from = X(Math.min(n - 1, Math.max(0, m.from))), to = X(Math.min(n - 1, Math.max(0, m.to)));
            const y = HEAD + i * BAND + BAND - 26;
            const dir = to >= from ? 0 : 180;
            const sx = from + (dir === 0 ? 12 : -12), ex = to + (dir === 0 ? -14 : 14);
            const x2 = sx + (ex - sx) * d;
            return (
              <g key={i}>
                <line x1={sx} y1={y} x2={x2} y2={y} stroke={c.accent} strokeWidth={3.5} strokeLinecap="round" />
                {d >= 0.99 && <path d={head(ex, y, dir, 15)} fill={c.accent} />}
                {listed && <Badge x={(sx + ex) / 2} y={y - 30} n={i + 1} c={c} on={d >= 0.5} r={19} />}
              </g>
            );
          })}
        </svg>
        {actors.map((act, i) => (
          <div key={i} style={{ position: "absolute", left: 20 + colW * i + 10, top: 6, width: colW - 20, height: 62, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px", borderRadius: 12, background: i === 0 ? c.accent : V("card"), border: `2.5px solid ${i === 0 ? c.accent : a(c.ink, "40")}`, fontFamily: V("font-ui"), fontWeight: 700, fontSize: 24, color: i === 0 ? V("accent-ink") : c.ink, ...rise(p, i * 0.07, 12) }}>
            <span style={{ ...ELLIPSIS, maxWidth: "100%" }}>{act}</span>
          </div>
        ))}
        {!listed && msgs.map((m, i) => {
          const from = X(Math.min(n - 1, Math.max(0, m.from))), to = X(Math.min(n - 1, Math.max(0, m.to)));
          const lo = Math.min(from, to), w = Math.max(180, Math.abs(to - from));
          return (
            <div key={i} style={{ position: "absolute", left: lo - (w - Math.abs(to - from)) / 2, top: HEAD + i * BAND + 12, width: w, textAlign: "center", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 23, color: c.ink, padding: "0 10px", boxSizing: "border-box", ...ELLIPSIS, ...rise(p, 0.24 + i * 0.16, 12) }}>{m.label}</div>
          );
        })}
        {listed && msgs.map((m, i) => (
          <div key={i} style={{ position: "absolute", left: 40, top: HEAD + msgs.length * BAND + 14 + i * 64, width: 900, display: "flex", gap: 16, alignItems: "center", ...rise(p, 0.3 + i * 0.16, 12) }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: c.accent, color: V("accent-ink"), flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 19 }}>{i + 1}</span>
            <span style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 24, color: c.ink, ...ELLIPSIS }}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- anatomy

type Anchor = { x: number; y: number };
const ANATOMY: Record<string, { draw: (c: BlockColors, p: number) => React.ReactNode; anchors: Anchor[] }> = {
  card: {
    anchors: [{ x: 420, y: 118 }, { x: 560, y: 254 }, { x: 400, y: 299 }, { x: 540, y: 373 }, { x: 612, y: 46 }],
    draw: (c, p) => (
      <>
        <rect x={340} y={16} width={300} height={430} rx={18} fill={V("card")} stroke={a(c.ink, "40")} strokeWidth={2.5} />
        <rect x={356} y={32} width={268} height={172} rx={12} fill={a(c.ink, "1A")} opacity={clamp01(easeOut((p - 0.06) / 0.4))} />
        <rect x={356} y={244} width={210} height={20} rx={8} fill={a(c.ink, "59")} opacity={clamp01(easeOut((p - 0.1) / 0.4))} />
        <rect x={356} y={292} width={150} height={14} rx={7} fill={a(c.ink, "2E")} opacity={clamp01(easeOut((p - 0.14) / 0.4))} />
        <rect x={356} y={344} width={190} height={58} rx={12} fill={c.accent} opacity={clamp01(easeOut((p - 0.18) / 0.4))} />
        <circle cx={612} cy={46} r={22} fill={c.accent} stroke={V("paper")} strokeWidth={3} opacity={clamp01(easeOut((p - 0.22) / 0.4))} />
      </>
    ),
  },
  button: {
    anchors: [{ x: 510, y: 232 }, { x: 392, y: 232 }, { x: 490, y: 296 }, { x: 490, y: 150 }, { x: 630, y: 200 }],
    draw: (c, p) => (
      <>
        <rect x={330} y={148} width={320} height={168} rx={26} fill="none" stroke={c.accent} strokeWidth={3} strokeDasharray="9 8" opacity={clamp01(easeOut((p - 0.2) / 0.4))} />
        <rect x={350} y={168} width={280} height={128} rx={20} fill={c.accent} opacity={clamp01(easeOut(p / 0.4))} />
        <circle cx={392} cy={232} r={22} fill={V("accent-ink")} opacity={0.85 * clamp01(easeOut((p - 0.08) / 0.4))} />
        <rect x={430} y={222} width={160} height={20} rx={10} fill={V("accent-ink")} opacity={0.9 * clamp01(easeOut((p - 0.12) / 0.4))} />
      </>
    ),
  },
  shape: {
    anchors: [{ x: 490, y: 100 }, { x: 372, y: 232 }, { x: 490, y: 366 }, { x: 608, y: 232 }, { x: 490, y: 232 }],
    draw: (c, p) => (
      <>
        <rect x={350} y={92} width={280} height={280} rx={70} fill={a(c.accent, "24")} stroke={c.accent} strokeWidth={3.5} opacity={clamp01(easeOut(p / 0.4))} />
        <rect x={410} y={152} width={160} height={160} rx={40} fill="none" stroke={a(c.ink, "73")} strokeWidth={2.5} strokeDasharray="8 8" opacity={clamp01(easeOut((p - 0.14) / 0.4))} />
        <circle cx={490} cy={232} r={30} fill={c.accent} opacity={clamp01(easeOut((p - 0.22) / 0.4))} />
      </>
    ),
  },
};

/** One drawn object with leader lines out to labels parked in FIXED columns —
 *  the labels never sit near the art, so they can never collide with it or each
 *  other. variant 0: labels split left and right · variant 1: all on the right. */
export const Anatomy: React.FC<{ block: B<"anatomy">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const kind = ANATOMY[block.object ?? "card"] ? (block.object ?? "card") : "card";
  const art = ANATOMY[kind];
  const parts = block.parts.slice(0, 5);
  const right = block.variant === 1;
  const H = 522;
  // Labels live in fixed slots: each side's slots are spread evenly down its
  // column and handed out in ANCHOR ORDER (top anchor -> top slot), so leader
  // lines never cross and two labels can never share a row.
  const TOP = 16, BOT = 412;
  const sideOf = (i: number) => (right || i === 4 ? 1 : i % 2 === 0 ? -1 : 1);
  const slots = React.useMemo(() => {
    const out: { side: -1 | 1; y: number }[] = parts.map(() => ({ side: 1 as const, y: TOP }));
    for (const s of [-1, 1] as const) {
      const idx = parts.map((_, i) => i).filter((i) => sideOf(i) === s);
      idx.sort((x, q) => (art.anchors[x]?.y ?? 0) - (art.anchors[q]?.y ?? 0));
      const step = idx.length > 1 ? (BOT - TOP) / (idx.length - 1) : 0;
      idx.forEach((i, k) => { out[i] = { side: s, y: idx.length > 1 ? Math.round(TOP + k * step) : Math.round((TOP + BOT) / 2) }; });
    }
    return out;
  }, [parts.length, right, kind]);
  const slotOf = (i: number) => slots[i] ?? { side: 1 as const, y: 24 };
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {art.draw(c, p)}
          {parts.map((_, i) => {
            const s = slotOf(i);
            const anc = art.anchors[i] ?? art.anchors[0];
            const d = easeOut((p - 0.3 - i * 0.1) / 0.4);
            if (d <= 0.01) return null;
            const endX = s.side < 0 ? 288 : 692;
            const endY = s.y + 22;
            const mx = anc.x + (endX - anc.x) * d, my = anc.y + (endY - anc.y) * d;
            return (
              <g key={i}>
                <line x1={anc.x} y1={anc.y} x2={mx} y2={my} stroke={a(c.ink, "8C")} strokeWidth={2} strokeDasharray="5 6" />
                <circle cx={anc.x} cy={anc.y} r={6} fill={c.accent} />
              </g>
            );
          })}
        </svg>
        {parts.map((t, i) => {
          const s = slotOf(i);
          return (
            <div key={i} style={{
              position: "absolute", top: s.y, ...(s.side < 0 ? { left: 0, width: 276, textAlign: "right" as const } : { left: 704, width: 276, textAlign: "left" as const }),
              ...rise(p, 0.34 + i * 0.1, 12),
            }}>
              <span style={{ ...MONO_LABEL, fontSize: 16, color: c.accent, display: "block", marginBottom: 4 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ display: "block", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 23, lineHeight: 1.3, color: c.ink, maxHeight: 62, ...CLAMP2 }}>{t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- race

/** Two markers running a track at different speeds — the comparison you can
 *  watch. Readouts count in a fixed right column. variant 0: race to the finish
 *  (whoever is faster gets there first) · variant 1: fixed time, so the slower
 *  one simply covers less ground. */
export const Race: React.FC<{ block: B<"race">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const runners = block.runners.slice(0, 2);
  const fixedTime = block.variant === 1;
  const max = Math.max(...runners.map((r) => r.value), 1);
  const min = Math.min(...runners.map((r) => r.value), max);
  const LANE = 162, X0 = 34, XF = 728;
  const H = runners.length * LANE + (block.label ? 66 : 8);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit={block.unit} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {runners.map((r, i) => {
            const y = i * LANE + 100;
            const span = fixedTime ? 0.86 : 0.86 * (r.value / max);
            const q = clamp01((p - 0.06) / Math.max(0.05, span));
            const reach = fixedTime ? min / r.value : 1;
            const x = X0 + (XF - X0) * easeOut(q) * reach;
            const col = i === 0 ? c.accent : a(c.ink, "A6");
            return (
              <g key={i}>
                <rect x={X0} y={y - 14} width={XF - X0} height={28} rx={14} fill={a(c.ink, "0D")} />
                <rect x={X0} y={y - 14} width={Math.max(0, x - X0)} height={28} rx={14} fill={col} opacity={0.32} />
                <line x1={XF} y1={y - 46} x2={XF} y2={y + 46} stroke={a(c.ink, "73")} strokeWidth={3} strokeDasharray="8 8" />
                <path d={`M ${XF} ${y - 46} L ${XF + 34} ${y - 34} L ${XF} ${y - 22} Z`} fill={a(c.ink, "40")} />
                <circle cx={x} cy={y} r={20} fill={col} stroke={V("paper")} strokeWidth={4} />
                {!fixedTime && q >= 0.999 && <Ripple x={XF} y={y} t={(p - 0.06 - span) / 0.6} color={col} r0={22} />}
              </g>
            );
          })}
        </svg>
        {runners.map((r, i) => {
          const span = fixedTime ? 0.86 : 0.86 * (r.value / max);
          const q = clamp01((p - 0.06) / Math.max(0.05, span));
          const done = p >= 0.06 + span;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", top: i * LANE + 14, left: 0, width: 560, fontFamily: V("font-ui"), fontWeight: done ? 700 : 600, fontSize: 27, color: i === 0 ? c.accent : c.ink, ...ELLIPSIS, ...rise(p, i * 0.08) }}>{r.label}</div>
              <div style={{ position: "absolute", top: i * LANE + 16, right: 0, width: 210, textAlign: "right", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 27, color: i === 0 ? c.accent : c.ink2, whiteSpace: "nowrap", opacity: clamp01(p * 5) }}>
                <CountNumber value={r.value} p={q} />{r.suffix ?? ""}
              </div>
            </React.Fragment>
          );
        })}
        {block.label && (
          <div style={{ position: "absolute", top: runners.length * LANE + 8, left: 40, width: 900, textAlign: "center", ...MONO_LABEL, fontSize: 20, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.7) }}>{block.label}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- stack

/** Layers of a system, drawn as a stack of planes peeling apart one by one.
 *  variant 0: 2.5D sheets with dashed leaders to a fixed label column ·
 *  variant 1: flat slabs with the label set inside each. */
export const Stack: React.FC<{ block: B<"stack">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const layers = block.layers.slice(0, 5);
  const flat = block.variant === 1;
  const n = layers.length;

  if (flat) {
    const ROW = 104, SW = 760, SX = 30;
    const H = n * ROW + 6;
    return (
      <div style={{ width: 980 }}>
        <Header title={block.title} c={c} />
        <div style={{ position: "relative", width: 980, height: H }}>
          {layers.map((l, i) => {
            const e = backOut((p - 0.08 - i * 0.12) / 0.5);
            const hot = block.highlight === i;
            return (
              <div key={i} style={{
                position: "absolute", left: SX + (n - 1 - i) * 22, top: i * ROW, width: SW, height: ROW - 14,
                boxSizing: "border-box", display: "flex", alignItems: "center", gap: 20, padding: "0 26px",
                borderRadius: 14, background: hot ? c.accent : V("card"), border: `2.5px solid ${hot ? c.accent : a(c.ink, "40")}`,
                boxShadow: `0 6px 0 ${a(c.ink, "14")}`,
                opacity: clamp01(e * 1.5), transform: `translateY(${(1 - clamp01(e)) * -22}px)`,
              }}>
                <span style={{ ...MONO_LABEL, fontSize: 17, color: hot ? V("accent-ink") : c.ink2, flexShrink: 0 }}>{String(n - i).padStart(2, "0")}</span>
                <span style={{ fontFamily: V("font-ui"), fontWeight: 700, fontSize: 27, color: hot ? V("accent-ink") : c.ink, ...ELLIPSIS }}>{l}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const CX = 320, TOP = 40, STEP = 98, RX = 224, RY = 66;
  const H = TOP + (n - 1) * STEP + RY * 2 + 30;
  const yOf = (i: number) => TOP + i * STEP + RY;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {layers.map((_, k) => {
            const i = n - 1 - k;   // draw bottom sheet first so upper ones overlap it
            const e = backOut((p - 0.08 - i * 0.12) / 0.5);
            if (e <= 0.02) return null;
            const y = yOf(i) + (1 - clamp01(e)) * -26;
            const hot = block.highlight === i;
            return (
              <g key={i} opacity={clamp01(e * 1.5)}>
                <path d={`M ${CX - RX} ${y} L ${CX} ${y - RY} L ${CX + RX} ${y} L ${CX} ${y + RY} Z`}
                  fill={hot ? a(c.accent, "45") : a(c.ink, "1C")} stroke={hot ? c.accent : a(c.ink, "8C")} strokeWidth={hot ? 3.5 : 2.5} strokeLinejoin="round" />
                <line x1={CX + RX} y1={y} x2={CX + RX + 118 * clamp01(easeOut((p - 0.24 - i * 0.12) / 0.4))} y2={y} stroke={a(c.ink, "59")} strokeWidth={2} strokeDasharray="5 6" />
              </g>
            );
          })}
        </svg>
        {layers.map((l, i) => (
          <div key={i} style={{ position: "absolute", left: 680, top: yOf(i) - 24, width: 300, ...rise(p, 0.28 + i * 0.12, 12) }}>
            <span style={{ ...MONO_LABEL, fontSize: 16, color: c.ink2, display: "block", marginBottom: 3 }}>{String(n - i).padStart(2, "0")}</span>
            <span style={{ display: "block", fontFamily: V("font-ui"), fontWeight: block.highlight === i ? 700 : 600, fontSize: 25, lineHeight: 1.26, color: block.highlight === i ? c.accent : c.ink, maxHeight: 66, ...CLAMP2 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- toggle

/** A switch thrown between two labelled states, with the consequence landing in
 *  a fixed slot beside it. variant 0: a pill switch · variant 1: a lever. */
export const Toggle: React.FC<{ block: B<"toggle">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const lever = block.variant === 1;
  const flip = clamp01(backOut((p - 0.3) / 0.42));
  const on = p >= 0.52;
  const CX = 490, TY = 40;
  const TW = 330, TH = 152;
  const HALF = lever ? 130 : TW / 2;   // the reserved half-width of the control
  const H = TY + TH + 190;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {lever ? (
            <>
              <rect x={CX - 118} y={TY + 40} width={236} height={112} rx={18} fill={a(c.ink, "12")} stroke={a(c.ink, "40")} strokeWidth={2.5} opacity={clamp01(easeOut(p / 0.35))} />
              <circle cx={CX} cy={TY + 138} r={17} fill={a(c.ink, "8C")} opacity={clamp01(easeOut(p / 0.35))} />
              <g transform={`rotate(${-40 + 80 * flip} ${CX} ${TY + 138})`}>
                <rect x={CX - 11} y={TY - 16} width={22} height={158} rx={11} fill={on ? c.accent : a(c.ink, "A6")} />
                <circle cx={CX} cy={TY - 4} r={26} fill={on ? c.accent : a(c.ink, "A6")} stroke={V("paper")} strokeWidth={4} />
              </g>
            </>
          ) : (
            <>
              <rect x={CX - TW / 2} y={TY} width={TW} height={TH} rx={TH / 2} fill={on ? c.accent : a(c.ink, "1F")} stroke={on ? c.accent : a(c.ink, "40")} strokeWidth={3} opacity={clamp01(easeOut(p / 0.35))} />
              <circle cx={CX - TW / 2 + TH / 2 + (TW - TH) * flip} cy={TY + TH / 2} r={TH / 2 - 15} fill={V("paper")} stroke={a(c.ink, "26")} strokeWidth={2} opacity={clamp01(easeOut(p / 0.35))} />
            </>
          )}
        </svg>
        <div style={{ position: "absolute", left: 20, top: TY + TH / 2 - 22, width: CX - HALF - 60, textAlign: "right", fontFamily: V("font-ui"), fontWeight: on ? 600 : 700, fontSize: 30, color: on ? c.ink2 : c.ink, ...ELLIPSIS, ...rise(p, 0.05) }}>{block.off}</div>
        <div style={{ position: "absolute", left: CX + HALF + 40, top: TY + TH / 2 - 22, width: 980 - (CX + HALF + 50), textAlign: "left", fontFamily: V("font-ui"), fontWeight: on ? 700 : 600, fontSize: 30, color: on ? c.accent : c.ink2, ...ELLIPSIS, ...rise(p, 0.05) }}>{block.on}</div>
        {block.result && (
          <div style={{ position: "absolute", left: 90, top: TY + TH + 54, width: 800, height: 100, textAlign: "center", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 30, lineHeight: 1.38, color: c.ink, ...CLAMP2, opacity: clamp01(easeOut((p - 0.58) / 0.35)), transform: `translateY(${(1 - clamp01(easeOut((p - 0.58) / 0.35))) * 18}px)` }}>{block.result}</div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- grid8

const SNAP_BLOCKS = [
  { col: 0, row: 0, w: 4, h: 2, dx: -27, dy: 19 },
  { col: 6, row: 0, w: 5, h: 2, dx: 33, dy: -15 },
  { col: 0, row: 3, w: 9, h: 1, dx: -19, dy: 27 },
  { col: 11, row: 3, w: 4, h: 3, dx: 25, dy: 21 },
];
const SNAP_BARS = [0.82, 0.64, 0.9, 0.55, 0.74];

/** The grid, demonstrated: elements drift in off-grid and snap onto it.
 *  variant 0: an 8-point layout grid · variant 1: a text baseline grid. */
export const Grid8: React.FC<{ block: B<"grid8">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const baseline = block.variant === 1;
  const GX = 40, CELL = 60, COLS = 15, ROWS = 7;
  const GW = COLS * CELL, GH = ROWS * CELL;
  const grid = easeOut(p / 0.35);
  const H = GH + 84;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {/* a card panel so the demo's own grid reads against ANY surface */}
          <rect x={GX - 16} y={-16} width={GW + 32} height={GH + 32} rx={14} fill={V("card")} stroke={a(c.ink, "33")} strokeWidth={2} opacity={clamp01(grid)} />
          {!baseline && Array.from({ length: COLS + 1 }).map((_, k) => (
            <line key={`v${k}`} x1={GX + k * CELL} y1={0} x2={GX + k * CELL} y2={GH * clamp01(grid)} stroke={a(c.ink, k % 5 === 0 ? "59" : "2E")} strokeWidth={k % 5 === 0 ? 2 : 1} />
          ))}
          {Array.from({ length: ROWS + 1 }).map((_, k) => (
            <line key={`h${k}`} x1={GX} y1={k * CELL} x2={GX + GW * clamp01(grid)} y2={k * CELL} stroke={a(c.ink, baseline ? "4D" : k % 5 === 0 ? "59" : "2E")} strokeWidth={baseline ? 1.5 : k % 5 === 0 ? 2 : 1} strokeDasharray={baseline ? "6 7" : undefined} />
          ))}
          {/* GHOST outlines mark where each element started, off-grid — the snap
              stays legible in a still frame, not only in motion */}
          {!baseline && SNAP_BLOCKS.map((b, i) => {
            const s = backOut((p - 0.26 - i * 0.12) / 0.5);
            const off = 1 - clamp01(s);
            return (
              <React.Fragment key={i}>
                <rect x={GX + b.col * CELL + 6 + b.dx} y={b.row * CELL + 6 + b.dy} width={b.w * CELL - 12} height={b.h * CELL - 12} rx={10}
                  fill="none" stroke={a(c.ink, "4D")} strokeWidth={2} strokeDasharray="7 7" opacity={0.55 * clamp01(s * 2)} />
                <rect
                  x={GX + b.col * CELL + 6 + b.dx * off} y={b.row * CELL + 6 + b.dy * off}
                  width={b.w * CELL - 12} height={b.h * CELL - 12} rx={10}
                  fill={i === 0 ? c.accent : a(c.ink, "3D")} stroke={i === 0 ? c.accent : a(c.ink, "8C")} strokeWidth={2.5}
                  opacity={clamp01(s * 2)} />
              </React.Fragment>
            );
          })}
          {baseline && SNAP_BARS.map((w, i) => {
            const s = backOut((p - 0.24 - i * 0.11) / 0.5);
            const off = 1 - clamp01(s);
            const dx = [0, 17, -13, 9, -8][i], dy = [11, -14, 17, -9, 13][i];
            return (
              <React.Fragment key={i}>
                <rect x={GX + 40 + dx} y={CELL * (i + 1) - 26 + dy} width={(GW - 120) * w} height={22} rx={11}
                  fill="none" stroke={a(c.ink, "4D")} strokeWidth={2} strokeDasharray="7 7" opacity={0.55 * clamp01(s * 2)} />
                <rect x={GX + 40 + dx * off} y={CELL * (i + 1) - 26 + dy * off} width={(GW - 120) * w} height={22} rx={11}
                  fill={i === 0 ? c.accent : a(c.ink, "4D")} opacity={clamp01(s * 2)} />
              </React.Fragment>
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: 40, top: GH + 26, width: 900, textAlign: "center", ...MONO_LABEL, fontSize: 20, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.66) }}>
          {block.label ?? (baseline ? "every line lands on the baseline" : "every edge lands on the grid")}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- contrastcheck

/** Colour pairs judged: the sample sits on its own swatch, the ratio counts up
 *  in a fixed slot and a drawn badge says pass or fail. variant 0: two swatch
 *  cards side by side · variant 1: stacked rows with the verdict in a column. */
export const ContrastCheck: React.FC<{ block: B<"contrastcheck">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rows = block.pairs.slice(0, 2);
  const stacked = block.variant === 1;
  const ratioOf = (r: (typeof rows)[0]) => r.ratio ?? (r.fg && r.bg ? contrastRatio(r.fg, r.bg) : 4.5);
  const H = stacked ? rows.length * 172 + 6 : 366;
  const badge = (pass: boolean, e: number, w: number): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 10, boxSizing: "border-box", width: w, justifyContent: "center",
    height: 46, borderRadius: 23, padding: "0 18px",
    background: pass ? c.accent : "transparent", border: `2.5px solid ${pass ? c.accent : a(c.ink, "73")}`,
    borderStyle: pass ? "solid" : "dashed",
    fontFamily: V("font-mono"), fontWeight: 700, fontSize: 18, letterSpacing: ".12em",
    color: pass ? V("accent-ink") : c.ink2, opacity: clamp01(e), whiteSpace: "nowrap",
  });
  const glyph = (pass: boolean, col: string) => (
    <svg viewBox="0 0 24 24" width={20} height={20} style={{ flexShrink: 0 }}>
      {pass
        ? <path d="M 4 12 L 10 18 L 20 6" fill="none" stroke={col} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M 6 6 L 18 18 M 18 6 L 6 18" fill="none" stroke={col} strokeWidth={3.4} strokeLinecap="round" />}
    </svg>
  );

  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        {rows.map((r, i) => {
          const ratio = ratioOf(r);
          const pass = ratio >= 4.5;
          const e = easeOut((p - 0.1 - i * 0.18) / 0.45);
          const cnt = easeOut((p - 0.22 - i * 0.18) / 0.55);
          const bg = r.bg ?? (i === 0 ? "#FFFFFF" : "#DDDDDD");
          const fg = r.fg ?? (i === 0 ? "#111111" : "#AAAAAA");
          if (stacked) {
            return (
              <div key={i} style={{ position: "absolute", top: i * 172, left: 0, width: 980, height: 152, ...rise(p, 0.1 + i * 0.18) }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 440, height: 128, borderRadius: 14, background: bg, border: `2px solid ${a(c.ink, "33")}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 42, color: fg, padding: "0 18px", ...ELLIPSIS, maxWidth: "100%" }}>{r.sample ?? "Sample text"}</span>
                </div>
                <div style={{ position: "absolute", left: 476, top: 8, width: 324, fontFamily: V("font-ui"), fontWeight: 600, fontSize: 24, color: c.ink, ...ELLIPSIS }}>{r.label}</div>
                <div style={{ position: "absolute", left: 476, top: 52, width: 200, fontFamily: V("font-mono"), fontWeight: 700, fontSize: 36, color: pass ? c.accent : c.ink2, whiteSpace: "nowrap" }}>
                  <CountFixed value={ratio} p={cnt} />:1
                </div>
                <div style={{ position: "absolute", right: 0, top: 44 }}>
                  <span style={badge(pass, e, 168)}>{glyph(pass, pass ? "var(--accent-ink)" : c.ink2)}{pass ? "PASS" : "FAIL"}</span>
                </div>
              </div>
            );
          }
          const X = i * 500;
          return (
            <div key={i} style={{ position: "absolute", top: 0, left: X, width: 480, ...rise(p, 0.1 + i * 0.18) }}>
              <div style={{ width: 480, height: 176, borderRadius: 16, background: bg, border: `2px solid ${a(c.ink, "33")}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 46, color: fg, padding: "0 20px", ...ELLIPSIS, maxWidth: "100%" }}>{r.sample ?? "Sample text"}</span>
              </div>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 40, color: pass ? c.accent : c.ink2, whiteSpace: "nowrap" }}>
                  <CountFixed value={ratio} p={cnt} />:1
                </span>
                <span style={badge(pass, e, 158)}>{glyph(pass, pass ? "var(--accent-ink)" : c.ink2)}{pass ? "PASS" : "FAIL"}</span>
              </div>
              <div style={{ marginTop: 16, width: 480, ...MONO_LABEL, fontSize: 19, color: c.ink2, ...ELLIPSIS }}>{r.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- typescale

/** A type ramp landing one step at a time — hierarchy you can see. Sizes count
 *  in a fixed column so the sample text never has to move. variant 0: ramp left,
 *  sizes right · variant 1: centred ramp, name and size under each step. */
export const TypeScale: React.FC<{ block: B<"typescale">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const steps = block.steps.slice(0, 5);
  const centred = block.variant === 1;
  const rowH = (s: number) => Math.round(s * (centred ? 1.9 : 1.42)) + 18;
  const tops: number[] = [];
  let acc = 0;
  for (const s of steps) { tops.push(acc); acc += rowH(Math.min(96, s.size)); }
  const H = acc + 8;
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} unit="px" c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        {steps.map((s, i) => {
          const size = Math.min(96, s.size);
          const e = easeOut((p - 0.08 - i * 0.12) / 0.45);
          return (
            <React.Fragment key={i}>
              <div style={{
                position: "absolute", top: tops[i], left: centred ? 40 : 0, width: centred ? 900 : 672,
                textAlign: centred ? "center" : "left", height: size * 1.3, lineHeight: `${size * 1.3}px`,
                fontFamily: V("font-display"), fontWeight: 700, fontSize: size, letterSpacing: "-.02em",
                color: i === 0 ? c.accent : c.ink, ...ELLIPSIS,
                opacity: clamp01(e), transform: `translateY(${(1 - clamp01(e)) * 16}px)`,
              }}>{s.sample ?? "The quick brown fox"}</div>
              <div style={{
                position: "absolute",
                ...(centred
                  ? { top: tops[i] + size * 1.3 + 4, left: 40, width: 900, textAlign: "center" as const }
                  : { top: tops[i] + size * 0.55, left: 692, width: 288, textAlign: "right" as const }),
                ...MONO_LABEL, fontSize: centred ? 19 : 16, letterSpacing: centred ? ".16em" : ".08em", color: c.ink2, whiteSpace: "nowrap", overflow: "hidden",
                opacity: clamp01(easeOut((p - 0.14 - i * 0.12) / 0.45)),
              }}>
                {trunc(s.label, centred ? 22 : 17)} · <CountNumber value={s.size} p={easeOut((p - 0.14 - i * 0.12) / 0.5)} plain /> px
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- zoomcompare

/** The same element at two scales, so the difference stops being abstract.
 *  Readouts count in fixed slots. variant 0: side by side on one baseline ·
 *  variant 1: the small one nested inside the big one. */
export const ZoomCompare: React.FC<{ block: B<"zoomcompare">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const items = block.items.slice(0, 2);
  const nested = block.variant === 1;
  const max = Math.max(...items.map((i) => i.size), 1);
  const px = (v: number) => Math.max(14, (v / max) * 260);
  const BASE = 300;
  const H = BASE + (block.note ? (nested ? 250 : 204) : nested ? 164 : 130);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 980, height: H }}>
        <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
          {nested ? (
            (() => {
              const big = px(Math.max(...items.map((i) => i.size)));
              const small = px(Math.min(...items.map((i) => i.size)));
              const e0 = backOut(p / 0.5), e1 = backOut((p - 0.24) / 0.5);
              return (
                <>
                  <rect x={490 - big / 2} y={BASE - big} width={big} height={big} rx={16} fill={a(c.ink, "1A")} stroke={a(c.ink, "73")} strokeWidth={3} opacity={clamp01(e0 * 1.6)} />
                  <rect x={490 - small / 2} y={BASE - big / 2 - small / 2} width={small} height={small} rx={Math.min(10, small / 3)} fill={c.accent} opacity={clamp01(e1 * 1.6)} />
                  <line x1={490 - big / 2} y1={BASE + 22} x2={490 - big / 2} y2={BASE + 46} stroke={a(c.ink, "73")} strokeWidth={2} opacity={clamp01(e0)} />
                  <line x1={490 + big / 2} y1={BASE + 22} x2={490 + big / 2} y2={BASE + 46} stroke={a(c.ink, "73")} strokeWidth={2} opacity={clamp01(e0)} />
                  <line x1={490 - big / 2} y1={BASE + 34} x2={490 + big / 2} y2={BASE + 34} stroke={a(c.ink, "73")} strokeWidth={2} opacity={clamp01(e0)} />
                </>
              );
            })()
          ) : (
            items.map((it, i) => {
              const s = px(it.size);
              const e = backOut((p - 0.06 - i * 0.2) / 0.5);
              const cx = 240 + i * 480;
              return (
                <g key={i} opacity={clamp01(e * 1.6)}>
                  <rect x={cx - s / 2} y={BASE - s} width={s} height={s} rx={Math.min(16, s / 4)} fill={i === 0 ? a(c.ink, "26") : c.accent} stroke={i === 0 ? a(c.ink, "73")
                    : c.accent} strokeWidth={3} />
                </g>
              );
            })
          )}
          <line x1={40} y1={BASE + 2} x2={940} y2={BASE + 2} stroke={a(c.ink, "40")} strokeWidth={2.5} />
        </svg>
        {items.map((it, i) => (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", top: BASE + (nested ? 66 : 24), left: nested ? (i === 0 ? 20 : 520) : i * 480 + 20, width: 440, textAlign: nested ? (i === 0 ? "left" : "right") : "center", fontFamily: V("font-ui"), fontWeight: 700, fontSize: 26, color: i === 1 ? c.accent : c.ink, ...ELLIPSIS, ...rise(p, 0.24 + i * 0.14) }}>{it.label}</div>
            <div style={{ position: "absolute", top: BASE + (nested ? 108 : 66), left: nested ? (i === 0 ? 20 : 520) : i * 480 + 20, width: 440, textAlign: nested ? (i === 0 ? "left" : "right") : "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 34, color: i === 1 ? c.accent : c.ink2, whiteSpace: "nowrap", opacity: clamp01(easeOut((p - 0.24 - i * 0.14) / 0.4)) }}>
              <CountNumber value={it.size} p={easeOut((p - 0.2 - i * 0.14) / 0.55)} plain />{it.suffix ?? " px"}
            </div>
          </React.Fragment>
        ))}
        <Note text={block.note} c={c} p={p} top={BASE + (nested ? 160 : 118)} width={860} delay={0.6} />
      </div>
    </div>
  );
};
