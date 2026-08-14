import { z } from "zod";

export const WordSchema = z.object({ word: z.string(), start: z.number(), end: z.number() });
export const SceneSchema = z.object({
  id: z.string(), type: z.string(), props: z.record(z.unknown()),
  startSec: z.number(), endSec: z.number(),
});
export const SpecSchema = z.object({
  fps: z.number(), width: z.number(), height: z.number(), brand: z.string(),
  audioSrc: z.string().optional(), musicSrc: z.string().optional(),
  words: z.array(WordSchema), scenes: z.array(SceneSchema),
});

/** When the library cannot express a beat, the director emits this instead of
 *  guessing, and a dev/codegen turns it into a real scene component. */
export const NeedsComponentSchema = z.object({
  kind: z.literal("needs_component"),
  brand: z.string(), proposedType: z.string(), reason: z.string(),
  description: z.string(), referenceType: z.string().optional(),
});

export const DirectorOutput = z.union([SpecSchema, NeedsComponentSchema]);
export type SpecT = z.infer<typeof SpecSchema>;
