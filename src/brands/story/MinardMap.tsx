import React from "react";
import { useTheme } from "../../engine/brand";
import { ADVANCE, RETREAT, sampleRoute, bandPath, lonToX, widthFor } from "./minard-data";

const ADV_COLOR = "#C6892B";
const RET_COLOR = "#20180F";
const TEMP_TOP = 880, DEG = 3.0;
const tempY = (t: number) => TEMP_TOP - t * DEG;

export interface MapAnnot { width?: number; route?: number; retreat?: number; temp?: number }

/** The Minard flow map, revealed by advance/retreat progress, with annotations
 *  that teach how to read it. Coordinates are spread across the frame's vertical
 *  space; labels are placed to never overlap. */
export const MinardMap: React.FC<{ pAdv: number; pRet: number; showTemp?: boolean; ann?: MapAnnot }> = ({ pAdv, pRet, showTemp, ann = {} }) => {
  const t = useTheme();
  const adv = sampleRoute(ADVANCE, pAdv);
  const ret = sampleRoute(RETREAT, pRet);
  const ink = t.ink, winter = t.accent, mono = "var(--font-mono)";
  const tempPts = ret.revealed.filter((p) => p.temp != null).map((p) => `${p.x},${tempY(p.temp as number)}`).join(" ");

  const cityTick = (c: { x: number; y: number; name: string; passed: number }, key: string) => (
    <g key={key} opacity={c.passed} transform={`translate(${c.x},${c.y})`}>
      <circle r={4} fill={ink} />
      <line x1={0} y1={0} x2={0} y2={-18} stroke={ink} strokeWidth={1} opacity={0.5} />
      <text x={0} y={-26} textAnchor="middle" fontFamily={mono} fontSize={19} letterSpacing="1.5" fill={ink} style={{ textTransform: "uppercase" }}>{c.name}</text>
    </g>
  );

  const startX = lonToX(24.0), sy = ADVANCE[0].y, hw = widthFor(422000) / 2;
  const moscowX = lonToX(37.6), moscowReached = Math.min(1, Math.max(0, (pAdv - 0.9) * 10));

  return (
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      <path d={"M " + ADVANCE.map((n) => `${lonToX(n.lon)},${n.y}`).join(" L ")} fill="none" stroke={ink} strokeOpacity={0.08} strokeWidth={1} />
      <path d={bandPath(adv.revealed)} fill={ADV_COLOR} />
      <path d={bandPath(ret.revealed)} fill={RET_COLOR} />
      <circle cx={startX} cy={sy} r={5} fill={ink} opacity={Math.min(1, pAdv * 8)} />

      {/* WIDTH = MEN */}
      {(ann.width ?? 0) > 0.01 && (
        <g opacity={ann.width} fill={ink} stroke={ink}>
          <line x1={startX + 112} y1={sy - hw} x2={startX + 112} y2={sy + hw} strokeWidth={2} />
          <line x1={startX + 104} y1={sy - hw} x2={startX + 120} y2={sy - hw} strokeWidth={2} />
          <line x1={startX + 104} y1={sy + hw} x2={startX + 120} y2={sy + hw} strokeWidth={2} />
          <line x1={startX + 112} y1={sy - hw} x2={startX + 158} y2={sy - hw - 30} strokeWidth={1.5} />
          <text x={startX + 166} y={sy - hw - 24} fontFamily={mono} fontSize={26} fontWeight={700} letterSpacing="1" stroke="none">422,000 MEN</text>
        </g>
      )}

      {/* the march east */}
      {(ann.route ?? 0) > 0.01 && (
        <text x={520} y={352} opacity={ann.route} textAnchor="middle" fontFamily={mono} fontSize={22} letterSpacing="3" fill={ink} fillOpacity={0.85} style={{ textTransform: "uppercase" }}>The march east  →</text>
      )}

      {adv.cities.filter((c) => c.name !== "Moscow").map((c, i) => cityTick(c, "a" + i))}

      {moscowReached > 0 && (
        <g opacity={moscowReached} transform={`translate(${moscowX},${ADVANCE[ADVANCE.length - 1].y})`}>
          <circle r={9} fill="none" stroke={winter} strokeWidth={3} />
          <circle r={3.5} fill={winter} />
          <text x={-18} y={-24} textAnchor="end" fontFamily="var(--font-display)" fontWeight={700} fontSize={30} fill={ink}>Moscow</text>
        </g>
      )}

      {/* the road home (below the retreat band, clear of the temperature) */}
      {(ann.retreat ?? 0) > 0.01 && (
        <text x={540} y={748} opacity={ann.retreat} textAnchor="middle" fontFamily={mono} fontSize={22} letterSpacing="3" fill={ink} fillOpacity={0.85} style={{ textTransform: "uppercase" }}>←  the road home</text>
      )}

      {/* temperature strip (retreat) */}
      {showTemp && ret.revealed.length > 1 && (
        <g>
          <line x1={74} y1={tempY(0)} x2={980} y2={tempY(0)} stroke={ink} strokeOpacity={0.18} strokeWidth={1} strokeDasharray="3 6" />
          {(ann.temp ?? 0) > 0.01 && <text x={74} y={tempY(0) - 16} opacity={ann.temp} fontFamily={mono} fontSize={20} letterSpacing="2" fill={ink} style={{ textTransform: "uppercase" }}>Temperature, °C</text>}
          <polyline points={tempPts} fill="none" stroke={winter} strokeWidth={3} strokeLinejoin="round" />
          {ret.revealed.filter((p) => p.temp === -30 || p.temp === -21).map((p, i) => (
            <text key={i} x={p.x} y={tempY(p.temp as number) + 38} textAnchor="middle" fontFamily={mono} fontSize={24} fontWeight={700} fill={winter}>{Math.round(p.temp as number)}°</text>
          ))}
        </g>
      )}
    </svg>
  );
};
