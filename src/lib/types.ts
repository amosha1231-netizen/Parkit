export type SpotType = "covered" | "open" | "underground";
export type Access = "app" | "code" | "open";

export interface Spot {
  id: string;
  ownerId: string;
  neighborhood: string;
  lat: number;
  lng: number;
  spotType: SpotType;
  access: Access;
  hasEv: boolean;
  priceHourAgorot: number;
  priceDayAgorot: number;
  description: string | null;
  /** Paused spots are hidden from the map but kept for the host. */
  active: boolean;
  /** The weekly pattern the host picked, used to extend availability. Null for older spots. */
  schedule: string | null;
}

export interface Window {
  start: Date;
  end: Date;
}

export interface SpotWithAvailability extends Spot {
  /** Free periods from now on: availability minus confirmed bookings. */
  free: Window[];
}

export interface Booking {
  id: string;
  spotId: string;
  start: Date;
  end: Date;
  plate: string;
  priceAgorot: number;
  feeAgorot: number;
  status: "confirmed" | "cancelled";
  neighborhood: string;
  access: Access;
  /** Present only while the viewer is allowed to see it. */
  address: string | null;
  accessInstructions: string | null;
}

/** A booking on one of the viewer's own spots. */
export interface HostBooking {
  id: string;
  spotId: string;
  neighborhood: string;
  start: Date;
  end: Date;
  plate: string;
  /** What the host earns. The service fee is paid by the driver on top. */
  priceAgorot: number;
  status: "confirmed" | "cancelled";
}

export interface NewSpotInput {
  neighborhood: string;
  address: string;
  accessInstructions: string;
  spotType: SpotType;
  access: Access;
  hasEv: boolean;
  priceHourAgorot: number;
  priceDayAgorot: number;
  description: string;
  schedule: string;
  windows: Window[];
}

export const isSpotType = (v: unknown): v is SpotType => typeof v === "string" && v in SPOT_TYPE_LABEL;
export const isAccess = (v: unknown): v is Access => typeof v === "string" && v in ACCESS_LABEL;

export const SPOT_TYPE_LABEL: Record<SpotType, string> = {
  covered: "מקורה בבניין",
  open: "פתוחה בחצר",
  underground: "חניון תת-קרקעי",
};

export const ACCESS_LABEL: Record<Access, string> = {
  app: "שער חכם, נפתח מהטלפון",
  code: "קוד לשער",
  open: "ללא שער",
};
