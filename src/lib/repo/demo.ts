// In-memory store used when Supabase is not configured, so the app runs with no setup.
// Data resets when the server restarts.
import { quote } from "../pricing";
import { covers, freeWindows, presetWindows, type Preset } from "../time";
import { NEIGHBORHOODS, publicPin } from "../neighborhoods";
import type { Booking, NewSpotInput, Spot, SpotWithAvailability, Window } from "../types";
import { RepoError, type Repo } from "./types";

const DEMO_USER = { id: "demo-driver", email: "demo@parkit.local" };

interface StoredBooking {
  id: string;
  spotId: string;
  driverId: string;
  start: Date;
  end: Date;
  plate: string;
  priceAgorot: number;
  feeAgorot: number;
  status: "confirmed" | "cancelled";
}

interface Store {
  spots: Spot[];
  secrets: Map<string, { address: string; accessInstructions: string }>;
  availability: Map<string, Window[]>;
  bookings: StoredBooking[];
}

function seed(): Store {
  const now = new Date();
  const rows: [string, string, Spot["spotType"], Spot["access"], boolean, number, number, Preset, string | null][] = [
    ["הצפון הישן", "ארלוזורוב 112", "covered", "app", false, 1000, 6000, "weekdays", "חניה רחבה, מתאימה גם לרכב משפחתי."],
    ["לב העיר", "רוטשילד 45", "underground", "app", true, 1400, 7500, "always", "אני בחו״ל, החניה פנויה כל הזמן."],
    ["פלורנטין", "ויטל 8", "open", "code", false, 800, 4500, "nights", null],
    ["יפו", "שדרות ירושלים 3", "open", "open", false, 1200, 5500, "weekend", "חמש דקות הליכה מבלומפילד."],
    ["בבלי", "בבלי 14", "covered", "app", true, 1100, 6500, "nights", "קרוב לפארק הירקון, טוב להופעות."],
    ["רמת אביב", "איינשטיין 30", "underground", "app", false, 700, 4000, "weekdays", null],
    ["מונטיפיורי (ליד איכילוב)", "ויצמן 20", "covered", "code", false, 1300, 7000, "weekdays", "שלוש דקות מאיכילוב."],
    ["נווה צדק", "שבזי 50", "open", "open", false, 1500, 8000, "weekend", null],
  ];
  const store: Store = { spots: [], secrets: new Map(), availability: new Map(), bookings: [] };
  rows.forEach(([hood, address, spotType, access, hasEv, hour, day, preset, description], i) => {
    const id = `demo-${i + 1}`;
    const [lat, lng] = NEIGHBORHOODS[hood];
    store.spots.push({ id, ownerId: `host-${i + 1}`, neighborhood: hood, lat, lng, spotType, access, hasEv, priceHourAgorot: hour, priceDayAgorot: day, description });
    store.secrets.set(id, { address: `${address}, תל אביב`, accessInstructions: access === "code" ? "קוד לשער: 4821#. חניה מספר 7." : "" });
    store.availability.set(id, presetWindows(preset, now));
  });
  return store;
}

const g = globalThis as unknown as { __parkitDemo?: Store };
const store = (g.__parkitDemo ??= seed());

function withFree(s: Spot): SpotWithAvailability {
  const busy = store.bookings.filter((b) => b.spotId === s.id && b.status === "confirmed");
  return { ...s, free: freeWindows(store.availability.get(s.id) ?? [], busy, new Date()) };
}

export const demoRepo: Repo = {
  mode: "demo",
  async currentUser() {
    return DEMO_USER;
  },
  async listSpots() {
    return store.spots.map(withFree).filter((s) => s.free.length > 0);
  },
  async getSpot(id) {
    const s = store.spots.find((x) => x.id === id);
    return s ? withFree(s) : null;
  },
  async mySpots() {
    return store.spots.filter((s) => s.ownerId === DEMO_USER.id).map(withFree);
  },
  async createSpot(input: NewSpotInput) {
    const id = `spot-${Date.now()}`;
    const [lat, lng] = publicPin(input.neighborhood);
    store.spots.push({
      id, ownerId: DEMO_USER.id, neighborhood: input.neighborhood, lat, lng,
      spotType: input.spotType, access: input.access, hasEv: input.hasEv,
      priceHourAgorot: input.priceHourAgorot, priceDayAgorot: input.priceDayAgorot,
      description: input.description || null,
    });
    store.secrets.set(id, { address: input.address, accessInstructions: input.accessInstructions });
    store.availability.set(id, input.windows);
    return id;
  },
  async book(spotId, start, end, plate) {
    if (end <= start || start.getTime() < Date.now() - 15 * 60000) throw new RepoError("invalid_period");
    const s = store.spots.find((x) => x.id === spotId);
    if (!s) throw new RepoError("spot_not_found");
    if (s.ownerId === DEMO_USER.id) throw new RepoError("own_spot");
    if (!covers(store.availability.get(spotId) ?? [], start, end)) throw new RepoError("not_available");
    const clash = store.bookings.some((b) => b.spotId === spotId && b.status === "confirmed" && b.start < end && b.end > start);
    if (clash) throw new RepoError("already_booked");
    const q = quote(s.priceHourAgorot, s.priceDayAgorot, start, end);
    const id = `b-${Date.now()}`;
    store.bookings.push({ id, spotId, driverId: DEMO_USER.id, start, end, plate, priceAgorot: q.price, feeAgorot: q.fee, status: "confirmed" });
    return id;
  },
  async myBookings() {
    return store.bookings
      .filter((b) => b.driverId === DEMO_USER.id)
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .map((b): Booking => {
        const s = store.spots.find((x) => x.id === b.spotId)!;
        const secret = store.secrets.get(b.spotId);
        const visible = b.status === "confirmed" && b.end.getTime() > Date.now() - 3600000;
        return {
          id: b.id, spotId: b.spotId, start: b.start, end: b.end, plate: b.plate,
          priceAgorot: b.priceAgorot, feeAgorot: b.feeAgorot, status: b.status,
          neighborhood: s.neighborhood, access: s.access,
          address: visible ? secret?.address ?? null : null,
          accessInstructions: visible ? secret?.accessInstructions || null : null,
        };
      });
  },
  async cancelBooking(id) {
    const b = store.bookings.find((x) => x.id === id && x.driverId === DEMO_USER.id);
    if (b) b.status = "cancelled";
  },
};
