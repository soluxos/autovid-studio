import React from "react";
import { Composition } from "remotion";
import { EngineVideo } from "../engine/Video";
import { getKit } from "../engine/registry";
import { specDurationInFrames } from "../engine/timing";
import type { Spec, Theme } from "../engine/types";
import demo from "../data/demo.spec.json";

type Props = { spec: Spec; themeOverride?: Partial<Theme> };
const RenderComp: React.FC<Props> = ({ spec, themeOverride }) =>
  <EngineVideo spec={spec} brand={getKit(spec.kit)} themeOverride={themeOverride} />;

/** A single parameterized composition. The app renders it with inputProps =
 *  { spec, themeOverride }; size/fps/duration come from the spec. */
export const RenderRoot: React.FC = () => (
  <Composition
    id="Render"
    component={RenderComp}
    defaultProps={{ spec: demo as unknown as Spec, themeOverride: undefined }}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={300}
    calculateMetadata={({ props }) => {
      const s = props.spec;
      return { durationInFrames: specDurationInFrames(s), fps: s.fps, width: s.width, height: s.height };
    }}
  />
);
