import { z } from "zod";

/* ---------- Katalog (data seed, tidak berubah saat runtime) ---------- */

export const genreSchema = z.enum(["pop", "rock", "jazz", "edm", "indie"]);
export type Genre = z.infer<typeof genreSchema>;

export const GENRE_LABEL: Record<Genre, string> = {
  pop: "Pop",
  rock: "Rock",
  jazz: "Jazz",
  edm: "EDM",
  indie: "Indie",
};

export type TicketCategory = {
  id: string;
  name: string;
  price: number; // rupiah
  type: "seated" | "festival";
  quota: number;
  sold: number; // terjual sebelum aplikasi berjalan (data seed)
  perks?: string;
};

export type PosterPattern = "rings" | "grid" | "waves" | "bars" | "sun";

export type Event = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: Genre;
  city: string;
  venueId: string;
  date: string; // ISO
  salesOpenAt: string; // ISO
  description: string;
  lineup: string[];
  palette: [string, string];
  pattern: PosterPattern;
  photo: string; // path di /public/photos
  featured?: boolean;
  /** Konser "panas": halaman pilih tiket memakai ruang tunggu antrean (F9). */
  highDemand?: boolean;
  popularity: number;
  categories: TicketCategory[];
};

export type SeatDef = {
  id: string; // contoh "VIP-A12"
  section: string;
  row: string;
  number: number;
  categoryId: string;
  x: number;
  y: number;
  seedSold?: boolean;
};

export type Venue = {
  id: string;
  name: string;
  city: string;
  address: string;
  type: "seated" | "festival";
  capacity: number;
  width?: number;
  height?: number;
  seats?: SeatDef[];
};

/* ---------- Dokumen Firestore (waktu disimpan dalam epoch ms) ---------- */

export type SeatStatus = "available" | "held" | "sold";

export type SeatDoc = {
  eventId: string;
  seatId: string;
  status: "held" | "sold";
  uid: string;
  orderId: string;
  holdExpiresAt: number;
};

export type InventoryDoc = {
  eventId: string;
  categoryId: string;
  sold: number;
  holds: Record<string, { qty: number; uid: string; expiresAt: number }>;
};

export const ORDER_STATUSES = ["pending", "paid", "failed", "expired", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = { categoryId: string; seatId?: string; qty: number };

export type OrderDoc = {
  id: string;
  uid: string;
  eventId: string;
  items: OrderItem[];
  buyer?: Buyer;
  method?: PaymentMethod;
  status: OrderStatus;
  total: number;
  holdExpiresAt: number;
  createdAt: number;
  paidAt?: number;
};

export type TicketDoc = {
  id: string;
  orderId: string;
  uid: string;
  eventId: string;
  categoryId: string;
  seatLabel?: string;
  qrPayload: string;
  createdAt: number;
};

/* ---------- Input (dipakai form di klien dan Route Handler di server) ---------- */

export const MAX_PER_ORDER = 4;

export const buyerSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(80, "Nama terlalu panjang."),
  email: z.string().trim().email("Format email belum benar."),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{8,11}$/, "Nomor HP minimal 10 digit, diawali 08 atau +62.")),
});
export type Buyer = z.infer<typeof buyerSchema>;
export type BuyerInput = z.input<typeof buyerSchema>;

export const paymentMethodSchema = z.enum(["va", "ewallet", "card"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  va: "Virtual Account",
  ewallet: "E-wallet",
  card: "Kartu kredit/debit",
};

export const orderItemSchema = z.object({
  categoryId: z.string().min(1),
  seatId: z.string().min(1).optional(),
  qty: z
    .number()
    .int()
    .min(1, "Minimal 1 tiket.")
    .max(MAX_PER_ORDER, `Maksimal ${MAX_PER_ORDER} tiket per pesanan.`),
});

export const createOrderSchema = z
  .object({
    eventId: z.string().min(1),
    items: z.array(orderItemSchema).min(1, "Pilih minimal 1 tiket.").max(MAX_PER_ORDER, `Maksimal ${MAX_PER_ORDER} tiket per pesanan.`),
  })
  .refine((o) => o.items.reduce((n, i) => n + i.qty, 0) <= MAX_PER_ORDER, {
    message: `Maksimal ${MAX_PER_ORDER} tiket per pesanan.`,
    path: ["items"],
  })
  .refine((o) => o.items.every((i) => !i.seatId || i.qty === 1), {
    message: "Satu kursi hanya untuk satu tiket.",
    path: ["items"],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const payOrderSchema = z.object({
  buyer: buyerSchema,
  method: paymentMethodSchema,
});
export type PayOrderInput = z.infer<typeof payOrderSchema>;

export type CreateOrderResult = {
  orderId: string;
  holdExpiresAt: number;
  serverNow: number;
  total: number;
};

export type PayOrderResult = { ticketIds: string[] };

export type ApiError = { error: string; takenSeatIds?: string[] };

/** Ringkasan event yang dikirim bersama tiket/order, supaya klien tidak perlu memuat data seed. */
export type EventSummary = Pick<Event, "id" | "slug" | "title" | "artist" | "date" | "city" | "palette" | "pattern" | "genre"> & { venue: string };

export type TicketView = TicketDoc & {
  event: EventSummary;
  categoryName: string;
  order: Pick<OrderDoc, "buyer" | "paidAt" | "total" | "method">;
};

export type OrderView = OrderDoc & { event: EventSummary };

export type TicketsResponse = { tickets: TicketView[]; orders: OrderView[] };
