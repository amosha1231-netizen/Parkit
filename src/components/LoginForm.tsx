"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {});
  return (
    <form action={action} className="panel" style={{ maxWidth: 420 }}>
      <h2>כניסה</h2>
      <p className="meta" style={{ margin: 0 }}>נשלח לך קישור כניסה במייל. אין צורך בסיסמה.</p>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">מייל</label>
        <input id="email" name="email" type="email" dir="ltr" required />
      </div>
      {state.error && <div className="error" role="alert">{state.error}</div>}
      {state.ok && <div className="ok" role="status">{state.ok}</div>}
      <button className="primary" type="submit" disabled={pending}>{pending ? "שולח…" : "שלחו לי קישור"}</button>
    </form>
  );
}
