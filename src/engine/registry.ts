import type { Brand } from "./types";
import { editorialBrand } from "../brands/editorial";
import { cinematicBrand } from "../brands/cinematic";
import { storyBrand } from "../brands/story";

/** Rendering kits: the code that actually draws scenes. A brand preset picks a
 *  kit by id and supplies its own theme. Add a new visual system here. */
export const KITS: Record<string, Brand> = {
  editorial: editorialBrand,
  cinematic: cinematicBrand,
  story: storyBrand,
};

export const DEFAULT_KIT = "editorial";

export const getKit = (id?: string): Brand => (id && KITS[id]) ? KITS[id] : KITS[DEFAULT_KIT];

/** Resolve a spec's `brand` field to a rendering kit. Brand presets are data
 *  (their look arrives via themeOverride), so an unknown id is not an error —
 *  it just falls back to the default kit. */
export const getBrand = (name: string): Brand => getKit(name);
