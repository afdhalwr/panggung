# Panggung — Desain Teknis MVP

Tanggal: 2026-10-12 · Penulis: Afdhal Anwar · Sumber: PRD "Web Tiket Konser" (12 Okt 2026)

Dokumen ini melengkapi PRD dengan keputusan teknis yang disepakati saat brainstorming. Bila ada yang bertentangan, dokumen ini yang berlaku.

## 1. Keputusan utama

| # | Keputusan | Alasan singkat |
| --- | --- | --- |
| K1 | Akses data lewat lapisan `repository`; UI tidak pernah menyentuh Firestore untuk menulis | Implementasi bisa diganti tanpa membongkar UI |
| K2 | Login dengan Firebase Auth (Email/Password) + tombol "Masuk sebagai demo" | Login sungguhan, rekruter tetap cukup satu klik |
| K3 | Order, tiket, dan hold kursi disimpan di Firestore | Tiket ikut akun di semua perangkat; double booking benar-benar dicegah |
| K4 | Project Firebase baru khusus Panggung | Pengguna dan rules terpisah dari Tugasku/Grafika |
| K5 | Poster event dibuat dengan SVG generatif; foto suasana dari Unsplash untuk hero dan header detail | Unik, ringan, tanpa masalah lisensi; tetap memakai `next/image` |
| K6 | Penulisan lewat Route Handler + Firebase Admin SDK; browser hanya membaca (termasuk `onSnapshot`) | Harga dan hold tidak bisa dicurangi; satu skema Zod untuk klien dan server |
| K7 | Desain dibuat di Figma dulu (design system + layar utama) | Konsistensi dan bukti proses untuk studi kasus |
| K8 | Pengembangan lokal dan E2E memakai Firebase Emulator Suite | Bisa jalan sebelum project Firebase asli dibuat; tidak mengotori data asli |

## 2. Ruang lingkup

MVP = F1–F8 dari PRD. F9 (antrean) dan F10 (kursi real-time) dikerjakan setelah gate: tiga skenario E2E di bagian 8 lulus. Di luar scope tetap sama dengan PRD (pembayaran asli, dashboard penyelenggara, artis asli).

## 3. Stack

Next.js 15 (App Router) + TypeScript strict · Tailwind CSS v4 + shadcn/ui (Radix) · Zustand (persist) · TanStack Query · React Hook Form + Zod · Firebase JS SDK v11 (Auth, Firestore) · Firebase Admin SDK · `react-zoom-pan-pinch` · `qrcode.react` · `@react-pdf/renderer` · Vitest + Testing Library · Playwright · GitHub Actions · Vercel.

## 4. Sumber data

| Data | Lokasi | Ditulis oleh |
| --- | --- | --- |
| Event, venue, kategori, posisi kursi, kursi terjual awal | `src/data/seed/*.json` | Tidak pernah ditulis saat runtime |
| Status kursi (held/sold) | Firestore `seats/{eventId}_{seatId}` | Route Handler (Admin SDK) |
| Kuota festival | Firestore `inventory/{eventId}_{categoryId}` | Route Handler |
| Order | Firestore `orders/{orderId}` | Route Handler |
| Tiket | Firestore `tickets/{ticketId}` | Route Handler |

Status kursi efektif = status seed, lalu ditimpa dokumen Firestore bila ada. Kursi `held` dengan `holdExpiresAt <= now` dianggap tersedia.

### Skema Firestore

Semua waktu disimpan sebagai angka epoch milidetik (bukan `Timestamp`), supaya tipe yang sama bisa dipakai di klien, server, dan aturan bisnis tanpa konversi.

```ts
// seats/{eventId}_{seatId}
{ eventId, seatId, status: 'held' | 'sold', uid, orderId, holdExpiresAt: number }

// inventory/{eventId}_{categoryId}
{ eventId, categoryId, sold: number, holds: { [orderId]: { qty: number, uid: string, expiresAt: number } } }

// orders/{orderId}
{ id, uid, eventId, items: { categoryId, seatId?, qty }[], buyer?: { name, email, phone, nik? },
  method?: 'va' | 'ewallet' | 'card', status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled',
  total, holdExpiresAt, createdAt, paidAt? }

// tickets/{ticketId}
{ id, orderId, uid, eventId, categoryId, seatLabel?, qrPayload, createdAt }
```

`expired` tidak pernah ditulis oleh proses latar; UI menurunkannya dari `status === 'pending' && holdExpiresAt <= now`. Pembayaran pada order seperti itu menulis `expired`.

### Firestore rules

- Semua `write` dari klien: ditolak.
- `seats`, `inventory`: `read` untuk semua.
- `orders`, `tickets`: `read` hanya bila `resource.data.uid == request.auth.uid`.

## 5. Modul

```
src/
  app/                          # halaman & Route Handler (lihat bagian 6)
  components/ui/                # shadcn
  components/seat-map/          # SeatMap, Seat, SeatLegend
  components/checkout/          # Stepper, OrderSummary, CountdownBadge, form langkah
  components/event/             # EventCard, Poster (SVG), FilterBar, CategoryPicker
  components/ticket/            # TicketCard, TicketPdf
  features/auth/                # AuthProvider, useAuth, RequireAuth, demo login
  features/cart/store.ts        # Zustand: pilihan, orderId, holdExpiresAt, clockOffset, isian checkout
  features/orders/repository.ts # createOrder, payOrder, listTickets, getTicket (memanggil /api)
  features/seats/useSeatStatus.ts # onSnapshot seats + gabung seed
  lib/schemas.ts                # Zod + tipe
  lib/catalog.ts                # baca seed, filter, sort, cari (fungsi murni)
  lib/rules.ts                  # isSeatAvailable, computeTotal, pruneExpiredHolds, remainingMs, effectiveOrderStatus
  lib/format.ts                 # rupiah, tanggal Indonesia
  lib/firebase/client.ts        # init app, auth, db (+ emulator bila NEXT_PUBLIC_USE_EMULATOR)
  lib/firebase/admin.ts         # server-only
  server/orders.ts              # createOrder, payOrder (transaction), tanpa HTTP
  server/auth.ts                # verifyIdToken dari header Authorization
  server/qr.ts                  # tanda tangan HMAC
  data/seed/                    # events.json, venues.json
```

## 6. Route Handler

| Endpoint | Method | Auth | Keterangan |
| --- | --- | --- | --- |
| `/api/events` | GET | - | `?city&genre&from&to&min&max&q&sort`; delay 300–900 ms; `?chaos=true` → 500 |
| `/api/events/[slug]` | GET | - | 404 bila tidak ada |
| `/api/orders` | POST | wajib | Buat order + hold; 409 `{ takenSeatIds }`; 422 kuota festival kurang |
| `/api/orders/[id]/pay` | POST | wajib | Body `{ buyer, method }`; `?fail=true` → 402; 410 kedaluwarsa |
| `/api/tickets` | GET | wajib | Tiket milik pengguna (Admin SDK) |

Status kursi tidak lewat API; klien membaca Firestore langsung. Delay/chaos hanya di endpoint baca seed.

## 7. Alur hold dan checkout

1. **Pilih kursi** (klien saja): maks 4 kursi per order; festival maks 4 tiket.
2. **`POST /api/orders`** dalam satu transaction: batalkan order `pending` milik pengguna untuk event yang sama (lepas kursi/holds-nya); cek setiap kursi dengan `isSeatAvailable`; gagal → 409 dengan daftar kursi. Tulis `seats` held + `holdExpiresAt = now + 10 menit`, tulis order `pending` dengan total dari seed. Respons `{ orderId, holdExpiresAt, serverNow, total }`.
3. **Klien**: 409 → toast "Kursi A12 baru saja diambil orang lain", lepas kursi itu. Sukses → simpan ke store, `clockOffset = serverNow − Date.now()`, buka `/checkout/data`.
4. **Countdown**: `remainingMs(holdExpiresAt, Date.now() + clockOffset)`; badge di semua langkah, warna magenta saat < 2 menit.
5. **Checkout**: `data` (nama, email, HP `^(\+62|62|0)8\d{8,11}$`, NIK opsional 16 digit) → `pembayaran` (VA / e-wallet / kartu, semua dummy, plus tombol "Simulasikan gagal") → `konfirmasi`. Isian disimpan di store; langkah berikutnya terkunci sampai langkah sebelumnya valid.
6. **`POST /api/orders/[id]/pay`**: transaction cek pemilik, `pending`, belum kedaluwarsa. `?fail=true` → 402 (order tetap pending). Sukses → kursi `sold`, `inventory.sold += qty` dan hapus hold, order `paid`, tiket dibuat dengan `qrPayload = PANGGUNG.{ticketId}.{hmac16}`. Klien mengosongkan cart dan membuka `/tickets/[id]`.
7. **Kedaluwarsa**: timer 0 atau reload setelah lewat → modal "Waktu habis, kursi dilepas", cart dikosongkan, kembali ke denah.

## 8. Testing

- **Unit (Vitest)**: `lib/rules.ts`, `lib/catalog.ts`, `lib/schemas.ts`, `server/qr.ts`, cart store.
- **Komponen**: SeatMap (panah, Enter/Spasi, batas 4), Stepper.
- **E2E (Playwright + Firebase Emulator)**: (1) demo login → kursi → checkout → e-ticket; (2) bayar gagal → coba lagi → sukses; (3) timer habis lewat `page.clock` → modal → kursi dilepas.

## 9. UI

- Mode gelap default: latar `#0B0B10`, permukaan `#16161F`, primary `#C6FF3D`, aksen `#FF3D8B`. Mode terang dengan kontras AA.
- Font: Bricolage Grotesque (judul), Plus Jakarta Sans (teks), via `next/font`.
- Status kursi: tersedia (garis tepi warna kategori), dipilih (isi primary + centang), ditahan (pola garis + jam), terjual (abu-abu + silang). Legenda selalu tampil.
- Seat map SVG, zoom/geser via `react-zoom-pan-pinch` + tombol +/−, roving tabindex, panah antar kursi, `aria-label` lengkap.
- Satu venue berkursi (Teater Nusantara, 3 seksi, ±300 kursi); event lain festival. 12 event fiktif di 6 kota.
- HP: OrderSummary + tombol Lanjut menempel di bawah, countdown menempel di atas.
- Semua teks UI berbahasa Indonesia.

## 10. Lingkungan dan deploy

- Env: `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_USE_EMULATOR`, `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `TICKET_QR_SECRET`.
- Tanpa kredensial Admin, server memakai emulator (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`).
- Vercel: env diisi dengan `vercel env add NAME production --value ...` (bukan pipe dari PowerShell, karena menambah BOM).
- CI: lint, type-check, Vitest, build, Playwright dengan emulator.

## 11. Catatan implementasi

- Firebase Auth dan `firebase/app` dimuat lewat dynamic import saat browser senggang; Firestore SDK hanya di halaman denah. Tujuannya menjaga First Load JS halaman publik di 113 kB.
- Order pending lama milik pengguna yang sama untuk event yang sama dibatalkan di transaction `createOrder`, termasuk hold festivalnya.
- Halaman e-ticket dan daftar tiket mendapat info event dari `/api/tickets` (server memperkaya data), jadi klien tidak memuat data seed.

## 12. Tugas yang butuh pemilik akun

Membuat project Firebase, mengaktifkan Email/Password dan Firestore, membuat service account key, dan menghubungkan Vercel. Langkahnya ditulis di README; sebelum itu aplikasi berjalan penuh di emulator.
