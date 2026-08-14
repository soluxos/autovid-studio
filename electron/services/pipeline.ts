// Channel pipeline: turn a channel's config into a renderable Spec using the
// same template generator the Create screen uses. When wiring a real data
// source + LLM art-director later, replace defaultInputs() with fetched facts.
import type { Channel } from "./store";
import { store } from "./store";
import { buildFromTemplate, getTemplate, defaultInputs } from "../../src/generate/templates";

export function buildSpec(channel: Channel) {
  const preset = store.brand(channel.brand);
  const handle = preset?.theme.handle ?? "@channel";
  const template = getTemplate(channel.template || "countdown");
  const inputs = defaultInputs(template);
  // Channel "count" trims whichever list the template exposes (items/games/facts).
  const listField = template.fields.find((f) => f.type === "list");
  if (listField && Array.isArray(inputs[listField.key])) {
    const n = Math.max(2, Math.min(8, channel.count || 5));
    inputs[listField.key] = (inputs[listField.key] as unknown[]).slice(0, n);
  }
  if ("look" in inputs && channel.look) inputs.look = channel.look;
  return buildFromTemplate(template.id, inputs, { brand: channel.brand, handle });
}
