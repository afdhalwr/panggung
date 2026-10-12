/**
 * Agregasi statistik dashboard admin. Fungsi murni: server membaca order lunas dan event,
 * lalu semua hitungan (KPI, penjualan harian, okupansi) terjadi di sini dan bisa dites tanpa Firestore.
 */
import type { Event, OrderDoc } from "./schemas";

const DAY_MS = 86_400_000;
const WIB_MS = 7 * 3_600_000;

/** Tanggal WIB (YYYY-MM-DD) dari epoch ms. */
export function wibDay(ms: number): string {
  return new Date(ms + WIB_MS).toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export type StatsFilter = { eventId?: string; from?: string; to?: string };
export type PaidOrder = Pick<OrderDoc, "eventId" | "items" | "total" | "paidAt">;

export type DailyPoint = { day: string; tickets: number; revenue: number };
export type EventOccupancy = {
  id: string;
  title: string;
  date: string;
  status: Event["status"];
  /** Terjual sepanjang waktu: penjualan awal (seed) + penjualan lewat Panggung. */
  sold: number;
  quota: number;
  /** Pendapatan pada rentang tanggal terpilih. */
  revenue: number;
};

export type DashboardStats = {
  range: { from: string; to: string };
  kpi: { tickets: number; revenue: number; orders: number; occupancy: number };
  daily: DailyPoint[];
  events: EventOccupancy[];
};

export const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;

/** Rentang bawaan 30 hari terakhir; rentang terbalik ditukar, rentang terlalu panjang dipotong. */
export function resolveRange(f: StatsFilter, now: number): { from: string; to: string } {
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) ? d : undefined);
  let to = valid(f.to) ?? wibDay(now);
  let from = valid(f.from) ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  if (from > to) [from, to] = [to, from];
  if (Date.parse(to) - Date.parse(from) > MAX_RANGE_DAYS * DAY_MS) from = addDays(to, -MAX_RANGE_DAYS);
  return { from, to };
}

const ticketCount = (o: Pick<OrderDoc, "items">) => o.items.reduce((n, i) => n + i.qty, 0);

export function buildStats(events: Event[], orders: PaidOrder[], f: StatsFilter, now: number): DashboardStats {
  const range = resolveRange(f, now);
  const scope = events.filter((e) => e.status !== "draft" && (!f.eventId || e.id === f.eventId));
  const inScope = new Set(scope.map((e) => e.id));

  const daily = new Map<string, DailyPoint>();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) daily.set(d, { day: d, tickets: 0, revenue: 0 });

  const kpi = { tickets: 0, revenue: 0, orders: 0, occupancy: 0 };
  const appSold = new Map<string, number>();
  const revenueByEvent = new Map<string, number>();

  for (const o of orders) {
    if (!inScope.has(o.eventId)) continue;
    const qty = ticketCount(o);
    appSold.set(o.eventId, (appSold.get(o.eventId) ?? 0) + qty);
    const point = o.paidAt !== undefined ? daily.get(wibDay(o.paidAt)) : undefined;
    if (!point) continue;
    point.tickets += qty;
    point.revenue += o.total;
    kpi.tickets += qty;
    kpi.revenue += o.total;
    kpi.orders++;
    revenueByEvent.set(o.eventId, (revenueByEvent.get(o.eventId) ?? 0) + o.total);
  }

  const rows: EventOccupancy[] = scope
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      status: e.status,
      sold: e.categories.reduce((n, c) => n + c.sold, 0) + (appSold.get(e.id) ?? 0),
      quota: e.categories.reduce((n, c) => n + c.quota, 0),
      revenue: revenueByEvent.get(e.id) ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sold = rows.reduce((n, r) => n + r.sold, 0);
  const quota = rows.reduce((n, r) => n + r.quota, 0);
  kpi.occupancy = quota ? Math.min(1, sold / quota) : 0;

  return { range, kpi, daily: [...daily.values()], events: rows };
}
