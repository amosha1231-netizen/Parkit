import type { Booking, NewSpotInput, SpotWithAvailability } from "../types";

export type BookingErrorCode =
  | "not_authenticated"
  | "invalid_period"
  | "spot_not_found"
  | "own_spot"
  | "not_available"
  | "already_booked";

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
};

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
}
