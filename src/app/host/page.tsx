import Link from "next/link";
import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { shekels } from "@/lib/pricing";
import { formatRange } from "@/lib/time";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { HostForm } from "@/components/HostForm";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  if (!(await repo.currentUser())) redirect("/login?next=/host");
  const [mine, all] = await Promise.all([repo.mySpots(), repo.listSpots()]);

  // Average hourly price per neighborhood, used as a pricing hint in the form.
  const avg: Record<string, number> = {};
  for (const hood of Object.keys(NEIGHBORHOODS)) {
    const near = all.filter((s) => s.neighborhood === hood);
    if (near.length) avg[hood] = Math.round(near.reduce((a, s) => a + s.priceHourAgorot, 0) / near.length);
  }

  return (
    <div className="two">
      <HostForm neighborhoods={Object.keys(NEIGHBORHOODS)} avgHourAgorot={avg} />
      <section className="panel">
        <h2>החניות שלי</h2>
        {mine.length === 0 ? (
          <p className="meta">עוד לא פרסמת חניה.</p>
        ) : (
          <div className="list">
            {mine.map((s) => (
              <Link key={s.id} href={`/spots/${s.id}`} className="card">
                <div>
                  <h3>{s.neighborhood}</h3>
                  <div className="meta">{s.free[0] ? `פנוי הבא: ${formatRange(s.free[0])}` : "אין חלונות פנויים"}</div>
                </div>
                <div className="price">{shekels(s.priceHourAgorot)}<small>לשעה</small></div>
              </Link>
            ))}
          </div>
        )}
        <p className="meta">
          השכרה חודשית קבועה של חניה בתל אביב עומדת בממוצע על כ-900 ₪ (יד2, יולי 2026). כאן משכירים רק את השעות שהחניה ממילא ריקה.
        </p>
      </section>
    </div>
  );
}
