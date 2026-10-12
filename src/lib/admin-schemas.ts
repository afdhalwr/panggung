/**
 * Skema input admin. Satu skema dipakai form di klien dan Route Handler di server.
 * Tanggal di form berupa waktu lokal WIB ("2026-11-14T19:00"); setelah divalidasi menjadi ISO UTC.
 */
import { z } from "zod";
import { EVENT_STATUSES, POSTER_PATTERNS, genreSchema } from "./schemas";

export const PHOTOS = ["/photos/crowd-1.webp", "/photos/crowd-2.webp", "/photos/crowd-3.webp", "/photos/crowd-4.webp", "/photos/stage-1.webp", "/photos/stage-2.webp"] as const;

const WIB_OFFSET = "+07:00";

/** ISO UTC → "YYYY-MM-DDTHH:mm" dalam WIB, untuk nilai awal `<input type="datetime-local">`. */
export function toWibLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 16);
}

const wibDateTime = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `${label} belum diisi lengkap.`)
    .transform((v) => new Date(`${v}:00${WIB_OFFSET}`).toISOString());

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus kode hex, contoh #FF3D8B.");

export const eventInfoSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 huruf.").max(80, "Judul maksimal 80 huruf."),
    artist: z.string().trim().min(2, "Nama artis minimal 2 huruf.").max(60, "Nama artis maksimal 60 huruf."),
    genre: genreSchema,
    venueId: z.string().min(1, "Pilih venue."),
    date: wibDateTime("Tanggal konser"),
    salesOpenAt: wibDateTime("Waktu buka penjualan"),
    description: z.string().trim().min(20, "Deskripsi minimal 20 huruf.").max(800, "Deskripsi maksimal 800 huruf."),
    /** Satu nama per baris. */
    lineup: z
      .string()
      .transform((v) => v.split("\n").map((s) => s.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(60, "Nama di lineup maksimal 60 huruf.")).min(1, "Isi minimal satu nama lineup.").max(10, "Lineup maksimal 10 nama.")),
    palette: z.tuple([hex, hex]),
    pattern: z.enum(POSTER_PATTERNS),
    photo: z.enum(PHOTOS),
    featured: z.boolean(),
    highDemand: z.boolean(),
    status: z.enum(EVENT_STATUSES),
  })
  .refine((v) => v.salesOpenAt <= v.date, { message: "Penjualan harus dibuka sebelum konser dimulai.", path: ["salesOpenAt"] });
export type EventInfoInput = z.input<typeof eventInfoSchema>;
export type EventInfo = z.output<typeof eventInfoSchema>;

export const categoryInputSchema = z.object({
  /** Kosong untuk kategori baru; server membuat id dari nama. */
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nama kategori minimal 2 huruf.").max(40, "Nama kategori maksimal 40 huruf."),
  price: z.coerce.number({ invalid_type_error: "Harga harus angka." }).int("Harga harus bilangan bulat.").min(10_000, "Harga minimal Rp10.000.").max(50_000_000, "Harga maksimal Rp50.000.000."),
  /** Diabaikan untuk kategori berkursi: kuotanya mengikuti denah. */
  quota: z.coerce.number({ invalid_type_error: "Kuota harus angka." }).int("Kuota harus bilangan bulat.").min(1, "Kuota minimal 1.").max(100_000, "Kuota maksimal 100.000."),
  perks: z.string().trim().max(120, "Keterangan maksimal 120 huruf.").optional(),
});
export const categoriesSchema = z.object({
  categories: z.array(categoryInputSchema).min(1, "Minimal satu kategori.").max(8, "Maksimal 8 kategori."),
});
export type CategoriesInput = z.input<typeof categoriesSchema>;

export const eventStatusSchema = z.object({ status: z.enum(EVENT_STATUSES) });

export const seatBlockSchema = z.object({
  seatIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu kursi.").max(300),
  blocked: z.boolean(),
});

export const validateTicketSchema = z.object({
  code: z.string().trim().min(6, "Kode tiket terlalu pendek.").max(120, "Kode tiket terlalu panjang."),
});

export const userStatusSchema = z.object({ disabled: z.boolean() });

/** "Gold Tribun 2" → "gold-tribun-2"; dipakai untuk slug event dan id kategori. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Tambah akhiran -2, -3, ... sampai tidak bentrok dengan yang sudah ada. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "event";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export type CategoryRow = {
  id: string;
  name: string;
  price: number;
  quota: number;
  perks?: string;
  type: "seated" | "festival";
  /** Terjual (seed + aplikasi) ditambah hold aktif: batas bawah kuota dan penentu boleh dihapus. */
  minQuota: number;
};

export type TicketCheck = {
  result: "valid" | "used" | "refunded" | "unknown";
  ticket?: { id: string; eventTitle: string; categoryName: string; seatLabel?: string; buyerName?: string; usedAt?: number };
};

export type AdminUser = {
  uid: string;
  email: string;
  name: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: number;
  lastSignInAt?: number;
  paidOrders: number;
  isDemo: boolean;
};
