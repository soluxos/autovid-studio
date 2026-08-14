import type React from "react";

/** A spoken word with its timestamp in seconds. From TTS (free) or forced
 *  alignment of a recording. The whole edit syncs to this. */
export interface Word { word: string; start: number; end: number }

/** One scene: a screen of `type` the active brand knows how to render,
 *  covering a span of the narration. */
export interface Scene {
  id: string;
  type: string;
  props: Record<string, unknown>;
  startSec: number;
  endSec: number;
}

/** Everything needed to build one video. This is what the art-director emits. */
export interface Spec {
  fps: number;
  width: number;
  height: number;
  brand: string;
  kit?: string;        // which rendering kit draws the scenes (default "editorial")
  audioSrc?: string;   // narration, in /public
  musicSrc?: string;
  musicLoopSec?: number;  // length of the music bed file (default 22s beds); tiles are laid to this
  words: Word[];
  scenes: Scene[];
}

export interface Theme {
  paper: string; card: string; ink: string; ink2: string; line: string;
  accent: string; accentInk: string; tint: string;
  fontDisplay: string; fontUi: string; fontMono: string;
  radius: number;
  durSec: number; stepSec: number;
  /** Global multiplier on entrance-animation timing. 1 = default, <1 snappier, >1 slower. */
  motionScale: number;
  scrim: number;   // 0..1 legibility over media
  /** On-screen chrome copy — the publication identity shown on every frame. */
  publication: string; // e.g. "Launchpad"
  edition: string;     // e.g. "Weekly Index"
  handle: string;      // e.g. "@launchpad"
}

/** A user-authored brand: a name + a full set of look tokens, bound to a
 *  rendering kit (the React components that draw each scene). Stored as data,
 *  so brands are created/edited/duplicated entirely from the UI. */
export interface BrandPreset {
  id: string;
  name: string;
  kit: string;   // which rendering kit draws the scenes (currently only "editorial")
  theme: Theme;
  /** ElevenLabs narrator voice for this brand (docs/BRAND-SYSTEM.md §1). */
  voiceId?: string;
  /** Brand logo (path under public/, e.g. "logos/fieldnotes.png") — end-card mark. */
  logo?: string;
  /** Music-bed generator mood (key/tempo/progression) for this brand. */
  musicMood?: string;
  /** Surface ids this brand rotates through (src/brands/story/surfaces). */
  surfaces?: string[];
}

export interface SceneProps { scene: Scene; spec: Spec }

export interface LibraryEntry {
  type: string;
  label: string;
  sampleProps: Record<string, unknown>;
  previewAtSec?: number;
  onMedia?: boolean;
}

export interface Brand {
  name: string;
  theme: Theme;
  /** Wraps the whole video: injects theme tokens as CSS vars + base surface. */
  Frame: React.FC<{ children: React.ReactNode }>;
  /** type -> scene component. Art-director emits generic types; brand styles them. */
  scenes: Record<string, React.FC<SceneProps>>;
  library: LibraryEntry[];
}
