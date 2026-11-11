import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteAgorot, quote } from "./pricing.ts";
import { freeWindows, covers, presetWindows, jerusalemTime, weekday, toJerusalemInput, fromJerusalemInput, extensionWindows } from "./time.ts";
import { safePath } from "./safe-path.ts";
import { normalizePlate } from "./plate.ts";

const d = (s: string) => new Date(s);

test("hourly price rounds partial hours up", () => {
  assert.equal(quoteAgorot(1000, 6000, 61), 2000);
});

test("daily cap applies within a day and per full day", () => {
  assert.equal(quoteAgorot(1000, 6000, 10 * 60), 6000);
  assert.equal(quoteAgorot(1000, 6000, 24 * 60 + 120), 6000 + 2000);
});

test("quote adds a 15% service fee", () => {
  const q = quote(1000, 6000, d("2026-10-22T10:00Z"), d("2026-10-22T12:00Z"));
  assert.deepEqual(q, { price: 2000, fee: 300, total: 2300 });
});

test("busy periods are cut out of availability", () => {
  const free = freeWindows(
    [{ start: d("2026-10-22T08:00Z"), end: d("2026-10-22T18:00Z") }],
    [{ start: d("2026-10-22T10:00Z"), end: d("2026-10-22T12:00Z") }],
    d("2026-10-22T07:00Z"),
  );
  assert.deepEqual(free, [
    { start: d("2026-10-22T08:00Z"), end: d("2026-10-22T10:00Z") },
    { start: d("2026-10-22T12:00Z"), end: d("2026-10-22T18:00Z") },
  ]);
  assert.ok(covers(free, d("2026-10-22T13:00Z"), d("2026-10-22T15:00Z")));
  assert.ok(!covers(free, d("2026-10-22T09:00Z"), d("2026-10-22T11:00Z")));
});

test("Jerusalem wall clock converts across DST", () => {
  // IDT (UTC+3) in summer, IST (UTC+2) in winter.
  assert.equal(jerusalemTime(d("2026-07-01T12:00Z"), 8).toISOString(), "2026-07-01T05:00:00.000Z");
  assert.equal(jerusalemTime(d("2026-12-01T12:00Z"), 8).toISOString(), "2026-12-01T06:00:00.000Z");
});

test("weekday preset skips Friday and Saturday", () => {
  const from = d("2026-10-18T00:00Z"); // Sunday in Israel
  const w = presetWindows("weekdays", from, 7);
  assert.equal(w.length, 5);
  assert.ok(w.every((x) => weekday(x.start) <= 4));
});

test("Israel-time input round-trips regardless of the machine's zone", () => {
  const t = d("2026-07-01T05:15:00Z"); // 08:15 IDT
  assert.equal(toJerusalemInput(t), "2026-07-01T08:15");
  assert.equal(fromJerusalemInput("2026-07-01T08:15").toISOString(), t.toISOString());
  assert.equal(fromJerusalemInput("2026-12-01T08:00").toISOString(), "2026-12-01T06:00:00.000Z");
  assert.ok(isNaN(fromJerusalemInput("garbage").getTime()));
});

test("extension starts where existing availability ends, without overlap", () => {
  const now = d("2026-10-18T00:00Z");
  const existing = presetWindows("always", now, 14);
  const more = extensionWindows("always", existing, now, 14);
  assert.equal(more[0].start.toISOString(), existing[0].end.toISOString());
  const nights = presetWindows("nights", now, 7);
  const next = extensionWindows("nights", nights, now, 7);
  const lastEnd = nights[nights.length - 1].end.getTime();
  assert.ok(next.every((w) => w.start.getTime() >= lastEnd));
  assert.ok(next.length > 0);
});

test("post-login redirect stays on this site", () => {
  assert.equal(safePath("/bookings"), "/bookings");
  assert.equal(safePath("//evil.com"), "/");
  assert.equal(safePath("/\\evil.com"), "/");
  assert.equal(safePath("https://evil.com"), "/");
  assert.equal(safePath(undefined), "/");
});

test("plates are normalized to the Israeli format", () => {
  assert.equal(normalizePlate("1234567"), "12-345-67");
  assert.equal(normalizePlate("123 45 678"), "123-45-678");
  assert.equal(normalizePlate("12-345-67"), "12-345-67");
  assert.equal(normalizePlate("12345"), null);
  assert.equal(normalizePlate("12a4567"), null);
});
