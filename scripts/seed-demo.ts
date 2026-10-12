/**
 * Membuat akun demo + riwayat tiket. Aman dijalankan berulang kali.
 *   Lokal (emulator):  npm run emulators   lalu   npm run seed:demo
 *   Produksi:          isi FIREBASE_ADMIN_* di .env.local lalu npm run seed:demo
 */
import { getEventById, getVenue } from "@/lib/catalog";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createOrder, payOrder } from "@/server/orders";

try {
  process.loadEnvFile(".env.local");
} catch {
  // tidak ada .env.local: pakai env yang sudah ada
}
process.env.TICKET_QR_SECRET ??= "dev-secret-panggung-lokal";

const DEMO = { email: "demo@panggung.id", password: "demo1234", displayName: "Nadia (Demo)" };
const buyer = { name: "Nadia Putri", email: DEMO.email, phone: "081234567890" };

async function main() {
  const auth = adminAuth();
  const user = await auth.getUserByEmail(DEMO.email).catch(() => auth.createUser(DEMO));
  console.log(`Akun demo: ${DEMO.email} / ${DEMO.password} (uid ${user.uid})`);

  const paid = await adminDb().collection("orders").where("uid", "==", user.uid).where("status", "==", "paid").get();
  if (!paid.empty) {
    console.log(`Sudah ada ${paid.size} order lunas, seed dilewati.`);
    return;
  }

  // 1) Dua kursi VIP berdampingan di Senja Ruah.
  const senja = getEventById("evt-senja-ruah")!;
  const free = getVenue(senja.venueId)!.seats!.filter((s) => s.categoryId === "vip" && !s.seedSold);
  const pair = free.find((s, i) => free[i + 1]?.row === s.row && free[i + 1]?.number === s.number + 1)!;
  const seats = [pair, free[free.indexOf(pair) + 1]!];
  const o1 = await createOrder(user.uid, {
    eventId: senja.id,
    items: seats.map((s) => ({ categoryId: "vip", seatId: s.id, qty: 1 })),
  });
  await payOrder(user.uid, o1.orderId, { buyer, method: "ewallet" }, false);
  console.log(`Order ${o1.orderId}: Senja Ruah, kursi ${seats.map((s) => s.id).join(" & ")}`);

  // 2) Dua tiket terusan festival.
  const o2 = await createOrder(user.uid, { eventId: "evt-sore-tugu", items: [{ categoryId: "terusan", qty: 2 }] });
  await payOrder(user.uid, o2.orderId, { buyer, method: "va" }, false);
  console.log(`Order ${o2.orderId}: Sore di Tugu Fest, 2 tiket terusan`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
