"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { shekels } from "@/lib/pricing";
import { formatRange } from "@/lib/time";
import { ACCESS_LABEL, SPOT_TYPE_LABEL, type SpotWithAvailability } from "@/lib/types";

const SpotMap = dynamic(() => import("./SpotMap"), { ssr: false, loading: () => <div className="map" /> });

type Filter = "now" | "app" | "ev" | "covered";
const FILTERS: [Filter, string][] = [
  ["now", "פנוי עכשיו"],
  ["app", "נפתח מהטלפון"],
  ["ev", "עמדת טעינה"],
  ["covered", "מקורה"],
];

type Sort = "soon" | "price";

export function isFreeNow(s: SpotWithAvailability, now = new Date()) {
  return s.free.some((w) => w.start <= now && w.end > now);
}

export function SpotBrowser({ spots }: { spots: SpotWithAvailability[] }) {
  const [active, setActive] = useState<Set<Filter>>(new Set());
  const [sort, setSort] = useState<Sort>("soon");
  const visible = useMemo(() => {
    const list = spots.filter(
      (s) =>
        (!active.has("now") || isFreeNow(s)) &&
        (!active.has("app") || s.access === "app") &&
        (!active.has("ev") || s.hasEv) &&
        (!active.has("covered") || s.spotType !== "open"),
    );
    return list.sort((a, b) =>
      sort === "price"
        ? a.priceHourAgorot - b.priceHourAgorot
        : a.free[0].start.getTime() - b.free[0].start.getTime() || a.priceHourAgorot - b.priceHourAgorot,
    );
  }, [spots, active, sort]);
  const toggle = (f: Filter) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <div className="grid">
      <SpotMap spots={visible} />
      <div>
        <div className="toolbar">
          <div className="chips">
            {FILTERS.map(([f, label]) => (
              <button key={f} className="chip" aria-pressed={active.has(f)} onClick={() => toggle(f)}>
                {label}
              </button>
            ))}
          </div>
          <select aria-label="מיון" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="soon">הכי מוקדם</option>
            <option value="price">הכי זול</option>
          </select>
        </div>
        <p className="meta" style={{ margin: "0 0 8px" }}>
          {visible.length} חניות פנויות{visible.length !== spots.length && ` מתוך ${spots.length}`}
        </p>
        <div className="list">
          {spots.length === 0 && (
            <div className="empty">
              עוד אין חניות פנויות באזור. יש לכם חניה שעומדת ריקה? <Link href="/host">פרסמו אותה</Link>.
            </div>
          )}
          {spots.length > 0 && visible.length === 0 && <div className="empty">אין חניות שמתאימות לסינון. נסו להסיר מסנן.</div>}
          {visible.map((s) => (
            <Link key={s.id} href={`/spots/${s.id}`} className="card">
              <div>
                <h3>{s.neighborhood}</h3>
                <div className="meta">{SPOT_TYPE_LABEL[s.spotType]}</div>
                <div className="meta">הזמינות הקרובה: {formatRange(s.free[0])}</div>
              </div>
              <div className="price">
                {shekels(s.priceHourAgorot)}
                <small>לשעה · {shekels(s.priceDayAgorot)} ליום</small>
              </div>
              <div className="tags">
                {isFreeNow(s) && <span className="tag ok">פנוי עכשיו</span>}
                <span className="tag">{ACCESS_LABEL[s.access]}</span>
                {s.hasEv && <span className="tag">⚡ טעינה</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
