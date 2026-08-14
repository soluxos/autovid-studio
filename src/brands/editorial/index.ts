import type { Brand } from "../../engine/types";
import { editorialTheme } from "./theme";
import { EditorialFrame } from "./Frame";
import {
  IntroScene, RankingScene, SpotlightScene, LowerThirdScene, KeyArtScene, InsetScene, OutroScene, FallbackScene,
} from "./scenes";

export const editorialBrand: Brand = {
  name: "editorial",
  theme: editorialTheme,
  Frame: EditorialFrame,
  scenes: {
    intro: IntroScene,
    ranking: RankingScene,
    spotlight: SpotlightScene,
    lowerThird: LowerThirdScene,
    keyart: KeyArtScene,
    inset: InsetScene,
    outro: OutroScene,
    __fallback__: FallbackScene,
  },
  library: [
    { type: "intro", label: "Intro", previewAtSec: 1.4, sampleProps: { kicker: "New this week // WK 32", title: "The five games\nworth your", markerLine: "weekend.", sub: "Reviewed & ranked" } },
    { type: "ranking", label: "Ranking board", previewAtSec: 2.2, sampleProps: { heading: "Highest rated // WK 32", items: [
      { rank: 1, name: "Ashfall Vanguard", meta: "PC · PS5 · $39", score: 94 },
      { rank: 2, name: "Neon Tide", meta: "PC · Switch · $24", score: 88 },
      { rank: 3, name: "Hollow Signal", meta: "Xbox · $29", score: 82 },
    ] } },
    { type: "spotlight", label: "Spotlight (media)", previewAtSec: 1.6, onMedia: true, sampleProps: { kicker: "Pick of the week", title: "Ashfall\nVanguard", score: 94, scoreLabel: "Aggregate", pills: ["PC", "PS5", "$39"], look: "neon" } },
    { type: "lowerThird", label: "Lower third (media)", previewAtSec: 1.0, onMedia: true, sampleProps: { kicker: "Now playing", name: "Neon Tide", meta: "roguelike · out now · PC · Switch", look: "ember" } },
    { type: "keyart", label: "Key art (media)", previewAtSec: 1.2, onMedia: true, sampleProps: { kicker: "Cover reveal", pre: "Ember of the", markerWord: "Hollow", pills: ["2026", "action-RPG", "wishlist"], look: "neon" } },
    { type: "inset", label: "Inset (clean + media)", previewAtSec: 1.2, sampleProps: { kicker: "Spotlight", title: "Ashfall Vanguard", score: 94, pills: ["PC", "PS5", "$39"], look: "ember" } },
    { type: "outro", label: "Outro", previewAtSec: 0.8, sampleProps: { title: "Back next", markerLine: "Friday.", cta: "Follow @launchpad" } },
  ],
};
