import { supabaseServer } from "../supabase/server";
import { freeWindows } from "../time";
import { publicPin } from "../neighborhoods";
import type { Booking, Spot, SpotWithAvailability, Window } from "../types";
import { ERROR_TEXT, RepoError, type Repo } from "./types";

interface SpotRow {
  id: string;
  owner_id: string;
  neighborhood: string;
  lat: number;
  lng: number;
  spot_type: Spot["spotType"];
  access: Spot["access"];
  has_ev: boolean;
  price_hour_agorot: number;
  price_day_agorot: number;
  description: string | null;
}

/** Parses a Postgres tstzrange such as ["2026-10-22 18:00:00+00","2026-10-23 04:00:00+00"). */
export function parseRange(r: string): Window {
  const [a, b] = r.slice(1, -1).split(",").map((x) => x.replace(/"/g, "").trim());
  return { start: new Date(a.replace(" ", "T")), end: new Date(b.replace(" ", "T")) };
}

export function toRange(w: Window): string {
  return `[${w.start.toISOString()},${w.end.toISOString()})`;
}

function toSpot(r: SpotRow): Spot {
  return {
    id: r.id, ownerId: r.owner_id, neighborhood: r.neighborhood, lat: r.lat, lng: r.lng,
    spotType: r.spot_type, access: r.access, hasEv: r.has_ev,
    priceHourAgorot: r.price_hour_agorot, priceDayAgorot: r.price_day_agorot, description: r.description,
  };
}

const SPOT_COLUMNS = "id, owner_id, neighborhood, lat, lng, spot_type, access, has_ev, price_hour_agorot, price_day_agorot, description";

async function attachFree(rows: SpotRow[]): Promise<SpotWithAvailability[]> {
  if (rows.length === 0) return [];
  const sb = await supabaseServer();
  const ids = rows.map((r) => r.id);
  const nowIso = new Date().toISOString();
  const [{ data: avail }, { data: busy }] = await Promise.all([
    sb.from("availability").select("spot_id, period").in("spot_id", ids).filter("period", "ov", `[${nowIso},infinity)`),
    sb.from("busy_periods").select("spot_id, period").in("spot_id", ids).filter("period", "ov", `[${nowIso},infinity)`),
  ]);
  const by = (list: { spot_id: string; period: string }[] | null, id: string) =>
    (list ?? []).filter((x) => x.spot_id === id).map((x) => parseRange(x.period));
  return rows.map((r) => ({ ...toSpot(r), free: freeWindows(by(avail, r.id), by(busy, r.id), new Date()) }));
}

export const supabaseRepo: Repo = {
  mode: "supabase",
  async currentUser() {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  },
  async listSpots() {
    const sb = await supabaseServer();
    const { data, error } = await sb.from("spots").select(SPOT_COLUMNS).eq("active", true);
    if (error) throw error;
    return (await attachFree(data as SpotRow[])).filter((s) => s.free.length > 0);
  },
  async getSpot(id) {
    const sb = await supabaseServer();
    const { data } = await sb.from("spots").select(SPOT_COLUMNS).eq("id", id).maybeSingle();
    return data ? (await attachFree([data as SpotRow]))[0] : null;
  },
  async mySpots() {
    const user = await this.currentUser();
    if (!user) return [];
    const sb = await supabaseServer();
    const { data } = await sb.from("spots").select(SPOT_COLUMNS).eq("owner_id", user.id);
    return attachFree((data ?? []) as SpotRow[]);
  },
  async createSpot(input) {
    const sb = await supabaseServer();
    const [lat, lng] = publicPin(input.neighborhood);
    const { data, error } = await sb
      .from("spots")
      .insert({
        neighborhood: input.neighborhood, lat, lng, spot_type: input.spotType, access: input.access,
        has_ev: input.hasEv, price_hour_agorot: input.priceHourAgorot, price_day_agorot: input.priceDayAgorot,
        description: input.description || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = data.id as string;
    const secret = await sb.from("spot_secrets").insert({ spot_id: id, address: input.address, access_instructions: input.accessInstructions || null });
    if (secret.error) throw secret.error;
    const avail = await sb.from("availability").insert(input.windows.map((w) => ({ spot_id: id, period: toRange(w) })));
    if (avail.error) throw avail.error;
    return id;
  },
  async book(spotId, start, end, plate) {
    const sb = await supabaseServer();
    const { data, error } = await sb.rpc("book_spot", { p_spot: spotId, p_start: start.toISOString(), p_end: end.toISOString(), p_plate: plate });
    if (error) {
      const code = Object.keys(ERROR_TEXT).find((k) => error.message.includes(k));
      throw new RepoError(code ?? error.message);
    }
    return (data as { id: string }).id;
  },
  async myBookings() {
    const user = await this.currentUser();
    if (!user) return [];
    const sb = await supabaseServer();
    const { data, error } = await sb
      .from("bookings")
      .select("id, spot_id, period, plate, price_agorot, fee_agorot, status, spots(neighborhood, access, spot_secrets(address, access_instructions))")
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    type Row = {
      id: string; spot_id: string; period: string; plate: string; price_agorot: number; fee_agorot: number;
      status: Booking["status"];
      spots: { neighborhood: string; access: Booking["access"]; spot_secrets: { address: string; access_instructions: string | null } | null } | null;
    };
    return (data as unknown as Row[]).map((r) => {
      const w = parseRange(r.period);
      const secret = r.status === "confirmed" ? r.spots?.spot_secrets : null;
      return {
        id: r.id, spotId: r.spot_id, start: w.start, end: w.end, plate: r.plate,
        priceAgorot: r.price_agorot, feeAgorot: r.fee_agorot, status: r.status,
        neighborhood: r.spots?.neighborhood ?? "", access: r.spots?.access ?? "open",
        address: secret?.address ?? null, accessInstructions: secret?.access_instructions ?? null,
      };
    });
  },
  async cancelBooking(id) {
    const sb = await supabaseServer();
    const { error } = await sb.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) throw error;
  },
};
