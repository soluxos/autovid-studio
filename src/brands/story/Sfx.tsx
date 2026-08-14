import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";

export interface Cue { at: number; src: string; vol: number; len?: number }

/** Places sound-effect cues on the timeline. Kept quiet — these sit under the
 *  narration to make text and infographic animations feel alive. */
export const StorySfx: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(c.at * fps))} durationInFrames={Math.round((c.len ?? 2.5) * fps)} layout="none">
          <Audio src={staticFile(c.src)} volume={c.vol} />
        </Sequence>
      ))}
    </>
  );
};
