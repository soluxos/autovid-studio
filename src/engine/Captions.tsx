import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "./types";
import { wordAt } from "./timing";
import { useTheme } from "./brand";

/** A broadcast-style subtitle that reads on both light and media scenes:
 *  a translucent dark pill, white words, the spoken word in the accent.
 *  Synced to the global frame so it always tracks the narration. */
export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const idx = wordAt(words, frame / fps);
  if (idx < 0 || words.length === 0) return null;
  const win = words.slice(Math.max(0, idx - 4), idx + 3);
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 132, display: "flex", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        maxWidth: "82%", textAlign: "center", padding: "10px 16px", borderRadius: 12,
        background: "rgba(12,12,14,0.62)", backdropFilter: "blur(6px)",
        fontFamily: t.fontUi, fontWeight: 600, fontSize: 30, lineHeight: 1.25, color: "#fff",
      }}>
        {win.map((w, i) => {
          const gi = Math.max(0, idx - 4) + i;
          const active = gi === idx;
          return (
            <span key={gi} style={{
              color: active ? t.accent : "rgba(255,255,255,0.92)",
              opacity: gi <= idx ? 1 : 0.4, margin: "0 5px",
            }}>{w.word}</span>
          );
        })}
      </div>
    </div>
  );
};
