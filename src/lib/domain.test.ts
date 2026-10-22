import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteAgorot, quote } from "./pricing.ts";
import { freeWindows, covers, presetWindows, jerusalemTime, weekday } from "./time.ts";

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
