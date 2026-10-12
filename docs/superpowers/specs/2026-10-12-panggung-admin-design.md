# Panggung — Desain Teknis Sisi Admin

Tanggal: 2026-10-12 · Penulis: Afdhal Anwar · Sumber: PRD "Web Tiket Konser" revisi dengan peran Admin (A1–A7)

Dokumen ini melanjutkan [desain MVP](2026-10-12-panggung-design.md). Bila bertentangan dengan PRD, dokumen ini yang berlaku. Keputusan K1–K8 tetap berlaku.

## 1. Keputusan

| # | Keputusan | Alasan singkat |
| --- | --- | --- |
| K9 | Peran disimpan sebagai Firebase custom claim `role: 'admin'`; akun tanpa claim = `user`. Akun dari halaman daftar selalu `user` | Tetap satu sistem login (Firebase), bukan Auth.js; claim ikut di ID token sehingga bisa dicek tanpa query |
| K10 | Firebase session cookie httpOnly `panggung_id` (5 hari) dibuat lewat `POST /api/session`. Cookie `panggung_session` ikut di-set server dan berisi peran (`user`/`admin`) sebagai petunjuk untuk middleware | Halaman `/admin` diverifikasi di server (Node) sebelum dirender; middleware (edge) cukup membaca petunjuk agar tidak ada kedipan |
| K11 | API admin memakai `requireRole(req, 'admin')`: verifikasi Bearer ID token dengan `checkRevoked`, 401 bila tidak ada/tidak sah, 403 bila bukan admin | Keamanan di Route Handler, bukan di UI; Bearer token kebal CSRF |
| K12 | Event pindah ke Firestore `events/{id}`. `events.json` menjadi data awal yang ditulis sekali (penanda `meta/catalog`). Venue dan denah tetap JSON | Perubahan admin langsung terlihat; venue tidak diubah admin |
| K13 | Halaman publik dirender dinamis dengan `unstable_cache` bertag `events`; setiap mutasi admin memanggil `revalidateTag('events')` | Build di CI tidak butuh Firestore; pembaca tetap mendapat data dari cache |
| K14 | Kursi diblokir = dokumen `seats` berstatus `blocked`; aturan `isSeatAvailable` menolaknya | Denah pembeli ikut berubah real-time lewat `onSnapshot` yang sudah ada |
| K15 | Refund: order `refunded` + `refundedAt`, tiket diberi `refundedAt`, kursi dilepas, `inventory.sold` dikurangi, dalam satu transaction | Kursi bisa dijual lagi; QR tiket refund ditolak saat validasi |
| K16 | Data demo dilindungi: akun demo tidak bisa dinonaktifkan; event yang sudah punya pesanan tidak bisa dihapus (pakai status Selesai) | Demo publik tidak bisa dirusak satu pengunjung |
| K17 | Admin tidak bisa membeli tiket (`createOrder` 403, middleware mengalihkan `/checkout` dan `/tickets` ke `/admin`) | Sesuai tabel hak akses PRD |
| K18 | Seed membuat akun admin demo, 6 pembeli fiktif, dan ±120 pesanan mundur 30 hari | Dashboard, tabel pesanan, dan daftar pengguna terlihat hidup saat dinilai |

## 2. Status event

`draft` tidak tampil di sisi pengguna (daftar, beranda, sitemap, detail → 404, order ditolak). `published` normal. `finished` tidak tampil di daftar/beranda; detail tetap bisa dibuka (tautan dari tiket) dengan tombol beli nonaktif "Konser sudah selesai".

## 3. Skema tambahan

```ts
// events/{id}  — Event + kolom berikut
{ status: 'draft' | 'published' | 'finished', updatedAt: number }

// seats/{eventId}_{seatId}
| { status: 'held' | 'sold', eventId, seatId, uid, orderId, holdExpiresAt }
| { status: 'blocked', eventId, seatId, blockedAt }

// orders: status + 'refunded', refundedAt?
// tickets: usedAt?, refundedAt?
// meta/catalog: { seededAt }
```

Kuota kategori `seated` tetap diturunkan dari denah. Kuota `festival` boleh diubah admin, minimal `sold (seed) + inventory.sold + hold aktif`. Kategori baru hanya bisa ditambah untuk venue festival (kursi venue berkursi terikat ke denah). Kategori hanya bisa dihapus bila belum ada penjualan atau hold.

## 4. Rute

| Halaman | Rute | Catatan |
| --- | --- | --- |
| Dashboard | `/admin` | KPI (tiket terjual, pendapatan, pesanan lunas, okupansi), grafik harian Recharts, filter event + rentang tanggal, event terdekat |
| Event | `/admin/events` | Tabel TanStack Table + filter status; `/admin/events/new` untuk buat |
| Ubah event | `/admin/events/[id]` | Tab Info (form + preview poster), Kategori & Harga, Denah Kursi |
| Pesanan | `/admin/orders`, `/admin/orders/[id]` | Cari, filter status, sorting, pagination; detail + refund |
| Validasi | `/admin/scan` | Kamera (`html5-qrcode`, dimuat lazy) + input kode |
| Pengguna | `/admin/users` | Cari, aktif/nonaktif |
| Profil | `/profile` | Ubah nama dan kata sandi (disembunyikan untuk akun demo) |
| Akses ditolak | `/403` | |

| Endpoint | Method | Fungsi |
| --- | --- | --- |
| `/api/session` | POST, DELETE | Buat/hapus session cookie |
| `/api/session/reset` | GET | Hapus cookie lalu ke `/login?next=` (cookie basi) |
| `/api/admin/stats` | GET | KPI + penjualan harian (`?eventId&from&to`) |
| `/api/admin/events` | GET, POST | Semua event / buat event |
| `/api/admin/events/[id]` | PATCH, DELETE | Ubah info, status, kategori / hapus |
| `/api/admin/seats/[eventId]` | PATCH | `{ seatIds, blocked }` |
| `/api/admin/orders` | GET | Semua pesanan |
| `/api/admin/orders/[id]/refund` | POST | Refund simulasi |
| `/api/admin/tickets/validate` | POST | `{ code }` → `valid` / `used` / `refunded` / `unknown` |
| `/api/admin/users` | GET | Daftar akun |
| `/api/admin/users/[id]` | PATCH | `{ disabled }` |

Halaman admin adalah Server Component yang membaca data langsung lewat fungsi di `src/server/admin/*` setelah `requireAdminPage()`; mutasi lewat endpoint di atas.

## 5. Layout

Route group `(site)` memegang header/footer publik; `admin/` punya layout sidebar sendiri (tema netral, padat data, badge "Admin" di header). Halaman scan dioptimalkan untuk HP; sisanya laptop/tablet dengan sidebar yang berubah jadi menu atas di layar kecil.

## 6. Testing

- Unit: aturan kursi `blocked`, kuota minimum, agregasi statistik, validasi kode tiket.
- E2E: (4) pengguna demo membuka `/admin` → 403, dan `GET /api/admin/stats` dengan token pengguna → 403; (5) admin demo masuk → dashboard → blokir kursi → kursi tampil tidak tersedia di denah pembeli; (6) admin memvalidasi tiket demo dua kali → Valid lalu Sudah dipakai.
