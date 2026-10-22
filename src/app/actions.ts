"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { repo, RepoError, ERROR_TEXT, type BookingErrorCode } from "@/lib/repo";
import { supabaseServer } from "@/lib/supabase/server";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";
import { presetWindows, PRESET_LABEL, type Preset } from "@/lib/time";
import type { Access, SpotType } from "@/lib/types";

export type FormState = { error?: string; ok?: string };

const PLATE = /^\d{2,3}-?\d{2,3}-?\d{2,3}$/;

export async function bookSpot(_: FormState, form: FormData): Promise<FormState> {
  const spotId = String(form.get("spotId"));
  const start = new Date(String(form.get("start")));
  const end = new Date(String(form.get("end")));
  const plate = String(form.get("plate") ?? "").trim();
  if (!PLATE.test(plate)) return { error: "מספר רכב לא תקין. כתבו 7 או 8 ספרות, למשל 12-345-67." };
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "בחרו שעת התחלה וסיום." };
  if (!(await repo.currentUser())) redirect(`/login?next=/spots/${spotId}`);
  try {
    await repo.book(spotId, start, end, plate);
  } catch (e) {
    if (e instanceof RepoError) return { error: ERROR_TEXT[e.code as BookingErrorCode] ?? "ההזמנה נכשלה. נסו שוב." };
    throw e;
  }
  revalidatePath("/");
  redirect("/bookings?new=1");
}

export async function cancelBooking(form: FormData) {
  await repo.cancelBooking(String(form.get("id")));
  revalidatePath("/bookings");
}

const shekelsToAgorot = (v: FormDataEntryValue | null) => Math.round(Number(v) * 100);

export async function createSpot(_: FormState, form: FormData): Promise<FormState> {
  if (!(await repo.currentUser())) redirect("/login?next=/host");
  const neighborhood = String(form.get("neighborhood"));
  const address = String(form.get("address") ?? "").trim();
  const preset = String(form.get("preset")) as Preset;
  const hour = shekelsToAgorot(form.get("priceHour"));
  const day = shekelsToAgorot(form.get("priceDay"));
  if (!(neighborhood in NEIGHBORHOODS)) return { error: "בחרו שכונה מהרשימה." };
  if (address.length < 4) return { error: "כתבו כתובת מלאה. היא תוצג רק לנהג שהזמין." };
  if (!(preset in PRESET_LABEL)) return { error: "בחרו מתי החניה פנויה." };
  if (!(hour >= 100 && hour <= 10000)) return { error: "מחיר לשעה צריך להיות בין 1 ל-100 ₪." };
  if (!(day >= 1000 && day <= 50000)) return { error: "מחיר ליום צריך להיות בין 10 ל-500 ₪." };
  await repo.createSpot({
    neighborhood,
    address,
    accessInstructions: String(form.get("accessInstructions") ?? "").trim(),
    spotType: String(form.get("spotType")) as SpotType,
    access: String(form.get("access")) as Access,
    hasEv: form.get("hasEv") === "on",
    priceHourAgorot: hour,
    priceDayAgorot: day,
    description: String(form.get("description") ?? "").trim(),
    windows: presetWindows(preset, new Date()),
  });
  revalidatePath("/");
  revalidatePath("/host");
  return { ok: "החניה פורסמה ומופיעה במפה." };
}

export async function sendMagicLink(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const next = String(form.get("next") || "/");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "כתובת המייל לא תקינה." };
  const origin = (await headers()).get("origin") ?? "";
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}` },
  });
  if (error) return { error: "לא הצלחנו לשלוח מייל. נסו שוב בעוד דקה." };
  return { ok: `שלחנו קישור כניסה ל-${email}.` };
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}
