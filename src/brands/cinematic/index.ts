import "../fonts";
import type { Brand } from "../../engine/types";
import { EDITORIAL_THEME } from "../editorial/tokens";
import { CinematicFrame } from "./Frame";
import { OpenerScene, ItemScene, StatementScene, CloserScene, CineFallback } from "./scenes";

/** The "dispatch" kit: full-bleed cinematic media with a data-journalism overlay
 *  grammar (corner labels, animated stat, source credit, watermark, segment
 *  progress). Brands supply their own theme; this is just the rendering code. */
export const cinematicBrand: Brand = {
  name: "cinematic",
  theme: EDITORIAL_THEME, // placeholder default; real brands override via themeOverride
  Frame: CinematicFrame,
  scenes: {
    opener: OpenerScene,
    item: ItemScene,
    statement: StatementScene,
    closer: CloserScene,
    __fallback__: CineFallback,
  },
  library: [],
};
