"use client";

import { useActionState, useState } from "react";
import { createSpot, type FormState } from "@/app/actions";
import { SERVICE_FEE_RATE, shekels } from "@/lib/pricing";
import { PRESET_LABEL, type Preset } from "@/lib/time";
import { ACCESS_LABEL, SPOT_TYPE_LABEL } from "@/lib/types";

// Hours offered per month for each preset, and an assumed occupancy, for the earnings estimate.
const MONTHLY_HOURS: Record<Preset, number> = { weekdays: 22 * 10, nights: 30 * 12, always: 30 * 24, weekend: 4 * 31 };
const OCCUPANCY = 0.4;

export function HostForm({ neighborhoods, avgHourAgorot }: { neighborhoods: string[]; avgHourAgorot: Record<string, number> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createSpot, {});
  const [hood, setHood] = useState(neighborhoods[0]);
  const [preset, setPreset] = useState<Preset>("weekdays");
  const [hour, setHour] = useState(10);
  const [day, setDay] = useState(60);

  // Long windows sell mostly by the day, so estimate those at the daily rate.
  const gross = preset === "always" ? 30 * OCCUPANCY * day * 100 : MONTHLY_HOURS[preset] * OCCUPANCY * hour * 100;
  const net = gross * (1 - SERVICE_FEE_RATE);

  return (
    <form action={action} className="panel">
      <h2>פרסום חניה</h2>
      <p className="meta" style={{ margin: 0 }}>הכתובת המדויקת נחשפת רק לנהג שהזמין.</p>
      <div className="row">
        <div className="field">
          <label htmlFor="neighborhood">שכונה</label>
          <select id="neighborhood" name="neighborhood" value={hood} onChange={(e) => setHood(e.target.value)}>
            {neighborhoods.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="address">כתובת מלאה</label>
          <input id="address" name="address" placeholder="ז׳בוטינסקי 40, תל אביב" required />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="spotType">סוג</label>
          <select id="spotType" name="spotType">
            {Object.entries(SPOT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="access">כניסה</label>
          <select id="access" name="access">
            {Object.entries(ACCESS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="accessInstructions">הוראות כניסה (קוד, מספר חניה)</label>
        <input id="accessInstructions" name="accessInstructions" placeholder="קוד לשער 4821#, חניה מספר 7" />
      </div>
      <div className="field">
        <label>מתי פנוי? (לשבועיים הקרובים)</label>
        <input type="hidden" name="preset" value={preset} />
        <div className="chips">
          {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={preset === p} onClick={() => setPreset(p)}>
              {PRESET_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="priceHour">מחיר לשעה (₪)</label>
          <input id="priceHour" name="priceHour" type="number" min={1} max={100} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="priceDay">מחיר ליום (₪)</label>
          <input id="priceDay" name="priceDay" type="number" min={10} max={500} value={day} onChange={(e) => setDay(Number(e.target.value))} />
        </div>
      </div>
      {avgHourAgorot[hood] && <p className="meta" style={{ margin: 0 }}>חניות ב{hood} מושכרות בממוצע ב-{shekels(avgHourAgorot[hood])} לשעה.</p>}
      <label className="check"><input type="checkbox" name="hasEv" /> יש עמדת טעינה לרכב חשמלי</label>
      <div className="field">
        <label htmlFor="description">תיאור קצר (לא חובה)</label>
        <textarea id="description" name="description" rows={2} placeholder="חניה רחבה, מתאימה לרכב משפחתי" />
      </div>
      <div className="sum">
        <span>הערכת הכנסה חודשית נטו</span>
        <span className="total">{shekels(net)}</span>
        <span className="meta">בהנחת תפוסה של {OCCUPANCY * 100}% ואחרי עמלה של {SERVICE_FEE_RATE * 100}%</span>
        <span />
      </div>
      {state.error && <div className="error" role="alert">{state.error}</div>}
      {state.ok && <div className="ok" role="status">{state.ok}</div>}
      <button className="primary" type="submit" disabled={pending}>{pending ? "מפרסם…" : "פרסם את החניה"}</button>
    </form>
  );
}
