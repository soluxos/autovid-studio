import React from "react";
import { Img, staticFile } from "remotion";
import type { VisualBlock } from "./doc-types";
import { CountNumber, clamp01, easeOut, backOut, V, a, type BlockColors } from "./blocks";
import { Header, MONO_LABEL } from "./blocks2";
import { ah, trunc } from "./blocks3";

// Block library wave 2, part 2: kinetic type, tables, and physical "prop"
// blocks (receipt, ticket, polaroid, clipping, letter...). Same design laws:
// zero layout shift, CountNumber for every animating number, translate+opacity
// entrances on text (never scaled; static tilts on props are fine — they never
// animate), fixed slots, long labels ellipsised, adjacent labels staggered.

type B<T extends VisualBlock["type"]> = Extract<VisualBlock, { type: T }>;

const ELLIPSIS: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
/** staggered translate+opacity entrance (the only legal text entrance) */
const rise = (p: number, delay: number, dist = 20): React.CSSProperties => {
  const e = easeOut((p - delay) / 0.45);
  return { opacity: clamp01(e), transform: `translateY(${(1 - e) * dist}px)` };
};

// ---------------------------------------------------------------- venn

/** Two-set overlap: circles draw on and tint, lens emphasized; set labels
 *  anchor to their outer edges, overlap label on its own lower row (staggered
 *  rows — three long labels can never collide). variant 1 counts a % in the lens. */
export const Venn: React.FC<{ block: B<"venn">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const id = React.useId();
  const R = 168, CXA = 352, CXB = 588, CY = 210;
  const draw = easeOut(p / 0.55);
  const lensIn = easeOut((p - 0.4) / 0.4);
  return (
    <div style={{ width: 980 }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative", width: 940, height: 512 }}>
        <svg viewBox="0 0 940 420" width={940} height={420} style={{ position: "absolute", top: 0, left: 0 }}>
          <defs><clipPath id={id}><circle cx={CXA} cy={CY} r={R} /></clipPath></defs>
          <circle cx={CXA} cy={CY} r={R} fill={a(c.accent, "21")} opacity={clamp01(draw * 1.6)} />
          <circle cx={CXB} cy={CY} r={R} fill={a(c.ink, "17")} opacity={clamp01((draw - 0.15) * 1.6)} />
          <g clipPath={`url(#${id})`}>
            <circle cx={CXB} cy={CY} r={R} fill={a(c.accent, "52")} opacity={clamp01(lensIn)} />
          </g>
          <circle cx={CXA} cy={CY} r={R} fill="none" stroke={c.accent} strokeWidth={3.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(draw)} transform={`rotate(-90 ${CXA} ${CY})`} />
          <circle cx={CXB} cy={CY} r={R} fill="none" stroke={a(c.ink, "8C")} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(easeOut((p - 0.15) / 0.55))} transform={`rotate(90 ${CXB} ${CY})`} />
          {/* leader from the lens down to the overlap label row */}
          <line x1={470} y1={CY + R - 26} x2={470} y2={452 - 42} stroke={a(c.accent, "8C")} strokeWidth={2} strokeDasharray="4 5" opacity={clamp01((lensIn - 0.3) * 2.5)} />
        </svg>
        {block.overlapValue != null && (
          <div style={{ position: "absolute", left: 470 - 90, top: CY - 34, width: 180, textAlign: "center", fontFamily: V("font-mono"), fontWeight: 700, fontSize: 46, color: c.accent, opacity: clamp01(lensIn), whiteSpace: "nowrap" }}>
            <CountNumber value={block.overlapValue} p={easeOut((p - 0.4) / 0.5)} />%
          </div>
        )}
        {/* set labels on row one, anchored to their outer edges */}
        <div style={{ position: "absolute", top: 408, left: 0, width: 440, textAlign: "left", fontFamily: V("font-ui"), fontWeight: 700, fontSize: 26, color: c.accent, ...ELLIPSIS, ...rise(p, 0.12) }}>{block.a}</div>
        <div style={{ position: "absolute", top: 408, right: 0, width: 440, textAlign: "right", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 26, color: c.ink, ...ELLIPSIS, ...rise(p, 0.24) }}>{block.b}</div>
        {/* overlap label on its own second row, centred */}
        <div style={{ position: "absolute", top: 464, left: 190, width: 560, textAlign: "center", ...MONO_LABEL, fontSize: 21, color: c.accent, ...ELLIPSIS, ...rise(p, 0.5) }}>{block.overlap}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- wordstack

/** Kinetic type list: 3-6 big words sliding in; one carries the accent.
 *  variant 0: left-aligned stack · variant 1: centred. */
export const WordStack: React.FC<{ block: B<"wordstack">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const words = block.words.slice(0, 6);
  const hi = block.highlight ?? words.length - 1;
  const maxLen = Math.max(...words.map((w) => w.length), 1);
  const size = Math.min(104, Math.max(46, Math.floor(1560 / maxLen)));
  const center = block.variant === 1;
  return (
    <div style={{ width: 940, textAlign: center ? "center" : "left" }}>
      {words.map((w, i) => {
        const e = easeOut((p - i * 0.11) / 0.45);
        const hot = i === hi;
        return (
          <div key={i} style={{
            fontFamily: V("font-display"), fontWeight: 700, fontSize: size, lineHeight: 1.14, letterSpacing: "-.03em",
            color: hot ? c.accent : c.ink, opacity: clamp01(e) * (hot ? 1 : 0.42), ...ELLIPSIS,
            transform: `translateX(${(1 - e) * (center ? 0 : -44)}px) translateY(${(1 - e) * (center ? 26 : 0)}px)`,
          }}>{w}</div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- checklist

/** Items ticking off one by one — the check stroke draws itself. variant 0:
 *  plain ticks · variant 1: done items also get a drawn strike-through. */
export const Checklist: React.FC<{ block: B<"checklist">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const items = block.items.slice(0, 6);
  return (
    <div style={{ width: 860 }}>
      <Header title={block.title} c={c} />
      {items.map((it, i) => {
        const e = easeOut((p - i * 0.1) / 0.4);
        const tick = easeOut((p - 0.22 - i * 0.12) / 0.32);
        const done = it.done !== false;
        const struck = block.variant === 1 && done;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 1fr", columnGap: 26, alignItems: "center", height: 88, opacity: clamp01(e), transform: `translateX(${(1 - e) * -26}px)` }}>
            <svg viewBox="0 0 56 56" width={56} height={56}>
              <rect x={3} y={3} width={50} height={50} rx={12} fill="none" stroke={done ? a(c.ink, "8C") : a(c.ink, "40")} strokeWidth={3} strokeDasharray={done ? undefined : "6 6"} />
              {done && tick > 0.01 && (
                <path d="M 14 29 L 24 39 L 43 17" fill="none" stroke={c.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(tick)} />
              )}
            </svg>
            <div style={{ minWidth: 0 }}>
              {/* strike lives inside an inline-block so it always matches the text width */}
              <span style={{ position: "relative", display: "inline-block", maxWidth: "100%", fontFamily: V("font-ui"), fontWeight: 600, fontSize: 31, color: done ? (struck ? c.ink2 : c.ink) : c.ink2, ...ELLIPSIS, verticalAlign: "middle" }}>
                {it.label}
                {struck && <span style={{ position: "absolute", left: -4, right: -6, top: "50%", height: 3.5, background: a(c.ink, "73"), borderRadius: 2, transform: `scaleX(${clamp01(tick)})`, transformOrigin: "left" }} />}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- versus

/** Two columns × up to 4 rows, head to head. variant 0: the accent side sits
 *  on a tinted panel · variant 1: ruled table with an accent header underline. */
export const Versus: React.FC<{ block: B<"versus">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rows = block.rows.slice(0, 4);
  const acc = block.accent ?? 1;
  const COLS = "236px 1fr 1fr";
  const tinted = block.variant !== 1;
  return (
    <div style={{ width: 940, position: "relative" }}>
      <Header title={block.title} c={c} />
      <div style={{ position: "relative" }}>
        {tinted && (
          <div style={{ position: "absolute", top: -8, bottom: -8, left: acc === 0 ? 236 : "calc(236px + (100% - 236px) / 2)", width: "calc((100% - 236px) / 2)", background: a(c.accent, "14"), borderRadius: 14, opacity: clamp01(easeOut(p / 0.4)) }} />
        )}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: COLS, alignItems: "center", height: 74, ...rise(p, 0) }}>
          <span />
          {[block.left, block.right].map((h, j) => (
            <span key={j} style={{ textAlign: "center", fontFamily: V("font-display"), fontWeight: 700, fontSize: 31, color: acc === j ? c.accent : c.ink, padding: "0 16px", ...ELLIPSIS }}>{h}</span>
          ))}
        </div>
        {block.variant === 1 && <div style={{ height: 3, background: c.accent, transform: `scaleX(${easeOut(p / 0.5)})`, transformOrigin: "left" }} />}
        {rows.map((r, i) => {
          const e = easeOut((p - 0.14 - i * 0.11) / 0.45);
          return (
            <div key={i} style={{ position: "relative", display: "grid", gridTemplateColumns: COLS, alignItems: "center", height: 84, borderTop: `1px solid ${a(c.ink, "1F")}`, opacity: clamp01(e), transform: `translateY(${(1 - e) * 14}px)` }}>
              <span style={{ ...MONO_LABEL, fontSize: 19, color: c.ink2, textAlign: "right", paddingRight: 26, ...ELLIPSIS }}>{r.label}</span>
              {[r.a, r.b].map((val, j) => (
                <span key={j} style={{ textAlign: "center", fontFamily: V("font-ui"), fontWeight: acc === j ? 700 : 600, fontSize: 27, color: acc === j ? c.accent : c.ink, padding: "0 16px", ...ELLIPSIS }}>{val}</span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- odometer

/** Big rolling digits: every digit cell has a FIXED width and its column of
 *  glyphs translates into place (translate-only text motion — the odometer
 *  version of CountNumber). variant 0: open + baseline · variant 1: boxed
 *  flip-clock cells. */
export const Odometer: React.FC<{ block: B<"odometer">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const str = Math.round(block.value).toLocaleString();
  const chars = str.split("");
  const digitsOnly = chars.filter((ch) => /\d/.test(ch));
  const boxed = block.variant === 1;
  const SIZE = Math.min(168, Math.floor(880 / (chars.length + (boxed ? chars.length * 0.28 : 0)) / 0.62));
  let di = -1;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: boxed ? 10 : 0 }}>
        {block.prefix && <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: SIZE * 0.45, lineHeight: `${SIZE}px`, color: c.accent, marginRight: 12 }}>{block.prefix}</span>}
        {chars.map((ch, i) => {
          if (!/\d/.test(ch)) {
            return <span key={i} style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: SIZE * 0.86, height: SIZE, lineHeight: `${SIZE}px`, color: c.accent, width: SIZE * 0.3, textAlign: "center", display: "inline-block" }}>{ch}</span>;
          }
          di++;
          const digit = +ch;
          const rev = Math.min(2, digitsOnly.length - 1 - di); // low digits spin more
          const totalSteps = rev * 10 + digit;
          const dp = easeOut((p - di * 0.07) / 0.62);
          const yEm = totalSteps * dp;
          return (
            <span key={i} style={{
              position: "relative", display: "inline-block", width: SIZE * 0.62, height: SIZE, overflow: "hidden",
              ...(boxed ? { background: V("card"), border: `1.5px solid ${a(c.ink, "26")}`, borderRadius: 14, boxShadow: `0 4px 14px ${a(c.ink, "14")}` } : {}),
            }}>
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-yEm * SIZE}px)` }}>
                {Array.from({ length: totalSteps + 1 }).map((_, k) => (
                  <span key={k} style={{ display: "block", height: SIZE, lineHeight: `${SIZE}px`, textAlign: "center", fontFamily: V("font-display"), fontWeight: 700, fontSize: SIZE * 0.86, letterSpacing: "-.02em", color: c.accent, fontVariantNumeric: "tabular-nums" }}>{k % 10}</span>
                ))}
              </span>
              {boxed && <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: a(c.ink, "1F") }} />}
            </span>
          );
        })}
        {block.suffix && <span style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: SIZE * 0.45, lineHeight: `${SIZE}px`, color: c.accent, marginLeft: 12 }}>{block.suffix}</span>}
      </div>
      {!boxed && <div style={{ width: 220, height: 4, background: a(c.ink, "40"), borderRadius: 2, margin: "30px auto 0", transform: `scaleX(${easeOut((p - 0.2) / 0.5)})` }} />}
      <div style={{ ...MONO_LABEL, fontSize: 26, color: c.ink2, marginTop: boxed ? 36 : 22, ...ELLIPSIS, maxWidth: 900, marginLeft: "auto", marginRight: "auto" }}>{block.label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- flowshare

/** One source splitting into 2-3 destinations: ribbons draw across, width ∝
 *  share; every node is a fixed slot. variant 0: curved ribbons · variant 1:
 *  straight taper lines. */
export const FlowShare: React.FC<{ block: B<"flowshare">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const dests = block.dests.slice(0, 3);
  const total = dests.reduce((s, d) => s + d.value, 0) || 1;
  const H = Math.max(380, dests.length * 158);
  const SY = H / 2;
  const dy = (i: number) => (i + 0.5) * (H / dests.length);
  const X1 = 258, X2 = 660;
  return (
    <div style={{ position: "relative", width: 980, height: H }}>
      <svg viewBox={`0 0 980 ${H}`} width={980} height={H} style={{ position: "absolute", inset: 0 }}>
        {dests.map((d, i) => {
          const share = d.value / total;
          const w = Math.max(10, share * 120);
          const draw = easeOut((p - 0.18 - i * 0.13) / 0.5);
          if (draw <= 0.01) return null;
          const path = block.variant === 1
            ? `M ${X1} ${SY} L ${X2} ${dy(i)}`
            : `M ${X1} ${SY} C ${X1 + 190} ${SY} ${X2 - 190} ${dy(i)} ${X2} ${dy(i)}`;
          return <path key={i} d={path} fill="none" stroke={`${c.accent}${ah(0.3 + 0.6 * share)}`} strokeWidth={w} strokeLinecap="butt" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(draw)} />;
        })}
      </svg>
      {/* source node: fixed left slot */}
      <div style={{ position: "absolute", left: 0, top: SY - 62, width: 244, ...rise(p, 0) }}>
        <div style={{ background: V("card"), border: `1.5px solid ${a(c.ink, "26")}`, borderRadius: 16, padding: "20px 24px", textAlign: "right" }}>
          <div style={{ fontFamily: V("font-ui"), fontWeight: 700, fontSize: 27, color: c.ink, ...ELLIPSIS }}>{block.source.label}</div>
          {block.source.value != null && (
            <div style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: c.accent, marginTop: 6, whiteSpace: "nowrap" }}>
              <CountNumber value={block.source.value} p={easeOut(p / 0.55)} />{block.source.suffix ?? ""}{block.unit ? ` ${block.unit}` : ""}
            </div>
          )}
        </div>
      </div>
      {/* destination nodes: fixed right slots */}
      {dests.map((d, i) => (
        <div key={i} style={{ position: "absolute", left: X2 + 28, width: 980 - X2 - 28, top: dy(i) - 44, ...rise(p, 0.42 + i * 0.13) }}>
          <div style={{ fontFamily: V("font-ui"), fontWeight: 600, fontSize: 25, color: c.ink, ...ELLIPSIS }}>{d.label}</div>
          <div style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 24, color: c.accent, marginTop: 4, whiteSpace: "nowrap" }}>
            <CountNumber value={d.value} p={easeOut((p - 0.42 - i * 0.13) / 0.5)} />{d.suffix ?? ""}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- orbit

/** Hub + satellites on a drawn dashed ring, spokes connecting. variant 0: one
 *  ring · variant 1: two rings (alternating satellites). */
export const Orbit: React.FC<{ block: B<"orbit">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const sats = block.satellites.slice(0, 6);
  const CX = 470, CY = 330, W = 940, H = 660;
  const two = block.variant === 1;
  const ring = (i: number) => (two && i % 2 === 1 ? { rx: 380, ry: 272 } : { rx: 300, ry: 205 });
  const pos = (i: number) => {
    const ang = (-90 + (360 / sats.length) * i) * (Math.PI / 180);
    const r = ring(i);
    return { x: CX + r.rx * Math.cos(ang), y: CY + r.ry * Math.sin(ang) };
  };
  const ringDraw = easeOut(p / 0.6);
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={CX} cy={CY} rx={300} ry={205} fill="none" stroke={a(c.ink, "40")} strokeWidth={2} strokeDasharray="3 9" strokeOpacity={clamp01(ringDraw * 2)} />
        {two && <ellipse cx={CX} cy={CY} rx={380} ry={272} fill="none" stroke={a(c.ink, "2E")} strokeWidth={2} strokeDasharray="3 9" strokeOpacity={clamp01((ringDraw - 0.2) * 2)} />}
        {sats.map((_, i) => {
          const q = pos(i);
          const draw = easeOut((p - 0.2 - i * 0.09) / 0.4);
          return <line key={i} x1={CX} y1={CY} x2={CX + (q.x - CX) * draw} y2={CY + (q.y - CY) * draw} stroke={a(c.ink, "30")} strokeWidth={1.5} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: CX, top: CY, transform: "translate(-50%,-50%)", ...rise(p, 0.02, 14), maxWidth: 470 }}>
        <div style={{ background: c.accent, color: V("accent-ink"), borderRadius: 18, padding: "18px 30px", fontFamily: V("font-display"), fontWeight: 700, fontSize: 33, ...ELLIPSIS }}>{block.center}</div>
      </div>
      {sats.map((s, i) => {
        const q = pos(i);
        const e = easeOut((p - 0.3 - i * 0.09) / 0.4);
        return (
          <div key={i} style={{ position: "absolute", left: q.x, top: q.y, transform: `translate(-50%,-50%) translateY(${(1 - e) * 14}px)`, opacity: clamp01(e), maxWidth: 300 }}>
            <div style={{ background: V("paper"), border: `2px solid ${a(c.ink, "59")}`, borderRadius: 999, padding: "10px 22px", ...MONO_LABEL, fontSize: 19, color: c.ink, ...ELLIPSIS }}>{s}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- thermometer

/** Progress toward a goal: a tube filling, goal tick at the top, counted
 *  readout in a fixed slot. variant 0: vertical + bulb · variant 1: horizontal. */
export const Thermometer: React.FC<{ block: B<"thermometer">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const frac = clamp01(block.value / (block.goal || 1));
  const grow = easeOut((p - 0.1) / 0.65);
  const readout = (big: number) => (
    <>
      <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: big, lineHeight: 0.95, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
        <CountNumber value={block.value} p={grow} />{block.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 6 }}>{block.suffix}</span> : null}
      </div>
      <div style={{ fontFamily: V("font-mono"), fontSize: 22, color: c.ink2, marginTop: 12, whiteSpace: "nowrap" }}>
        of {Math.round(block.goal).toLocaleString()}{block.suffix ?? ""} goal
      </div>
      <div style={{ ...MONO_LABEL, fontSize: 22, color: c.ink2, marginTop: 20, overflow: "hidden", maxHeight: 88, lineHeight: 1.3 }}>{block.label}</div>
    </>
  );
  if (block.variant === 1) {
    return (
      <div style={{ width: 940 }}>
        <div style={{ position: "relative", height: 76 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 38, border: `3px solid ${a(c.ink, "59")}`, background: a(c.ink, "0A") }} />
          <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: `calc(${frac * grow * 100}% - 16px)`, minWidth: 40, borderRadius: 30, background: c.accent }} />
          <div style={{ position: "absolute", top: -14, bottom: -14, right: 0, width: 4, background: c.ink, opacity: clamp01((p - 0.3) * 3) }} />
          <div style={{ position: "absolute", top: -48, right: 0, ...MONO_LABEL, fontSize: 19, color: c.ink2, whiteSpace: "nowrap" }}>goal {Math.round(block.goal).toLocaleString()}{block.suffix ?? ""}</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 44 }}>{readout(104)}</div>
      </div>
    );
  }
  const TUBE_H = 470, TUBE_W = 92;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 78, width: 980 }}>
      <div style={{ position: "relative", width: 150, height: TUBE_H + 130 }}>
        <div style={{ position: "absolute", left: (150 - TUBE_W) / 2, top: 0, width: TUBE_W, height: TUBE_H, borderRadius: `${TUBE_W / 2}px ${TUBE_W / 2}px 18px 18px`, border: `3.5px solid ${a(c.ink, "59")}`, background: a(c.ink, "0A"), boxSizing: "border-box" }} />
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} style={{ position: "absolute", left: (150 - TUBE_W) / 2 - 16, top: TUBE_H * (1 - f), width: 12, height: 2.5, background: a(c.ink, "40") }} />
        ))}
        <div style={{ position: "absolute", left: (150 - TUBE_W) / 2 + 9, bottom: 130 - 9, width: TUBE_W - 18, height: (TUBE_H - 22) * frac * grow, borderRadius: 12, background: c.accent }} />
        <div style={{ position: "absolute", left: 5, bottom: 0, width: 140, height: 140, borderRadius: "50%", background: c.accent, border: `3.5px solid ${a(c.ink, "59")}`, boxSizing: "border-box", transform: `scale(${0.6 + 0.4 * backOut(p / 0.4)})` }} />
        <div style={{ position: "absolute", left: (150 - TUBE_W) / 2 - 30, right: (150 - TUBE_W) / 2 - 30, top: -2, height: 3.5, background: c.ink, opacity: clamp01((p - 0.3) * 3) }} />
        <div style={{ position: "absolute", top: -12, left: 160, ...MONO_LABEL, fontSize: 19, color: c.ink2, whiteSpace: "nowrap", opacity: clamp01((p - 0.3) * 3) }}>goal</div>
      </div>
      <div style={{ width: 420 }}>{readout(120)}</div>
    </div>
  );
};

// ---------------------------------------------------------------- receipt

/** Itemised mono lines with dotted leaders and a counted total, on a card with
 *  perforated ends. variant 0: plain · variant 1: adds a barcode footer. */
export const Receipt: React.FC<{ block: B<"receipt">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const items = block.items.slice(0, 6);
  const total = items.reduce((s, d) => s + d.value, 0);
  const cur = block.currency ?? "";
  const W = 580, TEETH = 20;
  const zig = (flip: boolean) => (
    <svg viewBox={`0 0 ${W} 16`} width={W} height={16} style={{ display: "block" }}>
      <path d={`M 0 ${flip ? 0 : 16} ` + Array.from({ length: TEETH }).map((_, i) => `L ${(i + 0.5) * (W / TEETH)} ${flip ? 16 : 0} L ${(i + 1) * (W / TEETH)} ${flip ? 0 : 16}`).join(" ")} fill={V("card")} />
    </svg>
  );
  const e0 = backOut(p / 0.5);
  return (
    <div style={{ width: W, opacity: clamp01(e0 * 1.6), transform: `translateY(${(1 - clamp01(e0)) * -30}px)`, filter: `drop-shadow(0 14px 22px ${a(c.ink, "2B")})` }}>
      {zig(false)}
      <div style={{ background: V("card"), padding: "26px 40px 30px", fontFamily: V("font-mono") }}>
        <div style={{ textAlign: "center", ...MONO_LABEL, fontSize: 25, color: c.ink, fontWeight: 700, ...ELLIPSIS }}>{block.store ?? "receipt"}</div>
        <div style={{ textAlign: "center", fontSize: 18, color: c.ink2, letterSpacing: ".5em", marginTop: 8 }}>* * *</div>
        <div style={{ borderTop: `2px dashed ${a(c.ink, "40")}`, margin: "18px 0 8px" }} />
        {items.map((it, i) => {
          const e = easeOut((p - 0.18 - i * 0.09) / 0.4);
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12, height: 52, opacity: clamp01(e), transform: `translateX(${(1 - e) * -16}px)` }}>
              <span style={{ fontSize: 22, color: c.ink, textTransform: "uppercase", letterSpacing: ".04em", ...ELLIPSIS, maxWidth: 330 }}>{it.label}</span>
              <span style={{ flex: 1, borderBottom: `2px dotted ${a(c.ink, "40")}`, transform: "translateY(-6px)" }} />
              <span style={{ fontSize: 22, fontWeight: 700, color: c.ink, whiteSpace: "nowrap" }}>{cur}<CountNumber value={it.value} p={easeOut((p - 0.18 - i * 0.09) / 0.5)} /></span>
            </div>
          );
        })}
        <div style={{ borderTop: `2px dashed ${a(c.ink, "40")}`, margin: "10px 0 0" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, height: 66, opacity: clamp01(easeOut((p - 0.3 - items.length * 0.09) / 0.45)) }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: c.ink, textTransform: "uppercase", letterSpacing: ".08em", ...ELLIPSIS, maxWidth: 300 }}>{block.totalLabel ?? "total"}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 32, fontWeight: 700, color: c.accent, whiteSpace: "nowrap" }}>{cur}<CountNumber value={total} p={easeOut((p - 0.3 - items.length * 0.09) / 0.55)} /></span>
        </div>
        {block.variant === 1 && (
          <div style={{ marginTop: 12, textAlign: "center", opacity: clamp01(easeOut((p - 0.55) / 0.4)) }}>
            <svg viewBox="0 0 300 44" width={300} height={44}>
              {Array.from({ length: 34 }).map((_, i) => {
                const w = [2, 4, 2, 6, 3, 2, 5][i % 7];
                return <rect key={i} x={i * 8.8} y={0} width={w} height={44} fill={c.ink} />;
              })}
            </svg>
            <div style={{ fontSize: 16, color: c.ink2, letterSpacing: ".3em", marginTop: 6 }}>THANK YOU</div>
          </div>
        )}
      </div>
      {zig(true)}
    </div>
  );
};

// ---------------------------------------------------------------- ticket

/** A ticket stub framing one fact: event, venue/date slots, perforated stub
 *  with the seat. variant 0: landscape · variant 1: portrait stub. */
export const Ticket: React.FC<{ block: B<"ticket">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const e0 = backOut(p / 0.5);
  const land = block.variant !== 1;
  const meta = (label: string, val?: string) =>
    val ? (
      <div style={{ minWidth: 0 }}>
        <div style={{ ...MONO_LABEL, fontSize: 15, color: c.ink2 }}>{label}</div>
        <div style={{ fontFamily: V("font-mono"), fontWeight: 700, fontSize: 22, color: c.ink, marginTop: 5, ...ELLIPSIS }}>{val}</div>
      </div>
    ) : null;
  const notch = (posStyle: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 34, height: 34, borderRadius: "50%", background: V("paper"), border: `2.5px solid ${a(c.ink, "8C")}`, boxSizing: "border-box", ...posStyle }} />
  );
  const stub = (
    <div style={{ background: a(c.accent, "17"), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 18 }}>
      <div style={{ ...MONO_LABEL, fontSize: 15, color: c.ink2 }}>seat</div>
      <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 46, color: c.accent, ...ELLIPSIS, maxWidth: land ? 180 : 300 }}>{block.seat ?? "—"}</div>
    </div>
  );
  return (
    <div style={{
      position: "relative", width: land ? 880 : 460, border: `2.5px solid ${a(c.ink, "8C")}`, borderRadius: 22, background: V("card"),
      display: "grid", gridTemplateColumns: land ? "1fr 226px" : "1fr", gridTemplateRows: land ? "1fr" : "1fr 168px", overflow: "hidden",
      boxShadow: `0 14px 26px ${a(c.ink, "24")}`, opacity: clamp01(e0 * 1.6), transform: `translateY(${(1 - clamp01(e0)) * 30}px)`,
    }}>
      <div style={{ padding: land ? "34px 38px" : "36px 36px 28px", minWidth: 0 }}>
        <div style={{ ...MONO_LABEL, fontSize: 17, color: c.accent, ...rise(p, 0.1) }}>{block.admit ?? "admit one"}</div>
        <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: land ? 54 : 46, lineHeight: 1.06, letterSpacing: "-.02em", color: c.ink, marginTop: 14, maxHeight: land ? 118 : 200, overflow: "hidden", ...rise(p, 0.2) }}>{block.event}</div>
        <div style={{ display: "flex", gap: 44, marginTop: land ? 22 : 26, ...rise(p, 0.34) }}>
          {meta("venue", block.venue)}
          {meta("date", block.date)}
        </div>
      </div>
      <div style={{ position: "relative", display: "grid", ...(land ? { borderLeft: `3px dashed ${a(c.ink, "59")}` } : { borderTop: `3px dashed ${a(c.ink, "59")}` }) }}>
        {stub}
        {land ? <>{notch({ top: -19, left: -18 })}{notch({ bottom: -19, left: -18 })}</> : <>{notch({ left: -19, top: -18 })}{notch({ right: -19, top: -18 })}</>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- polaroid

/** Instant photo: white-framed image with a handwritten-style caption. Static
 *  tilt (never animated). variant 0: tape corners · variant 1: pin + a second
 *  frame peeking behind. */
export const Polaroid: React.FC<{ block: B<"polaroid">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const rot = block.rotate ?? (block.variant === 1 ? 2 : -2.5);
  const e0 = backOut(p / 0.55);
  const IMG_W = 470, IMG_H = 430;
  const photo = block.src ? (
    <Img src={staticFile(block.src)} style={{ width: IMG_W, height: IMG_H, objectFit: "cover", display: "block" }} />
  ) : (
    <svg viewBox={`0 0 ${IMG_W} ${IMG_H}`} width={IMG_W} height={IMG_H} style={{ display: "block", background: V("tint") }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <line key={i} x1={-IMG_H + i * 44} y1={IMG_H} x2={i * 44} y2={0} stroke={a(c.ink, "1F")} strokeWidth={2} />
      ))}
    </svg>
  );
  return (
    <div style={{ position: "relative", opacity: clamp01(e0 * 1.5), transform: `translateY(${(1 - clamp01(e0)) * -34}px)` }}>
      {block.variant === 1 && (
        <div style={{ position: "absolute", inset: 0, transform: "rotate(-5deg) translate(-20px, 10px)", background: V("card"), borderRadius: 6, boxShadow: `0 10px 24px ${a(c.ink, "21")}` }} />
      )}
      <div style={{ position: "relative", background: V("card"), padding: "20px 20px 0", borderRadius: 6, boxShadow: `0 16px 30px ${a(c.ink, "2B")}`, transform: `rotate(${rot}deg)` }}>
        <div style={{ overflow: "hidden" }}>{photo}</div>
        <div style={{ width: IMG_W, height: 108, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px", boxSizing: "border-box" }}>
          <span style={{ fontFamily: V("font-display"), fontStyle: "italic", fontWeight: 600, fontSize: 33, color: c.ink, textAlign: "center", maxHeight: 88, overflow: "hidden", lineHeight: 1.25, ...rise(p, 0.35) }}>{block.caption}</span>
        </div>
        {block.variant === 1 ? (
          <div style={{ position: "absolute", top: -14, left: "50%", marginLeft: -14, width: 28, height: 28, borderRadius: "50%", background: c.accent, boxShadow: `inset -4px -4px 6px ${a(c.ink, "59")}, 0 6px 8px ${a(c.ink, "40")}` }} />
        ) : (
          <>
            <div style={{ position: "absolute", top: -12, left: -30, width: 128, height: 38, background: a(c.ink, "1A"), border: `1px solid ${a(c.ink, "21")}`, transform: "rotate(-38deg)" }} />
            <div style={{ position: "absolute", top: -12, right: -30, width: 128, height: 38, background: a(c.ink, "1A"), border: `1px solid ${a(c.ink, "21")}`, transform: "rotate(38deg)" }} />
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- clipping

/** Newspaper clipping: kicker + dateline, display headline, halftone body
 *  columns fading out at the cut. variant 0: one column · variant 1: two. */
export const Clipping: React.FC<{ block: B<"clipping">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const two = block.variant === 1;
  return (
    <div style={{
      width: 840, background: V("card"), border: `1px solid ${a(c.ink, "26")}`, padding: "34px 44px 38px",
      backgroundImage: `radial-gradient(${a(c.ink, "0A")} 1px, transparent 1px)`, backgroundSize: "7px 7px",
      boxShadow: `0 12px 26px ${a(c.ink, "21")}`, ...rise(p, 0, 26),
    }}>
      <div style={{ borderTop: `3px double ${a(c.ink, "73")}`, borderBottom: `1px solid ${a(c.ink, "40")}`, padding: "10px 2px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, ...rise(p, 0.08) }}>
        <span style={{ ...MONO_LABEL, fontSize: 18, color: c.accent, fontWeight: 700, ...ELLIPSIS }}>{block.kicker ?? "from the archive"}</span>
        <span style={{ fontFamily: V("font-mono"), fontSize: 17, color: c.ink2, ...ELLIPSIS, maxWidth: 320 }}>{block.source ?? ""}</span>
      </div>
      <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 56, lineHeight: 1.05, letterSpacing: "-.015em", color: c.ink, margin: "26px 0 22px", maxHeight: 178, overflow: "hidden", ...rise(p, 0.18) }}>{block.headline}</div>
      <div style={{ position: "relative", maxHeight: 176, overflow: "hidden", ...rise(p, 0.32) }}>
        <div style={{
          fontFamily: V("font-ui"), fontSize: 21, lineHeight: 1.55, color: c.ink2, textAlign: "justify",
          ...(two ? { columnCount: 2, columnGap: 34, columnRule: `1px solid ${a(c.ink, "26")}` } : {}),
        }}>{block.body}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, background: `linear-gradient(to bottom, transparent, ${V("card")})` }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- factcard

/** Dossier card of label/value pairs. variant 0: ledger rows · variant 1: a
 *  2-up tile grid. */
export const FactCard: React.FC<{ block: B<"factcard">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const pairs = block.pairs.slice(0, 6);
  return (
    <div style={{ width: 760, background: V("card"), border: `1.5px solid ${a(c.ink, "26")}`, borderRadius: 20, padding: "34px 42px 30px", boxShadow: `0 12px 26px ${a(c.ink, "1C")}`, ...rise(p, 0, 26) }}>
      {block.title && (
        <div style={{ marginBottom: 20, ...rise(p, 0.08) }}>
          <span style={{ ...MONO_LABEL, fontSize: 21, color: c.ink2 }}>{block.title}</span>
          <div style={{ height: 3, width: 74, background: c.accent, borderRadius: 2, marginTop: 12, transform: `scaleX(${easeOut((p - 0.1) / 0.4)})`, transformOrigin: "left" }} />
        </div>
      )}
      {block.variant === 1 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {pairs.map((pr, i) => (
            <div key={i} style={{ background: a(c.ink, "08"), borderRadius: 14, padding: "18px 22px", minWidth: 0, ...rise(p, 0.14 + i * 0.09) }}>
              <div style={{ ...MONO_LABEL, fontSize: 16, color: c.ink2, ...ELLIPSIS }}>{pr.label}</div>
              <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 36, color: block.accent === i ? c.accent : c.ink, marginTop: 8, ...ELLIPSIS }}>{pr.value}</div>
            </div>
          ))}
        </div>
      ) : (
        pairs.map((pr, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 40%) 1fr", columnGap: 24, alignItems: "baseline", height: 66, borderBottom: i < pairs.length - 1 ? `1px solid ${a(c.ink, "17")}` : "none", ...rise(p, 0.12 + i * 0.09, 14) }}>
            <span style={{ ...MONO_LABEL, fontSize: 18, color: c.ink2, ...ELLIPSIS }}>{pr.label}</span>
            <span style={{ fontFamily: V("font-ui"), fontWeight: 700, fontSize: 29, color: block.accent === i ? c.accent : c.ink, textAlign: "right", ...ELLIPSIS }}>{pr.value}</span>
          </div>
        ))
      )}
    </div>
  );
};

// ---------------------------------------------------------------- letter

/** Correspondence snippet: dateline, salutation, a fading body excerpt and a
 *  flourished signature. variant 0: on a card · variant 1: open on the paper. */
export const Letter: React.FC<{ block: B<"letter">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const card = block.variant !== 1;
  const flourish = easeOut((p - 0.55) / 0.4);
  const inner = (
    <>
      {block.date && <div style={{ textAlign: "right", fontFamily: V("font-mono"), fontSize: 20, color: c.ink2, marginBottom: 26, ...ELLIPSIS, ...rise(p, 0.05) }}>{block.date}</div>}
      <div style={{ fontFamily: V("font-display"), fontStyle: "italic", fontWeight: 600, fontSize: 40, color: c.ink, ...ELLIPSIS, ...rise(p, 0.12) }}>{block.salutation}</div>
      <div style={{ position: "relative", maxHeight: 190, overflow: "hidden", margin: "24px 0 26px", ...rise(p, 0.24) }}>
        <div style={{ fontFamily: V("font-ui"), fontSize: 27, lineHeight: 1.62, color: c.ink }}>{block.body}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, background: `linear-gradient(to bottom, transparent, ${card ? V("card") : V("paper")})` }} />
      </div>
      {block.signoff && <div style={{ fontFamily: V("font-ui"), fontStyle: "italic", fontSize: 25, color: c.ink2, ...ELLIPSIS, ...rise(p, 0.42) }}>{block.signoff}</div>}
      {block.signature && (
        <div style={{ position: "relative", display: "inline-block", marginTop: 8, ...rise(p, 0.52) }}>
          <span style={{ fontFamily: V("font-display"), fontStyle: "italic", fontWeight: 700, fontSize: 52, color: c.accent, ...ELLIPSIS, display: "inline-block", maxWidth: 560 }}>{block.signature}</span>
          <svg viewBox="0 0 300 22" width={300} height={22} style={{ position: "absolute", left: 0, bottom: -14, overflow: "visible" }}>
            <path d="M 4 12 C 70 2, 150 20, 296 8" fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(flourish)} />
          </svg>
        </div>
      )}
    </>
  );
  return card ? (
    <div style={{ width: 780, background: V("card"), borderRadius: 8, padding: "44px 52px 48px", boxShadow: `0 14px 30px ${a(c.ink, "21")}`, borderTop: `5px solid ${c.accent}`, ...rise(p, 0, 26) }}>{inner}</div>
  ) : (
    <div style={{ width: 820 }}>{inner}</div>
  );
};

// ---------------------------------------------------------------- countgrid

/** 2-3 stats side by side, each with its own accent tick — the ensemble
 *  version of `stat`. variant 0: columns · variant 1: stacked ledger rows. */
export const CountGrid: React.FC<{ block: B<"countgrid">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const items = block.items.slice(0, 3);
  const acc = block.accent;
  if (block.variant === 1) {
    return (
      <div style={{ width: 880 }}>
        {items.map((it, i) => {
          const hot = acc == null || acc === i;
          const d = i * 0.14;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "360px 1fr", columnGap: 36, alignItems: "center", height: 128, borderBottom: i < items.length - 1 ? `1px solid ${a(c.ink, "1F")}` : "none", ...rise(p, d, 18) }}>
              <div style={{ textAlign: "right", fontFamily: V("font-display"), fontWeight: 700, fontSize: 76, letterSpacing: "-.03em", color: hot && acc != null ? c.accent : c.ink, whiteSpace: "nowrap" }}>
                {it.prefix ? <span style={{ fontSize: "0.5em", marginRight: 6 }}>{it.prefix}</span> : null}
                <CountNumber value={it.value} p={(p - d) / 0.62} plain={it.plain} />
                {it.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 8 }}>{it.suffix}</span> : null}
              </div>
              <div style={{ ...MONO_LABEL, fontSize: 21, color: c.ink2, overflow: "hidden", maxHeight: 58, lineHeight: 1.35 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, width: 960 }}>
      {items.map((it, i) => {
        const hot = acc == null || acc === i;
        const d = i * 0.14;
        return (
          <div key={i} style={{ textAlign: "center", padding: "0 18px", borderLeft: i > 0 ? `2px solid ${a(c.ink, "21")}` : "none", minWidth: 0, ...rise(p, d, 22) }}>
            <div style={{ width: 46, height: 5, background: hot && acc != null ? c.accent : a(c.ink, "59"), borderRadius: 3, margin: "0 auto 26px", transform: `scaleX(${easeOut((p - d) / 0.4)})` }} />
            <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: 88, lineHeight: 0.95, letterSpacing: "-.035em", color: hot && acc != null ? c.accent : c.ink, whiteSpace: "nowrap" }}>
              {it.prefix ? <span style={{ fontSize: "0.5em", marginRight: 5 }}>{it.prefix}</span> : null}
              <CountNumber value={it.value} p={(p - d) / 0.62} plain={it.plain} />
              {it.suffix ? <span style={{ fontSize: "0.5em", marginLeft: 6 }}>{it.suffix}</span> : null}
            </div>
            <div style={{ ...MONO_LABEL, fontSize: 20, color: c.ink2, marginTop: 22, lineHeight: 1.35, overflow: "hidden", maxHeight: 82 }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- tally

/** Hand-drawn tally marks scratching in one by one, groups of five, the count
 *  riding along. variant 0: centred, readout below · variant 1: readout right. */
export const Tally: React.FC<{ block: B<"tally">; p: number; c: BlockColors }> = ({ block, p, c }) => {
  const value = Math.min(35, Math.max(1, Math.round(block.value)));
  const groups = Math.ceil(value / 5);
  const seqP = easeOut(p / 0.75);
  const strokeP = (k: number) => clamp01(seqP * value * 1.12 - k);
  const jig = (k: number, r: number) => ((k * 37 + r * 13) % 7) - 3; // deterministic scratch jitter
  const groupSvg = (g: number) => {
    const base = g * 5, inGroup = Math.min(5, value - base);
    return (
      <svg key={g} viewBox="0 0 104 112" width={104} height={112} style={{ overflow: "visible" }}>
        {Array.from({ length: Math.min(4, inGroup) }).map((_, j) => {
          const k = base + j, d = strokeP(k);
          if (d <= 0.01) return null;
          return <line key={j} x1={14 + j * 25 + jig(k, 1) * 0.4} y1={10} x2={14 + j * 25 + jig(k, 2) * 0.6} y2={10 + 92 * d} stroke={c.ink} strokeWidth={7} strokeLinecap="round" />;
        })}
        {inGroup === 5 && strokeP(base + 4) > 0.01 && (
          <line x1={-2} y1={96 + jig(base, 3) * 0.5} x2={-2 + 106 * strokeP(base + 4)} y2={96 - 82 * strokeP(base + 4)} stroke={c.accent} strokeWidth={7.5} strokeLinecap="round" />
        )}
      </svg>
    );
  };
  const marks = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "30px 42px", justifyContent: "center", maxWidth: block.variant === 1 ? 560 : 880 }}>
      {Array.from({ length: groups }).map((_, g) => groupSvg(g))}
    </div>
  );
  const readout = (size: number) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: V("font-display"), fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: "-.03em", color: c.accent, whiteSpace: "nowrap" }}>
        <CountNumber value={value} p={p / 0.75} plain />
      </div>
      <div style={{ ...MONO_LABEL, fontSize: 23, color: c.ink2, marginTop: 18, lineHeight: 1.35, overflow: "hidden", maxHeight: 94, maxWidth: 360 }}>{block.label}</div>
    </div>
  );
  return block.variant === 1 ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70, width: 980 }}>
      {marks}
      {readout(150)}
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44, width: 980 }}>
      {marks}
      {readout(110)}
    </div>
  );
};
