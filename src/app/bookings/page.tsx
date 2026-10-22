import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { shekels } from "@/lib/pricing";
import { formatRange } from "@/lib/time";
import { cancelBooking } from "../actions";

export const dynamic = "force-dynamic";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  if (!(await repo.currentUser())) redirect("/login?next=/bookings");
  const [{ new: isNew }, bookings] = await Promise.all([searchParams, repo.myBookings()]);
  const now = Date.now();

  return (
    <div className="list">
      {isNew && <div className="notice">ההזמנה אושרה. הכתובת והוראות הכניסה מופיעות למטה.</div>}
      {bookings.length === 0 && (
        <div className="empty">
          עוד אין הזמנות. <Link href="/">מצאו חניה במפה</Link>.
        </div>
      )}
      {bookings.map((b) => {
        const upcoming = b.status === "confirmed" && b.end.getTime() > now;
        const wazeUrl = b.address ? `https://waze.com/ul?q=${encodeURIComponent(b.address)}&navigate=yes` : null;
        return (
          <section key={b.id} className="panel">
            <h2>{b.address ?? b.neighborhood}</h2>
            <div className="meta">
              {formatRange({ start: b.start, end: b.end })} · רכב {b.plate} · {shekels(b.priceAgorot + b.feeAgorot)}
              {b.status === "cancelled" && " · בוטלה"}
            </div>
            {upcoming && b.accessInstructions && <div className="secret">{b.accessInstructions}</div>}
            {upcoming && (
              <div className="row">
                {wazeUrl && <a className="ghost" href={wazeUrl} target="_blank" rel="noreferrer">ניווט ב-Waze</a>}
                {b.start.getTime() - now > 3600000 && (
                  <form action={cancelBooking}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="ghost" type="submit">ביטול הזמנה</button>
                  </form>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
