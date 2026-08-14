import cron from "node-cron";
import { store } from "./store";
import { buildSpec } from "./pipeline";
import { renderSpec } from "./render";

const jobs = new Map<string, cron.ScheduledTask>();

export async function runChannel(id: string) {
  const ch = store.get().channels.find(c => c.id === id);
  if (!ch) throw new Error("channel not found: " + id);
  const spec = buildSpec(ch);
  const preset = store.brand(ch.brand);
  const output = await renderSpec(spec, preset?.theme);   // publish step would go here
  store.addProject({ id: "p_" + Date.now(), title: ch.name, brand: ch.brand, template: ch.template, createdAt: Date.now(), output, spec });
  return output;
}

/** (Re)build cron schedules from the store. Runs only while the app is open. */
export function reschedule() {
  for (const j of jobs.values()) j.stop();
  jobs.clear();
  for (const ch of store.get().channels) {
    if (!ch.enabled) continue;
    if (!cron.validate(ch.scheduleCron)) continue;
    const task = cron.schedule(ch.scheduleCron, () => { runChannel(ch.id).catch(err => console.error("channel run failed", err)); });
    jobs.set(ch.id, task);
  }
}
export function startScheduler() { reschedule(); }
