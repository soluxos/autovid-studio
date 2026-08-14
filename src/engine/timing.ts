import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Word, Scene } from "./types";

export const secToFrame = (sec: number, fps: number) => Math.round(sec * fps);

export const specDurationInFrames = (spec: {
  scenes: Scene[]; words: Word[]; fps: number;
}) => {
  const lastScene = spec.scenes.length ? spec.scenes[spec.scenes.length - 1].endSec : 0;
  const lastWord = spec.words.length ? spec.words[spec.words.length - 1].end : 0;
  return Math.max(1, secToFrame(Math.max(lastScene, lastWord) + 0.5, spec.fps));
};

/** Local seconds inside the current <Sequence>. */
export const useLocalSec = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** Index of the word being spoken at `sec` (or the last one already spoken). */
export const wordAt = (words: Word[], sec: number) => {
  let last = -1;
  for (let i = 0; i < words.length; i++) {
    if (sec >= words[i].start && sec < words[i].end) return i;
    if (words[i].end <= sec) last = i;
  }
  return last;
};

/** First time a phrase is spoken, so a component can fire exactly on it. */
export const timeOfPhrase = (words: Word[], phrase: string): number | null => {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = phrase.trim().toLowerCase().split(/\s+/).map(norm);
  for (let i = 0; i + target.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < target.length; j++)
      if (norm(words[i + j].word) !== target[j]) { ok = false; break; }
    if (ok) return words[i].start;
  }
  return null;
};
