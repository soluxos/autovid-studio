import type { AppState } from "./api";
import type { BrandPreset } from "@engine/engine/types";

export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export const findBrand = (state: AppState, id: string): BrandPreset | undefined =>
  state.brands.find((b) => b.id === id);

export const activeBrand = (state: AppState): BrandPreset =>
  findBrand(state, state.settings.activeBrand) ?? state.brands[0];

export const brandName = (state: AppState, id: string): string =>
  findBrand(state, id)?.name ?? id;

export const fmtDate = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ---- schedules -------------------------------------------------------------

export interface SchedulePreset { label: string; cron: string }
export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: "Every day — 07:00", cron: "0 7 * * *" },
  { label: "Weekdays — 08:00", cron: "0 8 * * 1-5" },
  { label: "Weekly — Monday 07:00", cron: "0 7 * * 1" },
  { label: "Weekly — Friday 17:00", cron: "0 17 * * 5" },
  { label: "Every hour", cron: "0 * * * *" },
];

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Light 5-field cron validation (enough to guide the user; node-cron does the
 *  authoritative check in the main process). */
export function validateCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^[*\d,\-/]+$/.test(p));
}

const pad = (s: string) => (s.length < 2 ? "0" + s : s);

function dowText(dow: string): string {
  if (dow === "*") return "Every day";
  if (dow === "1-5") return "Weekdays";
  if (dow === "0,6" || dow === "6,0") return "Weekends";
  const parts = dow.split(",");
  const names = parts.map((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 7 ? DOW[n % 7] + "s" : null;
  });
  if (names.every(Boolean)) return names.join(", ");
  return "Custom days";
}

/** Human-readable summary of a cron expression, best-effort. */
export function describeCron(expr: string): string {
  if (!validateCron(expr)) return "Not a valid schedule";
  const preset = SCHEDULE_PRESETS.find((p) => p.cron === expr.trim());
  if (preset) return preset.label.replace(" — ", ", ");
  const [m, h, dom, mon, dow] = expr.trim().split(/\s+/);
  if (dom === "*" && mon === "*") {
    if (h === "*" && m === "0") return "Every hour, on the hour";
    if (h !== "*" && m !== "*" && !h.includes(",") && !m.includes(",")) {
      return `${dowText(dow)} at ${pad(h)}:${pad(m)}`;
    }
  }
  return "Custom schedule";
}
