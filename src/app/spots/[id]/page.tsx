import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/repo";
import { shekels } from "@/lib/pricing";
import { formatRange } from "@/lib/time";
import { ACCESS_LABEL, SPOT_TYPE_LABEL } from "@/lib/types";
import { BookingForm } from "@/components/BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const spot = await repo.getSpot((await params).id);
  if (!spot) return {};
  return {
    title: `חניה ב${spot.neighborhood} · ${shekels(spot.priceHourAgorot)} לשעה · Parkit`,
    description: `${SPOT_TYPE_LABEL[spot.spotType]}, ${ACCESS_LABEL[spot.access]}. עד ${shekels(spot.priceDayAgorot)} ליום.`,
  };
}

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [spot, user] = await Promise.all([repo.getSpot(id), repo.currentUser()]);
  if (!spot) notFound();
  const isOwner = user?.id === spot.ownerId;

  return (
    <div className="two">
      <section className="panel">
        <Link href="/" className="meta">→ חזרה למפה</Link>
        <h2>{spot.neighborhood}</h2>
        {!spot.active && <div className="notice">החניה מושהית ולא מוצגת במפה. אפשר לחדש אותה במסך ״השכר את החניה שלך״.</div>}
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
      {isOwner ? (
        <section className="panel">
          <h2>זו החניה שלך</h2>
          <p className="meta">כך נהגים רואים אותה. לניהול זמינות, השהיה והזמנות שנכנסו, עברו ל<Link href="/host">מסך המשכיר</Link>.</p>
        </section>
      ) : spot.active && spot.free.length > 0 && (
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
