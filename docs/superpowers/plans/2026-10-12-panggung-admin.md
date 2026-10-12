# Rencana Implementasi — Sisi Admin

Spec: [2026-10-12-panggung-admin-design.md](../specs/2026-10-12-panggung-admin-design.md). Setiap fase diakhiri lint, type-check, unit test, dan commit.

## Fase 1 — Event pindah ke Firestore
- [x] Tipe `EventStatus`, `SeatDoc` dengan status `blocked`, order `refunded`, tiket `usedAt`/`refundedAt`
- [x] `server/events-store.ts` (baca mentah + seed sekali dengan penanda `meta/catalog`) dan `server/catalog.ts` (`unstable_cache` bertag `events`, `connection()` agar build tidak butuh Firestore)
- [x] `createOrder` membaca event di dalam transaction; event draft/selesai ditolak
- [x] Halaman publik, sitemap, dan API events memakai katalog Firestore; detail event selesai menonaktifkan tombol beli
- [x] Aturan `isSeatAvailable`/`effectiveSeatStatus`/`canBlockSeat`/`minFestivalQuota`/`canRefund` + unit test

## Fase 2 — Peran dan sesi
- [x] Custom claim `role`, `requireRole()` untuk API, admin tidak bisa membeli tiket
- [x] `POST/DELETE /api/session` (session cookie httpOnly + cookie petunjuk peran), `/api/session/reset`
- [x] `AuthProvider` menyinkronkan sesi; login dengan tombol demo Pengguna/Admin; pesan akun nonaktif
- [x] Middleware: tamu → login, pengguna di `/admin` → `/403`, admin di `/tickets`/`/checkout` → `/admin`
- [x] Route group `(site)`, layout admin dengan `requireAdminPage()` di layout dan setiap halaman
- [x] Header dan menu akun sesuai peran, halaman `/403` dan `/profile`

## Fase 3 — Dashboard dan event
- [x] `lib/stats.ts` (KPI, harian, okupansi) + unit test; dashboard dengan filter rentang/event dan grafik Recharts (warna divalidasi)
- [x] Tabel event (TanStack Table), form buat/ubah dengan preview poster, hapus dengan konfirmasi
- [x] Kategori & harga dengan kuota minimum; blokir/buka kursi di denah real-time

## Fase 4 — Pesanan, validasi, pengguna
- [x] Tabel pesanan (cari, filter, sort, pagination), detail, refund dalam transaction
- [x] Validasi tiket (kamera `html5-qrcode` lazy + input kode), `usedAt` dalam transaction
- [x] Daftar pengguna, aktif/nonaktif dengan pencabutan sesi; akun demo dan diri sendiri dilindungi
- [x] Tampilan tiket refund/terpakai di sisi pembeli

## Fase 5 — Data demo, tes, dokumentasi
- [x] Seed: admin demo, 6 pembeli fiktif + 1 akun nonaktif, ±120 pesanan mundur 30 hari
- [x] E2E: 403 untuk pengguna (halaman + API), blokir kursi tampil di denah pembeli, validasi Valid → Sudah dipakai
- [x] README, screenshot admin, spec, dan rencana ini
