import React from "react";
import { Player } from "@remotion/player";
import { EngineVideo } from "@engine/engine/Video";
import { getKit } from "@engine/engine/registry";
import { specDurationInFrames } from "@engine/engine/timing";

const PlayerComp: React.FC<{ spec: any; themeOverride?: any }> = ({ spec, themeOverride }) => (
  <EngineVideo spec={spec} brand={getKit(spec.kit)} themeOverride={themeOverride} />
);

/** Live in-app preview of any spec, no render step. */
export const PreviewVideo: React.FC<{ spec: any; themeOverride?: any }> = ({ spec, themeOverride }) => {
  if (!spec?.scenes?.length) return <div className="previewEmpty">No scenes</div>;
  return (
    <div className="previewBox">
      <Player
        component={PlayerComp as any}
        inputProps={{ spec, themeOverride }}
        durationInFrames={specDurationInFrames(spec)}
        fps={spec.fps} compositionWidth={spec.width} compositionHeight={spec.height}
        style={{ width: "100%", height: "100%" }}
        controls loop
      />
    </div>
  );
};
