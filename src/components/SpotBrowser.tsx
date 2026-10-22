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

export function isFreeNow(s: SpotWithAvailability, now = new Date()) {
  return s.free.some((w) => w.start <= now && w.end > now);
}

export function SpotBrowser({ spots }: { spots: SpotWithAvailability[] }) {
  const [active, setActive] = useState<Set<Filter>>(new Set());
  const visible = useMemo(
    () =>
      spots.filter(
        (s) =>
          (!active.has("now") || isFreeNow(s)) &&
          (!active.has("app") || s.access === "app") &&
          (!active.has("ev") || s.hasEv) &&
          (!active.has("covered") || s.spotType !== "open"),
      ),
    [spots, active],
  );
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
        <div className="chips">
          {FILTERS.map(([f, label]) => (
            <button key={f} className="chip" aria-pressed={active.has(f)} onClick={() => toggle(f)}>
              {label}
            </button>
          ))}
        </div>
        <div className="list">
          {visible.length === 0 && <div className="empty">אין חניות שמתאימות לסינון. נסו להסיר מסנן.</div>}
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
