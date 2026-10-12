# Panggung MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web tiket konser (F1–F8) dengan seat map, hold kursi 10 menit, checkout 3 langkah, dan e-ticket ber-QR.

**Architecture:** Next.js App Router. Data katalog dari JSON seed (fungsi murni di `lib/catalog.ts`). Penulisan order/hold lewat Route Handler + Firebase Admin SDK dalam transaction; browser hanya membaca Firestore. Aturan bisnis dipisah di `lib/rules.ts` agar bisa diuji tanpa Firestore. Lokal dan E2E memakai Firebase Emulator.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind v4, shadcn/ui, Zustand, TanStack Query, React Hook Form, Zod, Firebase v11 + Admin, react-zoom-pan-pinch, qrcode.react, @react-pdf/renderer, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-panggung-design.md`

## Global Constraints

- Semua teks UI berbahasa Indonesia.
- TypeScript strict, 0 `any` di `src/`, ESLint 0 error.
- Klien tidak pernah menulis ke Firestore; rules menolak semua write.
- Hold kursi 10 menit; maks 4 kursi/tiket per order.
- Status kursi tidak hanya warna: ikon atau pola wajib.
- Responsif 360–1440 px tanpa scroll horizontal.
- Data konser fiktif; foto hanya dari Unsplash (lisensi Unsplash).
- Node di `C:\Program Files\nodejs` (prepend ke PATH di shell lama).

---

### Task 0: Design system dan layar utama di Figma

**Files:** tidak ada file kode. Hasil: file Figma "Panggung — Design System".

- [ ] Buat file Figma baru (`create_new_file`).
- [ ] Muat skill `figma:figma-use` dan `figma:figma-generate-library`, lalu buat variables warna (mode Gelap/Terang), gaya teks, dan komponen: EventCard, Seat (4 status), CountdownBadge, Stepper, OrderSummary, TicketCard.
- [ ] Buat layar HP 360 dan desktop 1440: Beranda, Detail Konser, Denah Kursi, Checkout, E-ticket.
- [ ] Ambil screenshot untuk `docs/design/` dan catat URL file Figma di README.

### Task 1: Scaffold proyek

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `.gitignore`, `.env.example`

- [ ] `npx create-next-app@15 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (folder sudah berisi `docs/`; jalankan di folder sementara lalu pindahkan bila perlu).
- [ ] Pasang dependensi runtime: `zustand @tanstack/react-query react-hook-form @hookform/resolvers zod firebase firebase-admin react-zoom-pan-pinch qrcode.react @react-pdf/renderer server-only lucide-react clsx tailwind-merge sonner`.
- [ ] Pasang dev: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test firebase-tools`.
- [ ] Token warna di `globals.css` (`@theme`) sesuai spec bagian 9, dark default + `.light`.
- [ ] Font Bricolage Grotesque + Plus Jakarta Sans via `next/font/google` di layout.
- [ ] Script: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e`, `emulators`.
- [ ] Verifikasi: `npm run lint && npm run typecheck && npm run build` lulus. Commit.

### Task 2: Skema Zod dan aturan bisnis (TDD)

**Files:**
- Create: `src/lib/schemas.ts`, `src/lib/rules.ts`, `src/lib/format.ts`
- Test: `src/lib/rules.test.ts`, `src/lib/schemas.test.ts`

**Interfaces — Produces:**
```ts
// schemas.ts
export const genreSchema = z.enum(['pop','rock','jazz','edm','indie']);
export type Genre; export type Event; export type TicketCategory; export type Venue; export type SeatDef;
export type SeatStatus = 'available' | 'held' | 'sold';
export const buyerSchema; export type Buyer;           // name, email, phone, nik?
export const paymentSchema; export type PaymentMethod;  // 'va' | 'ewallet' | 'card'
export const createOrderSchema; export type CreateOrderInput; // { eventId, items: { categoryId, seatId?, qty }[] }
export const payOrderSchema;                            // { buyer, method }
export type OrderDoc; export type TicketDoc; export type SeatDoc; export type InventoryDoc;
// rules.ts
export const HOLD_MS = 600_000; export const MAX_PER_ORDER = 4;
export function isSeatAvailable(doc: SeatDoc | undefined, seedSold: boolean, now: number, uid?: string): boolean;
export function effectiveSeatStatus(doc: SeatDoc | undefined, seedSold: boolean, now: number): SeatStatus;
export function computeTotal(event: Event, items: { categoryId: string; qty: number }[]): number;
export function pruneExpiredHolds(holds: InventoryDoc['holds'], now: number): InventoryDoc['holds'];
export function festivalRemaining(cat: TicketCategory, inv: InventoryDoc | undefined, now: number): number;
export function remainingMs(holdExpiresAt: number, now: number): number;
export function effectiveOrderStatus(o: Pick<OrderDoc,'status'|'holdExpiresAt'>, now: number): OrderDoc['status'];
export function availabilityLabel(cat: TicketCategory): 'Tersedia' | 'Hampir habis' | 'Habis';
```

- [ ] Tulis test (kasus: tanpa doc → tersedia; seedSold → tidak; held orang lain belum lewat → tidak; held lewat → tersedia; held diri sendiri → tersedia; sold → tidak; total dihitung dari harga seed; prune membuang hold lewat; remaining tidak negatif; pending lewat waktu → 'expired'; label "Hampir habis" bila sisa ≤ 10%; buyer: HP `08123456789` lolos, `12345` gagal, NIK 15 digit gagal, NIK kosong lolos).
- [ ] Jalankan `npm test` → FAIL. Implementasi. Jalankan → PASS. Commit.

### Task 3: Data seed dan katalog (TDD)

**Files:**
- Create: `src/data/seed/events.json`, `src/data/seed/venues.json`, `scripts/gen-venue.mjs`, `src/lib/catalog.ts`
- Test: `src/lib/catalog.test.ts`

**Interfaces — Produces:**
```ts
export type EventFilter = { q?: string; city?: string; genre?: Genre; from?: string; to?: string; min?: number; max?: number; sort?: 'date' | 'price-asc' | 'price-desc' | 'popular' };
export function getEvents(): Event[]; export function getEventBySlug(slug: string): Event | undefined;
export function getEventById(id: string): Event | undefined; export function getVenue(id: string): Venue | undefined;
export function filterEvents(events: Event[], f: EventFilter): Event[];
export function parseFilter(sp: URLSearchParams | Record<string, string | string[] | undefined>): EventFilter;
export function minPrice(e: Event): number; export const CITIES: string[];
```

- [ ] 12 event fiktif, 6 kota (Jakarta, Bandung, Surabaya, Yogyakarta, Medan, Makassar), 5 genre; 3 event di Teater Nusantara (seated), sisanya festival. Setiap event punya `palette` dan `pattern` untuk Poster SVG.
- [ ] `gen-venue.mjs` membuat ±300 kursi (seksi VIP/Gold/Silver) dengan x/y dan ~15% kursi `seedSold`.
- [ ] Test filter (q tak peka huruf besar, kota, genre, rentang tanggal, rentang harga, sort). FAIL → implementasi → PASS. Commit.

### Task 4: Fondasi UI, beranda, daftar event (F1)

**Files:** `src/components/site-header.tsx`, `src/components/theme-toggle.tsx`, `src/components/event/{poster,event-card,filter-bar}.tsx`, `src/app/page.tsx`, `src/app/events/page.tsx`, `src/app/events/loading.tsx`, `src/app/api/events/route.ts`, `src/app/api/events/[slug]/route.ts`, `public/photos/*.webp`

- [ ] Poster SVG generatif dari `palette`/`pattern` + judul.
- [ ] Beranda: hero foto Unsplash, "Konser unggulan", "Segera hadir".
- [ ] `/events`: FilterBar menulis ke URL (`router.replace`), debounce pencarian 300 ms, empty state, skeleton.
- [ ] API events dengan delay acak dan `?chaos=true`.
- [ ] Verifikasi build + cek manual di 360 px. Commit.

### Task 5: Detail konser (F2)

**Files:** `src/app/events/[slug]/page.tsx`, `src/components/event/category-picker.tsx`, `src/app/events/[slug]/not-found.tsx`

- [ ] Header foto + poster, lineup, venue, kategori dengan `availabilityLabel`; tombol nonaktif saat habis; `generateMetadata` + Open Graph; `generateStaticParams`.
- [ ] Commit.

### Task 6: Firebase client/admin, emulator, auth (F8)

**Files:** `firebase.json`, `.firebaserc`, `firestore.rules`, `src/lib/firebase/{client,admin}.ts`, `src/server/auth.ts`, `src/features/auth/{auth-provider,require-auth}.tsx`, `src/app/login/page.tsx`, `scripts/seed-demo.ts`

- [ ] Rules sesuai spec bagian 4. Emulator Auth (9099) + Firestore (8080) + UI.
- [ ] `client.ts` sambung emulator bila `NEXT_PUBLIC_USE_EMULATOR=1`; `admin.ts` pakai kredensial env atau emulator.
- [ ] `verifyRequest(req): Promise<{ uid: string }>` melempar `HttpError(401)`.
- [ ] Halaman masuk: email/password + "Masuk sebagai demo" (demo@panggung.id / demo1234).
- [ ] `seed-demo.ts` membuat user demo + 2 order paid + tiket.
- [ ] Commit.

### Task 7: Server orders (hold + bayar) dan API

**Files:** `src/server/orders.ts`, `src/server/qr.ts`, `src/server/http.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/pay/route.ts`, `src/app/api/tickets/route.ts`
- Test: `src/server/qr.test.ts`

**Interfaces — Produces:**
```ts
export async function createOrder(uid: string, input: CreateOrderInput): Promise<{ orderId: string; holdExpiresAt: number; serverNow: number; total: number }>; // throws HttpError(409,{takenSeatIds}) / 422
export async function payOrder(uid: string, orderId: string, body: PayOrderInput, fail: boolean): Promise<{ ticketIds: string[] }>; // 402/404/409/410
export function signTicket(ticketId: string): string; export function verifyTicket(payload: string): boolean;
```
- [ ] Test QR sign/verify (payload diubah → false). Implementasi transaction sesuai spec bagian 7.
- [ ] Commit.

### Task 8: Seat map + status kursi (F3)

**Files:** `src/components/seat-map/{seat-map,seat,seat-legend}.tsx`, `src/features/seats/use-seat-status.ts`, `src/app/events/[slug]/seats/page.tsx`, `src/components/event/festival-picker.tsx`
- Test: `src/components/seat-map/seat-map.test.tsx`

- [ ] Test: panah kanan memindah fokus ke kursi berikutnya; Enter memilih; kursi ke-5 ditolak dengan pesan; kursi terjual tidak bisa dipilih.
- [ ] Implementasi roving tabindex, zoom/pan, legenda, `onSnapshot`.
- [ ] Commit.

### Task 9: Cart store + countdown + hold (F4)

**Files:** `src/features/cart/store.ts`, `src/features/orders/repository.ts`, `src/components/checkout/{countdown-badge,expired-dialog}.tsx`
- Test: `src/features/cart/store.test.ts`

- [ ] Store: `selection`, `order { id, eventId, holdExpiresAt, total }`, `clockOffset`, `buyer`, `method`; aksi `toggleSeat`, `setQty`, `startHold`, `saveBuyer`, `saveMethod`, `clear`. Persist ke localStorage.
- [ ] Test toggle/maks 4/clear. Countdown magenta < 2 menit; dialog kedaluwarsa.
- [ ] Commit.

### Task 10: Checkout 3 langkah + bayar simulasi (F5, F6)

**Files:** `src/app/checkout/[step]/page.tsx`, `src/components/checkout/{stepper,order-summary,buyer-form,payment-form,confirm-step}.tsx`

- [ ] Langkah `data` → `pembayaran` → `konfirmasi`; guard langkah; tombol "Simulasikan gagal"; 402 → pesan error, timer jalan; sukses → `/tickets/[id]`.
- [ ] Commit.

### Task 11: E-ticket + Tiket Saya (F7)

**Files:** `src/app/tickets/page.tsx`, `src/app/tickets/[id]/page.tsx`, `src/components/ticket/{ticket-card,ticket-pdf}.tsx`

- [ ] QR dari `qrPayload`; unduh PDF dengan `@react-pdf/renderer` (dimuat dinamis); daftar tiket + order kedaluwarsa.
- [ ] Commit.

### Task 12: E2E, CI, README, deploy

**Files:** `playwright.config.ts`, `e2e/*.spec.ts`, `.github/workflows/ci.yml`, `README.md`

- [ ] Tiga skenario E2E (spec bagian 8) dengan `firebase emulators:exec`.
- [ ] Workflow CI: lint, typecheck, test, build, e2e.
- [ ] README: fitur, stack, keputusan teknis, cara setup Firebase, akun demo, GIF/screenshot, kredit pembuat.
- [ ] Buat repo GitHub `afdhalwr/panggung`, push, hubungkan Vercel (setelah project Firebase asli tersedia).
