import { notFound } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/repo";
import { shekels } from "@/lib/pricing";
import { formatRange } from "@/lib/time";
import { ACCESS_LABEL, SPOT_TYPE_LABEL } from "@/lib/types";
import { BookingForm } from "@/components/BookingForm";

export const dynamic = "force-dynamic";

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spot = await repo.getSpot(id);
  if (!spot) notFound();

  return (
    <div className="two">
      <section className="panel">
        <Link href="/" className="meta">→ חזרה למפה</Link>
        <h2>{spot.neighborhood}</h2>
        <div className="meta">
          {SPOT_TYPE_LABEL[spot.spotType]} · {ACCESS_LABEL[spot.access]}
          {spot.hasEv && " · ⚡ עמדת טעינה"}
        </div>
        {spot.description && <p style={{ margin: 0 }}>{spot.description}</p>}
        <div className="price" style={{ textAlign: "start" }}>
          {shekels(spot.priceHourAgorot)} לשעה <small>עד {shekels(spot.priceDayAgorot)} ליום. מחיר יומי חל אוטומטית כשהוא זול יותר.</small>
        </div>
        <div>
          <strong>מתי פנוי</strong>
          {spot.free.length === 0 ? (
            <p className="meta">אין כרגע חלונות פנויים.</p>
          ) : (
            <ul className="windows">
              {spot.free.slice(0, 8).map((w) => (
                <li key={w.start.toISOString()}>{formatRange(w)}</li>
              ))}
            </ul>
          )}
        </div>
        <p className="meta">הכתובת המדויקת והוראות הכניסה נשלחות אחרי ההזמנה.</p>
      </section>
      {spot.free.length > 0 && (
        <BookingForm
          spotId={spot.id}
          priceHourAgorot={spot.priceHourAgorot}
          priceDayAgorot={spot.priceDayAgorot}
          free={spot.free.map((w) => ({ start: w.start.toISOString(), end: w.end.toISOString() }))}
        />
      )}
    </div>
  );
}
