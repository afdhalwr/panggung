/**
 * Fungsi murni untuk katalog. Daftar event sendiri dibaca dari Firestore di `src/server/catalog.ts`;
 * venue dan denah kursi tetap dari data seed karena tidak diubah admin.
 */
import venuesJson from "@/data/seed/venues.json";
import type { Event, Venue } from "./schemas";
import type { EventFilter, Sort } from "./filters";

export { CITIES, SORTS, filterToQuery, parseFilter, type EventFilter, type Sort } from "./filters";

const venues = venuesJson as Venue[];

export function getVenues(): Venue[] {
  return venues;
}

export function getVenue(id: string): Venue | undefined {
  return venues.find((v) => v.id === id);
}

export function seatCategoryCounts(venue: Venue): Record<string, { total: number; sold: number }> {
  const counts: Record<string, { total: number; sold: number }> = {};
  for (const s of venue.seats ?? []) {
    const c = (counts[s.categoryId] ??= { total: 0, sold: 0 });
    c.total++;
    if (s.seedSold) c.sold++;
  }
  return counts;
}

/** Kuota kategori berkursi selalu diturunkan dari denah, supaya tidak ada dua sumber kebenaran. */
export function withVenueQuota(e: Event): Event {
  const venue = getVenue(e.venueId);
  if (venue?.type !== "seated") return e;
  const counts = seatCategoryCounts(venue);
  return {
    ...e,
    categories: e.categories.map((c) =>
      c.type === "seated" ? { ...c, quota: counts[c.id]?.total ?? 0, sold: counts[c.id]?.sold ?? 0 } : c,
    ),
  };
}

/** Event yang tampil di beranda, daftar, dan sitemap. */
export function isListed(e: Pick<Event, "status">): boolean {
  return e.status === "published";
}

/** Event yang halaman detailnya bisa dibuka pengguna (yang selesai tetap bisa, misalnya dari tiket). */
export function isVisible(e: Pick<Event, "status">): boolean {
  return e.status !== "draft";
}

export function minPrice(e: Event): number {
  return Math.min(...e.categories.map((c) => c.price));
}

// Tanggal event dalam WIB (UTC+7), format YYYY-MM-DD, untuk dibandingkan dengan filter.
function wibDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function filterEvents(list: Event[], f: EventFilter): Event[] {
  const q = f.q?.trim().toLowerCase();
  const result = list.filter((e) => {
    if (q) {
      const hay = [e.title, e.artist, e.city, getVenue(e.venueId)?.name ?? "", ...e.lineup].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.city && e.city !== f.city) return false;
    if (f.genre && e.genre !== f.genre) return false;
    const day = wibDay(e.date);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    const price = minPrice(e);
    if (f.min !== undefined && price < f.min) return false;
    if (f.max !== undefined && price > f.max) return false;
    return true;
  });
  const sort = f.sort ?? "date";
  const cmp: Record<Sort, (a: Event, b: Event) => number> = {
    date: (a, b) => a.date.localeCompare(b.date),
    popular: (a, b) => b.popularity - a.popularity,
    "price-asc": (a, b) => minPrice(a) - minPrice(b),
    "price-desc": (a, b) => minPrice(b) - minPrice(a),
  };
  return [...result].sort(cmp[sort]);
}
