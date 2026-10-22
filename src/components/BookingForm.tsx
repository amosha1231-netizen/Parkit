"use client";

import { useActionState, useMemo, useState } from "react";
import { bookSpot, type FormState } from "@/app/actions";
import { quote, shekels } from "@/lib/pricing";

interface Props {
  spotId: string;
  priceHourAgorot: number;
  priceDayAgorot: number;
  free: { start: string; end: string }[];
}

/** Value for <input type="datetime-local"> in the browser's own time zone. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function roundUpQuarter(d: Date) {
  const ms = 15 * 60000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

const DURATIONS: [number, string][] = [
  [2, "שעתיים"],
  [4, "4 שעות"],
  [10, "10 שעות"],
  [24, "יממה"],
];

export function BookingForm({ spotId, priceHourAgorot, priceDayAgorot, free }: Props) {
  const first = free[0];
  const initialStart = roundUpQuarter(new Date(Math.max(Date.now(), new Date(first.start).getTime())));
  const initialEnd = new Date(Math.min(initialStart.getTime() + 2 * 3600000, new Date(first.end).getTime()));
  const [start, setStart] = useState(toLocalInput(initialStart));
  const [end, setEnd] = useState(toLocalInput(initialEnd));
  const [state, action, pending] = useActionState<FormState, FormData>(bookSpot, {});

  const s = new Date(start);
  const e = new Date(end);
  const valid = !isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s;
  const inWindow = valid && free.some((w) => new Date(w.start) <= s && new Date(w.end) >= e);
  const q = useMemo(() => (valid ? quote(priceHourAgorot, priceDayAgorot, s, e) : null), [valid, priceHourAgorot, priceDayAgorot, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action} className="panel">
      <h2>הזמנה</h2>
      <input type="hidden" name="spotId" value={spotId} />
      <input type="hidden" name="start" value={valid ? s.toISOString() : ""} />
      <input type="hidden" name="end" value={valid ? e.toISOString() : ""} />
      <div className="row">
        <div className="field">
          <label htmlFor="start">מ-</label>
          <input id="start" type="datetime-local" step={900} value={start} onChange={(ev) => setStart(ev.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="end">עד</label>
          <input id="end" type="datetime-local" step={900} value={end} onChange={(ev) => setEnd(ev.target.value)} required />
        </div>
      </div>
      <div className="chips">
        {DURATIONS.map(([h, label]) => (
          <button key={h} type="button" className="chip" onClick={() => !isNaN(s.getTime()) && setEnd(toLocalInput(new Date(s.getTime() + h * 3600000)))}>
            {label}
          </button>
        ))}
      </div>
      {valid && !inWindow && <div className="error">הטווח הזה חורג מהזמינות של החניה.</div>}
      <div className="field">
        <label htmlFor="plate">מספר רכב</label>
        <input id="plate" name="plate" inputMode="numeric" placeholder="12-345-67" required />
      </div>
      {q && (
        <div className="sum">
          <span>חניה</span>
          <span>{shekels(q.price)}</span>
          <span className="meta">דמי שירות</span>
          <span className="meta">{shekels(q.fee)}</span>
          <span className="total">סה״כ</span>
          <span className="total">{shekels(q.total)}</span>
        </div>
      )}
      {state.error && <div className="error" role="alert">{state.error}</div>}
      <button className="primary" type="submit" disabled={pending || !inWindow}>
        {pending ? "מזמין…" : "הזמן"}
      </button>
      <p className="meta" style={{ margin: 0 }}>התשלום בגרסה הזו עדיין לא מחובר. ההזמנה נשמרת בלי חיוב.</p>
    </form>
  );
}
