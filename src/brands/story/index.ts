import "../fonts";
import type { Brand } from "../../engine/types";
import { EDITORIAL_THEME } from "../editorial/tokens";
import { StoryFrame } from "./Frame";
import { MinardStory, StoryFallback } from "./scenes";
import { DocScene } from "./StoryDoc";

/** The "story" kit: data-story compositions on crumpled paper with layered
 *  imagery, drawn infographics, VO and SFX. `doc` renders ANY VideoScript
 *  generically; `minard` is the bespoke flagship flow map. */
export const storyBrand: Brand = {
  name: "story",
  theme: EDITORIAL_THEME,
  Frame: StoryFrame,
  scenes: {
    doc: DocScene,
    minard: MinardStory,
    __fallback__: StoryFallback,
  },
  library: [],
};
