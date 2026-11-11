"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <section className="panel center">
      <h2>משהו השתבש</h2>
      <p className="meta">לא הצלחנו להשלים את הפעולה. נסו שוב, ואם זה חוזר, חזרו למפה.</p>
      <div className="row">
        <button className="primary" onClick={reset}>נסו שוב</button>
        <Link className="ghost" href="/">חזרה למפה</Link>
      </div>
    </section>
  );
}
