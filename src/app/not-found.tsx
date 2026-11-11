import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel center">
      <h2>לא מצאנו את הדף</h2>
      <p className="meta">ייתכן שהחניה הוסרה או שהקישור שגוי.</p>
      <Link className="primary" href="/">חזרה למפה</Link>
    </section>
  );
}
