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
  windows: Window[];
}

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
