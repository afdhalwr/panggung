/* Tipe dan helper filter tanpa data seed, aman dipakai di komponen klien. */
import { genreSchema, type Genre } from "./schemas";

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
