import eventsJson from "@/data/seed/events.json";
import venuesJson from "@/data/seed/venues.json";
import { genreSchema, type Event, type Genre, type Venue } from "./schemas";

const venues = venuesJson as Venue[];

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

// Kuota kategori berkursi selalu diturunkan dari denah, supaya tidak ada dua sumber kebenaran.
const events: Event[] = (eventsJson as Event[]).map((e) => {
  const venue = getVenue(e.venueId);
  if (venue?.type !== "seated") return e;
  const counts = seatCategoryCounts(venue);
  return {
    ...e,
    categories: e.categories.map((c) =>
      c.type === "seated" ? { ...c, quota: counts[c.id]?.total ?? 0, sold: counts[c.id]?.sold ?? 0 } : c,
    ),
  };
});

export function getEvents(): Event[] {
  return events;
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}

export function getEventById(id: string): Event | undefined {
  return events.find((e) => e.id === id);
}

export const CITIES = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan", "Makassar"] as const;

export const SORTS = {
  date: "Tanggal terdekat",
  popular: "Terpopuler",
  "price-asc": "Harga terendah",
  "price-desc": "Harga tertinggi",
} as const;
export type Sort = keyof typeof SORTS;

export type EventFilter = {
  q?: string;
  city?: string;
  genre?: Genre;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  min?: number;
  max?: number;
  sort?: Sort;
};

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

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

export function parseFilter(sp: SearchParamsLike): EventFilter {
  const get = (k: string): string | undefined => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
  };
  const num = (k: string) => {
    const v = get(k);
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const date = (k: string) => {
    const v = get(k);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
  };
  const f: EventFilter = {};
  const q = get("q");
  if (q) f.q = q.slice(0, 80);
  const city = get("city");
  if (city) f.city = city;
  const genre = genreSchema.safeParse(get("genre"));
  if (genre.success) f.genre = genre.data;
  const from = date("from");
  if (from) f.from = from;
  const to = date("to");
  if (to) f.to = to;
  const min = num("min");
  if (min !== undefined) f.min = min;
  const max = num("max");
  if (max !== undefined) f.max = max;
  const sort = get("sort");
  if (sort && sort in SORTS) f.sort = sort as Sort;
  return f;
}

export function filterToQuery(f: EventFilter): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
