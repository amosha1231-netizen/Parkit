"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { repo, RepoError, ERROR_TEXT, type BookingErrorCode } from "@/lib/repo";
import { supabaseServer } from "@/lib/supabase/server";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { normalizePlate } from "@/lib/plate";
import { safePath } from "@/lib/safe-path";
import { isPreset, presetWindows } from "@/lib/time";
import { isAccess, isSpotType } from "@/lib/types";

export type FormState = { error?: string; ok?: string };

const repoMessage = (e: unknown, fallback: string) =>
  e instanceof RepoError ? ERROR_TEXT[e.code as BookingErrorCode] ?? fallback : null;

export async function bookSpot(_: FormState, form: FormData): Promise<FormState> {
  const spotId = String(form.get("spotId"));
  const start = new Date(String(form.get("start")));
  const end = new Date(String(form.get("end")));
  const plate = normalizePlate(String(form.get("plate") ?? ""));
  if (!plate) return { error: "מספר רכב לא תקין. כתבו 7 או 8 ספרות, למשל 12-345-67." };
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "בחרו שעת התחלה וסיום." };
  if (!(await repo.currentUser())) redirect(`/login?next=/spots/${encodeURIComponent(spotId)}`);
  try {
    await repo.book(spotId, start, end, plate);
  } catch (e) {
    const msg = repoMessage(e, "ההזמנה נכשלה. נסו שוב.");
    if (msg) return { error: msg };
    throw e;
  }
  revalidatePath("/");
  revalidatePath(`/spots/${spotId}`);
  redirect("/bookings?new=1");
}

export async function cancelBooking(form: FormData) {
  try {
    await repo.cancelBooking(String(form.get("id")));
  } catch (e) {
    if (!(e instanceof RepoError)) throw e;
    redirect(`/bookings?error=${encodeURIComponent(e.code)}`);
  }
  revalidatePath("/");
  redirect("/bookings?cancelled=1");
}

const shekelsToAgorot = (v: FormDataEntryValue | null) => Math.round(Number(v) * 100);
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function createSpot(_: FormState, form: FormData): Promise<FormState> {
  if (!(await repo.currentUser())) redirect("/login?next=/host");
  const neighborhood = text(form, "neighborhood");
  const address = text(form, "address");
  const accessInstructions = text(form, "accessInstructions");
  const description = text(form, "description");
  const preset = String(form.get("preset"));
  const spotType = String(form.get("spotType"));
  const access = String(form.get("access"));
  const hour = shekelsToAgorot(form.get("priceHour"));
  const day = shekelsToAgorot(form.get("priceDay"));
  if (!(neighborhood in NEIGHBORHOODS)) return { error: "בחרו שכונה מהרשימה." };
  if (address.length < 4 || address.length > 200) return { error: "כתבו כתובת מלאה. היא תוצג רק לנהג שהזמין." };
  if (!isSpotType(spotType) || !isAccess(access)) return { error: "בחרו סוג חניה ואופן כניסה." };
  if (!isPreset(preset)) return { error: "בחרו מתי החניה פנויה." };
  if (!(hour >= 100 && hour <= 10000)) return { error: "מחיר לשעה צריך להיות בין 1 ל-100 ₪." };
  if (!(day >= 1000 && day <= 50000)) return { error: "מחיר ליום צריך להיות בין 10 ל-500 ₪." };
  if (day < hour) return { error: "המחיר ליום לא יכול להיות נמוך מהמחיר לשעה." };
  if (accessInstructions.length > 500 || description.length > 500) return { error: "הטקסט ארוך מדי. עד 500 תווים." };
  if (access === "code" && !accessInstructions) return { error: "בחרתם כניסה עם קוד. כתבו את הקוד בהוראות הכניסה, הוא יישלח רק לנהג שהזמין." };
  try {
    await repo.createSpot({
      neighborhood, address, accessInstructions, spotType, access, description,
      hasEv: form.get("hasEv") === "on",
      priceHourAgorot: hour,
      priceDayAgorot: day,
      schedule: preset,
      windows: presetWindows(preset, new Date()),
    });
  } catch (e) {
    console.error("createSpot failed", e);
    return { error: repoMessage(e, "") || "לא הצלחנו לפרסם את החניה. נסו שוב בעוד רגע." };
  }
  revalidatePath("/");
  revalidatePath("/host");
  return { ok: "החניה פורסמה ומופיעה במפה." };
}

export async function toggleSpot(form: FormData) {
  const id = String(form.get("id"));
  await repo.setSpotActive(id, form.get("active") === "1");
  revalidatePath("/");
  revalidatePath("/host");
  revalidatePath(`/spots/${id}`);
}

export async function extendSpot(form: FormData) {
  const id = String(form.get("id"));
  const preset = String(form.get("preset"));
  if (!isPreset(preset)) return;
  await repo.extendAvailability(id, preset);
  revalidatePath("/");
  revalidatePath("/host");
  revalidatePath(`/spots/${id}`);
}

export async function sendMagicLink(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  const next = safePath(String(form.get("next") || "/"));
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "כתובת המייל לא תקינה." };
  // Prefer the configured site URL; the Origin header is only a fallback for local development.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || (await headers()).get("origin") || "";
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: "לא הצלחנו לשלוח מייל. נסו שוב בעוד דקה." };
  return { ok: `שלחנו קישור כניסה ל-${email}. אפשר לסגור את הלשונית הזו.` };
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}
