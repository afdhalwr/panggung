/**
 * Aturan bisnis murni. Dipakai server (dalam transaction) dan klien (tampilan),
 * sehingga keduanya selalu sepakat kapan kursi dianggap tersedia.
 */
import type { Event, InventoryDoc, OrderDoc, OrderStatus, SeatDoc, SeatStatus, TicketCategory } from "./schemas";

export { MAX_PER_ORDER } from "./schemas";

export const HOLD_MS = 10 * 60 * 1000;
export const CRITICAL_MS = 2 * 60 * 1000;

function holdActive(doc: SeatDoc, now: number) {
  return doc.status === "held" && doc.holdExpiresAt > now;
}

export function isSeatAvailable(doc: SeatDoc | undefined, seedSold: boolean, now: number, uid?: string): boolean {
  if (seedSold) return false;
  if (!doc) return true;
  if (doc.status === "sold" || doc.status === "blocked") return false;
  if (!holdActive(doc, now)) return true;
  return uid !== undefined && doc.uid === uid;
}

export function effectiveSeatStatus(doc: SeatDoc | undefined, seedSold: boolean, now: number): SeatStatus {
  if (seedSold || doc?.status === "sold") return "sold";
  if (doc?.status === "blocked") return "blocked";
  if (doc && holdActive(doc, now)) return "held";
  return "available";
}

/** Kursi hanya bisa diblokir bila tidak terjual dan tidak sedang ditahan pembeli. */
export function canBlockSeat(doc: SeatDoc | undefined, seedSold: boolean, now: number): boolean {
  return effectiveSeatStatus(doc, seedSold, now) === "available";
}

export function computeTotal(event: Pick<Event, "categories">, items: { categoryId: string; qty: number }[]): number {
  return items.reduce((sum, item) => {
    const cat = event.categories.find((c) => c.id === item.categoryId);
    if (!cat) throw new Error(`Kategori tidak dikenal: ${item.categoryId}`);
    return sum + cat.price * item.qty;
  }, 0);
}

export function pruneExpiredHolds(holds: InventoryDoc["holds"], now: number): InventoryDoc["holds"] {
  return Object.fromEntries(Object.entries(holds).filter(([, h]) => h.expiresAt > now));
}

function activeHeld(inv: InventoryDoc | undefined, now: number): number {
  return inv ? Object.values(pruneExpiredHolds(inv.holds, now)).reduce((n, h) => n + h.qty, 0) : 0;
}

export function festivalRemaining(cat: TicketCategory, inv: InventoryDoc | undefined, now: number): number {
  return Math.max(0, cat.quota - cat.sold - (inv?.sold ?? 0) - activeHeld(inv, now));
}

/** Kuota festival terkecil yang boleh diatur admin: tiket terjual (seed + aplikasi) ditambah hold aktif. */
export function minFestivalQuota(cat: Pick<TicketCategory, "sold">, inv: InventoryDoc | undefined, now: number): number {
  return cat.sold + (inv?.sold ?? 0) + activeHeld(inv, now);
}

export function remainingMs(holdExpiresAt: number, now: number): number {
  return Math.max(0, holdExpiresAt - now);
}

/** Order lunas bisa direfund selama konsernya belum lewat. */
export function canRefund(order: Pick<OrderDoc, "status">, eventDate: string, now: number): boolean {
  return order.status === "paid" && new Date(eventDate).getTime() > now;
}

export function effectiveOrderStatus(order: Pick<OrderDoc, "status" | "holdExpiresAt">, now: number): OrderStatus {
  if (order.status === "pending" && order.holdExpiresAt <= now) return "expired";
  return order.status;
}

export type Availability = "Tersedia" | "Hampir habis" | "Habis";

export function availabilityLabel(cat: Pick<TicketCategory, "quota" | "sold">): Availability {
  const left = cat.quota - cat.sold;
  if (left <= 0) return "Habis";
  if (left <= cat.quota * 0.1) return "Hampir habis";
  return "Tersedia";
}
