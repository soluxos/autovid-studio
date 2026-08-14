import React from "react";
import { AbsoluteFill, Audio, Sequence, Series, interpolate, staticFile, useVideoConfig } from "remotion";
import type { Brand, Spec, Theme } from "./types";
import { secToFrame } from "./timing";
import { BrandProvider } from "./brand";
import { Captions } from "./Captions";

/** Length of the shipped music beds (public/audio/beds/*.mp3 are 22.05s). A spec
 *  can override with `musicLoopSec` for a custom bed — it must be <= the file's
 *  real length, or the tiles below leave audible gaps. */
const BED_SEC = 22;
const MUSIC_VOL = 0.24;

/** Music bed, tiled to cover the whole video and faded out at the end.
 *
 *  Why tiles instead of `<Audio loop>`: with `loop`, Remotion wraps the audio in
 *  one Sequence per iteration, so a `volume={(f) => …}` callback receives the
 *  frame RELATIVE TO THAT ITERATION (0…660 for a 22s bed). A fade written
 *  against the composition's final frame therefore never fires and the music
 *  runs at full level into the hard cut. Laying the tiles ourselves means we
 *  know each tile's offset, so volume can be computed from the ABSOLUTE frame.
 */
const MusicBed: React.FC<{ src: string; loopSec?: number }> = ({ src, loopSec }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const tileFrames = Math.max(1, Math.round((loopSec ?? BED_SEC) * fps));
  const tiles = Math.ceil(durationInFrames / tileFrames);
  const fadeOutEnd = durationInFrames - 2;
  const fadeOutStart = Math.max(0, fadeOutEnd - Math.round(2.2 * fps));
  const fadeInEnd = Math.round(1 * fps);

  return (
    <>
      {Array.from({ length: tiles }).map((_, i) => (
        <Sequence key={i} from={i * tileFrames} durationInFrames={tileFrames} layout="none">
          <Audio
            src={staticFile(src)}
            volume={(f) => {
              const abs = i * tileFrames + f;                        // absolute composition frame
              const up = interpolate(abs, [0, fadeInEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const down = interpolate(abs, [fadeOutStart, fadeOutEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return MUSIC_VOL * up * down;
            }}
          />
        </Sequence>
      ))}
    </>
  );
};

/** Brand-agnostic sequencer. Optionally accepts a themeOverride so the app can
 *  live-edit brand tokens; the override is merged into the brand's theme and,
 *  because the brand styles from CSS vars the Frame injects, the whole preview
 *  restyles instantly. */
export const EngineVideo: React.FC<{ spec: Spec; brand: Brand; themeOverride?: Partial<Theme> }> = ({ spec, brand, themeOverride }) => {
  const { fps } = useVideoConfig();
  const active: Brand = themeOverride ? { ...brand, theme: { ...brand.theme, ...themeOverride } } : brand;
  const Frame = active.Frame;
  return (
    <BrandProvider brand={active}>
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        {spec.audioSrc ? <Audio src={staticFile(spec.audioSrc)} /> : null}
        {spec.musicSrc ? <MusicBed src={spec.musicSrc} loopSec={spec.musicLoopSec} /> : null}
        <Frame>
          <Series>
            {spec.scenes.map((scene) => {
              const dur = Math.max(1, secToFrame(scene.endSec - scene.startSec, fps));
              const SceneComp = active.scenes[scene.type] ?? active.scenes["__fallback__"];
              return (
                <Series.Sequence key={scene.id} durationInFrames={dur}>
                  <SceneComp scene={scene} spec={spec} />
                </Series.Sequence>
              );
            })}
          </Series>
          <Captions words={spec.words} />
        </Frame>
      </AbsoluteFill>
    </BrandProvider>
  );
};
