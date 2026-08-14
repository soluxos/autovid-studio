import React from "react";
import { AbsoluteFill, Freeze, useVideoConfig } from "remotion";
import { getBrand } from "../engine/registry";
import type { Scene, Spec } from "../engine/types";

/** Every template in a brand's library, frozen and scaled into a grid, so you
 *  can eyeball the whole set. In Studio you can also open any scene live. */
export const Gallery: React.FC<{ brandName?: string }> = ({ brandName = "editorial" }) => {
  const { width, height, fps } = useVideoConfig();
  const brand = getBrand(brandName);
  const cols = 3;
  const cellW = 300;
  const scale = cellW / 1080;      // previews model a 1080-wide frame
  const fw = 1080, fh = 1920;
  return (
    <AbsoluteFill style={{ background: "#0e0e10", padding: 40, overflow: "hidden" }}>
      <div style={{ color: "#e8e8e6", fontFamily: "monospace", fontSize: 26, letterSpacing: 4, marginBottom: 24 }}>
        TEMPLATE LIBRARY // {brand.name.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 26 }}>
        {brand.library.map((entry) => {
          const scene: Scene = { id: entry.type, type: entry.type, props: entry.sampleProps, startSec: 0, endSec: 5 };
          const spec: Spec = { fps, width: fw, height: fh, brand: brand.name, words: [], scenes: [scene] };
          const SceneComp = brand.scenes[entry.type] ?? brand.scenes["__fallback__"];
          const Frame = brand.Frame;
          return (
            <div key={entry.type}>
              <div style={{ width: cellW, height: fh * scale, borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
                <div style={{ width: fw, height: fh, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <Freeze frame={Math.round((entry.previewAtSec ?? 1) * fps)}>
                    <AbsoluteFill style={{ width: fw, height: fh }}>
                      <Frame><SceneComp scene={scene} spec={spec} /></Frame>
                    </AbsoluteFill>
                  </Freeze>
                </div>
              </div>
              <div style={{ color: "#9a9aa1", fontFamily: "monospace", fontSize: 14, marginTop: 8 }}>
                {entry.label} <span style={{ color: "#2340FF" }}>[{entry.type}]</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
