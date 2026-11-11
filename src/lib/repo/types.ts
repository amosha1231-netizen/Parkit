import type { Preset } from "../time";
import type { Booking, HostBooking, NewSpotInput, SpotWithAvailability } from "../types";

export type BookingErrorCode =
  | "not_authenticated"
  | "invalid_period"
  | "spot_not_found"
  | "own_spot"
  | "not_available"
  | "already_booked"
  | "too_late_to_cancel"
  | "booking_not_found"
  | "not_owner";

export class RepoError extends Error {
  constructor(public code: BookingErrorCode | string) {
    super(code);
  }
}

export const ERROR_TEXT: Record<BookingErrorCode, string> = {
  not_authenticated: "צריך להתחבר כדי להזמין.",
  invalid_period: "שעת הסיום חייבת להיות אחרי שעת ההתחלה, ולא בעבר.",
  spot_not_found: "החניה כבר לא מפורסמת.",
  own_spot: "אי אפשר להזמין חניה שלך.",
  not_available: "החניה לא פנויה בכל הטווח שבחרת. בחרו זמן בתוך אחד מחלונות הזמינות.",
  already_booked: "מישהו הזמין את החניה בזמן הזה ממש עכשיו. נסו טווח אחר.",
  too_late_to_cancel: "אפשר לבטל רק עד שעה לפני תחילת ההזמנה.",
  booking_not_found: "ההזמנה לא נמצאה או שכבר בוטלה.",
  not_owner: "רק בעל החניה יכול לשנות אותה.",
};

/** Drivers can cancel up to this long before the booking starts. Keep in sync with cancel_booking() in SQL. */
export const CANCEL_CUTOFF_MS = 3600000;

export interface User {
  id: string;
  email: string | null;
}

export interface Repo {
  mode: "demo" | "supabase";
  currentUser(): Promise<User | null>;
  listSpots(): Promise<SpotWithAvailability[]>;
  getSpot(id: string): Promise<SpotWithAvailability | null>;
  mySpots(): Promise<SpotWithAvailability[]>;
  createSpot(input: NewSpotInput): Promise<string>;
  book(spotId: string, start: Date, end: Date, plate: string): Promise<string>;
  myBookings(): Promise<Booking[]>;
  cancelBooking(id: string): Promise<void>;
  /** Bookings drivers made on the current user's spots, newest first. */
  hostBookings(): Promise<HostBooking[]>;
  setSpotActive(id: string, active: boolean): Promise<void>;
  /** Adds two more weeks of the given pattern after the spot's last availability window. */
  extendAvailability(id: string, preset: Preset): Promise<void>;
}
