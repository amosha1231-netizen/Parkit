import type { Window } from "./types";

export const TZ = "Asia/Jerusalem";

/** Subtract busy periods from availability windows, clipped to `from`. */
export function freeWindows(available: Window[], busy: Window[], from: Date): Window[] {
  const sortedBusy = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Window[] = [];
  for (const w of [...available].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    let cursor = new Date(Math.max(w.start.getTime(), from.getTime()));
    if (cursor >= w.end) continue;
    for (const b of sortedBusy) {
      if (b.end <= cursor || b.start >= w.end) continue;
      if (b.start > cursor) out.push({ start: cursor, end: b.start });
      if (b.end > cursor) cursor = b.end;
    }
    if (cursor < w.end) out.push({ start: cursor, end: w.end });
  }
  return out;
}

export function covers(windows: Window[], start: Date, end: Date): boolean {
  return windows.some((w) => w.start <= start && w.end >= end);
}

/** Wall-clock hour:minute on a Jerusalem calendar day, as a UTC Date. */
export function jerusalemTime(day: Date, hour: number, minute = 0): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(day)
    .split("-")
    .map(Number);
  return fromWallClock(y, m, d, hour, minute);
}

function fromWallClock(y: number, m: number, d: number, hour: number, minute: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const offset = tzOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000);
}

function tzOffsetMinutes(d: Date): number {
  const local = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
  const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

/**
 * Value for <input type="datetime-local">, always in Israel time, so the server render,
 * the browser and a driver whose phone is set to another zone all agree.
 */
export function toJerusalemInput(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Inverse of toJerusalemInput. Returns an invalid Date for malformed input. */
export function fromJerusalemInput(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return new Date(NaN);
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  return fromWallClock(y, mo, d, h, mi);
}

export type Preset = "weekdays" | "nights" | "always" | "weekend";

export const PRESET_LABEL: Record<Preset, string> = {
  weekdays: "ימי חול 08:00–18:00",
  nights: "כל לילה 19:00–07:00",
  always: "כל הזמן (למשל כשאני בחו״ל)",
  weekend: "סופי שבוע (שישי 14:00 עד מוצ״ש)",
};

/** Expand a preset into concrete windows for the next `days` days. */
export function presetWindows(preset: Preset, from: Date, days = 14): Window[] {
  const out: Window[] = [];
  if (preset === "always") return [{ start: from, end: new Date(from.getTime() + days * 86400000) }];
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getTime() + i * 86400000);
    const dow = weekday(day);
    if (preset === "weekdays" && dow <= 4) out.push({ start: jerusalemTime(day, 8), end: jerusalemTime(day, 18) });
    if (preset === "nights") {
      const next = new Date(day.getTime() + 86400000);
      out.push({ start: jerusalemTime(day, 19), end: jerusalemTime(next, 7) });
    }
    if (preset === "weekend" && dow === 5) {
      const sat = new Date(day.getTime() + 86400000);
      out.push({ start: jerusalemTime(day, 14), end: jerusalemTime(sat, 21) });
    }
  }
  return out.filter((w) => w.end > from).map((w) => ({ start: w.start < from ? from : w.start, end: w.end }));
}

/** 0 = Sunday … 6 = Saturday, in Jerusalem. */
export function weekday(d: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export function formatWhen(d: Date): string {
  return d.toLocaleString("he-IL", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRange(w: Window): string {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const sameDay = day(w.start) === day(w.end);
  const endFmt = sameDay
    ? w.end.toLocaleTimeString("he-IL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
    : formatWhen(w.end);
  return `${formatWhen(w.start)} – ${endFmt}`;
}

/** Windows for the next `days` days that start where the existing availability ends, so they never overlap it. */
export function extensionWindows(preset: Preset, existing: Window[], now: Date, days = 14): Window[] {
  const lastEnd = existing.reduce((max, w) => Math.max(max, w.end.getTime()), 0);
  return presetWindows(preset, new Date(Math.max(now.getTime(), lastEnd)), days);
}

export function isPreset(v: unknown): v is Preset {
  return typeof v === "string" && v in PRESET_LABEL;
}
