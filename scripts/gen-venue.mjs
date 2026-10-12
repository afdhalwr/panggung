// Membuat src/data/seed/venues.json: satu venue berkursi (Teater Nusantara) + venue festival.
// Jalankan: node scripts/gen-venue.mjs
import { writeFileSync } from "node:fs";

const SEAT = 30; // jarak antar kursi di koordinat SVG
const WIDTH = 760;
const sections = [
  { categoryId: "vip", rows: ["A", "B", "C", "D"], perRow: 16, aisle: false },
  { categoryId: "gold", rows: ["E", "F", "G", "H", "J"], perRow: 20, aisle: true },
  { categoryId: "silver", rows: ["K", "L", "M", "N", "P"], perRow: 22, aisle: true },
];

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const seats = [];
let y = 110; // di bawah panggung
for (const sec of sections) {
  for (const row of sec.rows) {
    const gap = sec.aisle ? SEAT : 0;
    const rowWidth = sec.perRow * SEAT + gap;
    const startX = (WIDTH - rowWidth) / 2 + SEAT / 2;
    for (let n = 1; n <= sec.perRow; n++) {
      const x = startX + (n - 1) * SEAT + (sec.aisle && n > sec.perRow / 2 ? gap : 0);
      seats.push({
        id: `${row}${n}`,
        section: sec.categoryId,
        row,
        number: n,
        categoryId: sec.categoryId,
        x: Math.round(x),
        y,
        ...(rnd() < 0.15 ? { seedSold: true } : {}),
      });
    }
    y += SEAT;
  }
  y += 24; // jarak antar seksi
}

const venues = [
  {
    id: "teater-nusantara",
    name: "Teater Nusantara",
    city: "Jakarta",
    address: "Jl. Gatot Subroto Kav. 12, Jakarta Selatan",
    type: "seated",
    capacity: seats.length,
    width: WIDTH,
    height: y + 10,
    seats,
  },
  { id: "taman-kota-raya", name: "Taman Kota Raya", city: "Jakarta", address: "Jl. Merdeka Timur No. 8, Jakarta Pusat", type: "festival", capacity: 8000 },
  { id: "balai-sora", name: "Balai Sora", city: "Bandung", address: "Jl. Cihampelas Atas No. 21, Bandung", type: "festival", capacity: 3000 },
  { id: "hall-pelabuhan", name: "Hall Pelabuhan", city: "Surabaya", address: "Jl. Perak Barat No. 5, Surabaya", type: "festival", capacity: 4500 },
  { id: "alun-alun-selatan", name: "Lapangan Pendopo Kidul", city: "Yogyakarta", address: "Jl. Gamelan No. 3, Yogyakarta", type: "festival", capacity: 10000 },
  { id: "gedung-deli", name: "Gedung Deli Raya", city: "Medan", address: "Jl. Kesawan No. 17, Medan", type: "festival", capacity: 3500 },
  { id: "dermaga-senja", name: "Dermaga Senja", city: "Makassar", address: "Jl. Pantai Barat No. 2, Makassar", type: "festival", capacity: 6000 },
];

writeFileSync(new URL("../src/data/seed/venues.json", import.meta.url), JSON.stringify(venues, null, 1) + "\n");
const sold = seats.filter((s) => s.seedSold).length;
console.log(`Teater Nusantara: ${seats.length} kursi, ${sold} terjual (seed), tinggi ${y + 10}`);
