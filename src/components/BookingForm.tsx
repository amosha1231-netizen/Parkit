"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { bookSpot, type FormState } from "@/app/actions";
import { quote, shekels } from "@/lib/pricing";
import { formatRange, fromJerusalemInput, toJerusalemInput } from "@/lib/time";

interface Props {
  spotId: string;
  priceHourAgorot: number;
  priceDayAgorot: number;
  free: { start: string; end: string }[];
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
  const [start, setStart] = useState(toJerusalemInput(initialStart));
  const [end, setEnd] = useState(toJerusalemInput(initialEnd));
  const [state, action, pending] = useActionState<FormState, FormData>(bookSpot, {});
  const plateRef = useRef<HTMLInputElement>(null);

  // Remember the plate on this device so repeat drivers do not retype it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("parkit.plate");
      if (saved && plateRef.current && !plateRef.current.value) plateRef.current.value = saved;
    } catch {}
  }, []);
  const rememberPlate = () => {
    try {
      if (plateRef.current?.value) localStorage.setItem("parkit.plate", plateRef.current.value.trim());
    } catch {}
  };

  // Inputs are Israel wall-clock time (see toJerusalemInput), whatever zone the phone is set to.
  const s = fromJerusalemInput(start);
  const e = fromJerusalemInput(end);
  const bothSet = !isNaN(s.getTime()) && !isNaN(e.getTime());
  const valid = bothSet && e > s;
  const inWindow = valid && free.some((w) => new Date(w.start) <= s && new Date(w.end) >= e);
  const q = useMemo(() => (valid ? quote(priceHourAgorot, priceDayAgorot, s, e) : null), [valid, priceHourAgorot, priceDayAgorot, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action} onSubmit={rememberPlate} className="panel">
      <h2>הזמנה</h2>
      <input type="hidden" name="spotId" value={spotId} />
      <input type="hidden" name="start" value={valid ? s.toISOString() : ""} />
      <input type="hidden" name="end" value={valid ? e.toISOString() : ""} />
      <div className="row">
        <div className="field">
          <label htmlFor="start">מ- (שעון ישראל)</label>
          <input id="start" type="datetime-local" step={900} value={start} onChange={(ev) => setStart(ev.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="end">עד</label>
          <input id="end" type="datetime-local" step={900} value={end} onChange={(ev) => setEnd(ev.target.value)} required />
        </div>
      </div>
      <div className="chips">
        {DURATIONS.map(([h, label]) => (
          <button key={h} type="button" className="chip" onClick={() => !isNaN(s.getTime()) && setEnd(toJerusalemInput(new Date(s.getTime() + h * 3600000)))}>
            {label}
          </button>
        ))}
      </div>
      {bothSet && !valid && <div className="error">שעת הסיום צריכה להיות אחרי שעת ההתחלה.</div>}
      {valid && !inWindow && (
        <div className="error">
          הטווח הזה חורג מהזמינות של החניה. חלונות פנויים:
          <div className="chips" style={{ marginTop: 6, marginBottom: 0 }}>
            {free.slice(0, 4).map((w) => (
              <button
                key={w.start}
                type="button"
                className="chip"
                onClick={() => {
                  const ws = roundUpQuarter(new Date(Math.max(Date.now(), new Date(w.start).getTime())));
                  setStart(toJerusalemInput(ws));
                  setEnd(toJerusalemInput(new Date(Math.min(ws.getTime() + 2 * 3600000, new Date(w.end).getTime()))));
                }}
              >
                {formatRange({ start: new Date(w.start), end: new Date(w.end) })}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="plate">מספר רכב</label>
        <input ref={plateRef} id="plate" name="plate" inputMode="numeric" autoComplete="off" dir="ltr" placeholder="12-345-67" maxLength={10} required />
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
