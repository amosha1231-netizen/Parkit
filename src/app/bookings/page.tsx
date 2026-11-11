import Link from "next/link";
import { redirect } from "next/navigation";
import { repo, ERROR_TEXT, CANCEL_CUTOFF_MS, type BookingErrorCode } from "@/lib/repo";
import { shekels } from "@/lib/pricing";
import { formatRange } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { cancelBooking } from "../actions";

export const dynamic = "force-dynamic";

/** Google Calendar "add event" link; times are UTC in the compact basic format. */
function calendarUrl(b: Booking) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `חניה ב${b.neighborhood} (Parkit)`,
    dates: `${fmt(b.start)}/${fmt(b.end)}`,
    details: [`רכב ${b.plate}`, b.accessInstructions].filter(Boolean).join("\n"),
    location: b.address ?? b.neighborhood,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; cancelled?: string; error?: string }>;
}) {
  if (!(await repo.currentUser())) redirect("/login?next=/bookings");
  const [params, bookings] = await Promise.all([searchParams, repo.myBookings()]);
  const now = Date.now();
  const isUpcoming = (b: Booking) => b.status === "confirmed" && b.end.getTime() > now;
  const upcoming = bookings.filter(isUpcoming).sort((a, b) => a.start.getTime() - b.start.getTime());
  const past = bookings.filter((b) => !isUpcoming(b));
  const errorText = params.error ? ERROR_TEXT[params.error as BookingErrorCode] ?? "הפעולה נכשלה. נסו שוב." : null;

  return (
    <div className="list">
      {params.new && <div className="notice">ההזמנה אושרה. הכתובת והוראות הכניסה מופיעות למטה.</div>}
      {params.cancelled && <div className="notice">ההזמנה בוטלה.</div>}
      {errorText && <div className="error" role="alert">{errorText}</div>}
      {bookings.length === 0 && (
        <div className="empty">
          עוד אין הזמנות. <Link href="/">מצאו חניה במפה</Link>.
        </div>
      )}
      {upcoming.length > 0 && <h2>הזמנות קרובות</h2>}
      {upcoming.map((b) => {
        const wazeUrl = b.address ? `https://waze.com/ul?q=${encodeURIComponent(b.address)}&navigate=yes` : null;
        const active = b.start.getTime() <= now;
        return (
          <section key={b.id} className="panel">
            <h2>{b.address ?? b.neighborhood}</h2>
            <div className="meta">
              {active && <span className="tag ok">פעילה עכשיו</span>} {formatRange(b)} · רכב <span dir="ltr">{b.plate}</span> ·{" "}
              {shekels(b.priceAgorot + b.feeAgorot)}
            </div>
            {b.accessInstructions && <div className="secret">{b.accessInstructions}</div>}
            <div className="row">
              {wazeUrl && <a className="ghost" href={wazeUrl} target="_blank" rel="noreferrer">ניווט ב-Waze</a>}
              {!active && <a className="ghost" href={calendarUrl(b)} target="_blank" rel="noreferrer">הוספה ליומן</a>}
              {b.start.getTime() - now > CANCEL_CUTOFF_MS ? (
                <form action={cancelBooking}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="ghost" type="submit">ביטול הזמנה</button>
                </form>
              ) : (
                !active && <span className="meta">אפשר לבטל עד שעה לפני ההתחלה.</span>
              )}
            </div>
          </section>
        );
      })}
      {past.length > 0 && (
        <details className="panel">
          <summary><strong>הזמנות קודמות ומבוטלות ({past.length})</strong></summary>
          <ul className="windows">
            {past.map((b) => (
              <li key={b.id}>
                {b.neighborhood} · {formatRange(b)} · {shekels(b.priceAgorot + b.feeAgorot)}
                {b.status === "cancelled" && " · בוטלה"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
