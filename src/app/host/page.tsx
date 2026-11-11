import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { shekels } from "@/lib/pricing";
import { formatRange, isPreset, PRESET_LABEL, type Preset } from "@/lib/time";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { HostForm } from "@/components/HostForm";
import { extendSpot, toggleSpot } from "../actions";

export const dynamic = "force-dynamic";

const DAY = 86400000;

export default async function HostPage() {
  if (!(await repo.currentUser())) redirect("/login?next=/host");
  const [mine, all, incoming] = await Promise.all([repo.mySpots(), repo.listSpots(), repo.hostBookings()]);
  const now = Date.now();

  // Average hourly price per neighborhood, used as a pricing hint in the form.
  const avg: Record<string, number> = {};
  for (const hood of Object.keys(NEIGHBORHOODS)) {
    const near = all.filter((s) => s.neighborhood === hood);
    if (near.length) avg[hood] = Math.round(near.reduce((a, s) => a + s.priceHourAgorot, 0) / near.length);
  }

  const confirmed = incoming.filter((b) => b.status === "confirmed");
  const upcoming = confirmed.filter((b) => b.end.getTime() > now).sort((a, b) => a.start.getTime() - b.start.getTime());
  const monthAgo = now - 30 * DAY;
  const earned30 = confirmed.filter((b) => b.start.getTime() >= monthAgo).reduce((sum, b) => sum + b.priceAgorot, 0);

  return (
    <div className="two">
      <HostForm neighborhoods={Object.keys(NEIGHBORHOODS)} avgHourAgorot={avg} />
      <div className="list">
        <section className="panel">
          <h2>החניות שלי</h2>
          {mine.length === 0 ? (
            <p className="meta">עוד לא פרסמת חניה.</p>
          ) : (
            <div className="list">
              {mine.map((s) => {
                const lastEnd = s.free.reduce((max, w) => Math.max(max, w.end.getTime()), 0);
                const runningOut = lastEnd - now < 4 * DAY;
                const preset: Preset = isPreset(s.schedule) ? s.schedule : "weekdays";
                return (
                  <div key={s.id} className="card">
                    <Link href={`/spots/${s.id}`} className="card-link">
                      <h3>{s.neighborhood}</h3>
                      <div className="meta">
                        {!s.active ? "מושהית, לא מוצגת במפה" : s.free[0] ? `פנוי הבא: ${formatRange(s.free[0])}` : "אין חלונות פנויים"}
                      </div>
                      {s.active && runningOut && (
                        <div className="meta warn">{lastEnd > now ? "הזמינות מסתיימת בקרוב." : "הזמינות הסתיימה, החניה לא מופיעה במפה."}</div>
                      )}
                    </Link>
                    <div className="price">{shekels(s.priceHourAgorot)}<small>לשעה</small></div>
                    <div className="row actions">
                      <form action={extendSpot}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="preset" value={preset} />
                        <button className={runningOut ? "primary small" : "ghost"} type="submit" title={PRESET_LABEL[preset]}>
                          הוסף שבועיים זמינות
                        </button>
                      </form>
                      <form action={toggleSpot}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={s.active ? "0" : "1"} />
                        <button className="ghost" type="submit">{s.active ? "השהיית פרסום" : "חידוש פרסום"}</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="meta">
            השכרה חודשית קבועה של חניה בתל אביב עומדת בממוצע על כ-900 ₪ (יד2, יולי 2026). כאן משכירים רק את השעות שהחניה ממילא ריקה.
          </p>
        </section>

        {mine.length > 0 && (
          <section className="panel">
            <h2>הזמנות לחניות שלי</h2>
            <div className="sum">
              <span>הכנסה ב-30 הימים האחרונים</span>
              <span className="total">{shekels(earned30)}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="meta">אין הזמנות קרובות.</p>
            ) : (
              <ul className="windows">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <strong>{formatRange(b)}</strong> · {b.neighborhood} · רכב <span dir="ltr">{b.plate}</span> · {shekels(b.priceAgorot)}
                    {b.start.getTime() <= now && <span className="tag ok"> עכשיו בחניה</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
