/**
 * Membuat akun demo (pengguna + admin), riwayat tiket akun demo, dan pesanan simulasi untuk dashboard admin.
 * Aman dijalankan berulang kali; sekaligus memulihkan sandi/status akun demo bila sempat diubah pengunjung.
 *   Lokal (emulator):  npm run emulators   lalu   npm run seed:demo
 *   Produksi:          isi FIREBASE_ADMIN_* di .env.local lalu npm run seed:demo
 */
import type { WriteBatch } from "firebase-admin/firestore";
import { DEMO_ACCOUNTS } from "@/features/auth/demo-accounts";
import { getVenue } from "@/lib/catalog";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { HOLD_MS } from "@/lib/rules";
import type { Event, InventoryDoc, OrderDoc, OrderItem, PaymentMethod, SeatDoc, TicketDoc } from "@/lib/schemas";
import { readAllEvents } from "@/server/events-store";
import { createOrder, invDocId, payOrder, seatDocId } from "@/server/orders";
import { signTicket } from "@/server/qr";

try {
  process.loadEnvFile(".env.local");
} catch {
  // tidak ada .env.local: pakai env yang sudah ada
}
process.env.TICKET_QR_SECRET ??= "dev-secret-panggung-lokal";

const DEMO = { ...DEMO_ACCOUNTS.user, displayName: "Nadia (Demo)" };
const ADMIN = { ...DEMO_ACCOUNTS.admin, displayName: "Sinta (Admin)" };
const buyer = { name: "Nadia Putri", email: DEMO.email, phone: "081234567890" };

/** Pembeli fiktif untuk mengisi dashboard. Satu akun sengaja nonaktif untuk contoh fitur kelola pengguna. */
const BUYERS = [
  { name: "Raka Pratama", email: "raka@pembeli.panggung.id", phone: "081311110001" },
  { name: "Ayu Kirana", email: "ayu@pembeli.panggung.id", phone: "081311110002" },
  { name: "Bima Saputra", email: "bima@pembeli.panggung.id", phone: "081311110003" },
  { name: "Laras Wening", email: "laras@pembeli.panggung.id", phone: "081311110004" },
  { name: "Fajar Nugroho", email: "fajar@pembeli.panggung.id", phone: "081311110005" },
  { name: "Yoga Prasetyo", email: "yoga@pembeli.panggung.id", phone: "081311110006" },
];
const SPAMMER = { name: "Bot Calo", email: "calo@pembeli.panggung.id", phone: "081311119999" };

/** Buat akun bila belum ada, lalu kembalikan sandi dan status aktifnya (bila sempat diubah pengunjung demo). */
async function upsertAccount(acc: { email: string; password: string; displayName: string; disabled?: boolean }) {
  const auth = adminAuth();
  const existing = await auth.getUserByEmail(acc.email).catch(() => null);
  if (!existing) return auth.createUser({ ...acc, disabled: acc.disabled ?? false });
  return auth.updateUser(existing.uid, { password: acc.password, disabled: acc.disabled ?? false, displayName: acc.displayName });
}

async function seedDemoTickets(uid: string, events: Event[]) {
  const paid = await adminDb().collection("orders").where("uid", "==", uid).where("status", "==", "paid").get();
  if (!paid.empty) {
    console.log(`Akun demo sudah punya ${paid.size} order lunas, riwayat tiket dilewati.`);
    return;
  }

  // 1) Dua kursi VIP berdampingan di Senja Ruah.
  const senja = events.find((e) => e.id === "evt-senja-ruah")!;
  const free = getVenue(senja.venueId)!.seats!.filter((s) => s.categoryId === "vip" && !s.seedSold);
  const pair = free.find((s, i) => free[i + 1]?.row === s.row && free[i + 1]?.number === s.number + 1)!;
  const seats = [pair, free[free.indexOf(pair) + 1]!];
  const o1 = await createOrder(uid, {
    eventId: senja.id,
    items: seats.map((s) => ({ categoryId: "vip", seatId: s.id, qty: 1 })),
  });
  await payOrder(uid, o1.orderId, { buyer, method: "ewallet" }, false);
  console.log(`Order ${o1.orderId}: Senja Ruah, kursi ${seats.map((s) => s.id).join(" & ")}`);

  // 2) Dua tiket terusan festival.
  const o2 = await createOrder(uid, { eventId: "evt-sore-tugu", items: [{ categoryId: "terusan", qty: 2 }] });
  await payOrder(uid, o2.orderId, { buyer, method: "va" }, false);
  console.log(`Order ${o2.orderId}: Sore di Tugu Fest, 2 tiket terusan`);
}

/** PRNG deterministik (mulberry32), supaya data simulasi sama setiap kali seed dijalankan di project baru. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ±120 pesanan selama 30 hari terakhir, ditulis langsung (bukan lewat createOrder) karena waktunya dimundurkan.
 * Status kursi dan kuota festival ikut diperbarui, jadi denah dan okupansi konsisten dengan pesanan.
 */
async function seedSimulatedOrders(events: Event[], buyers: { uid: string; name: string; email: string; phone: string }[]) {
  const db = adminDb();
  const marker = db.doc("meta/demoOrders");
  if ((await marker.get()).exists) {
    console.log("Pesanan simulasi sudah ada, dilewati.");
    return;
  }

  const rand = rng(20261012);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const now = Date.now();
  const DAY = 86_400_000;
  const open = events.filter((e) => e.status === "published" && Date.parse(e.salesOpenAt) < now - DAY && Date.parse(e.date) > now);

  // Kursi dan kuota yang sudah terpakai (seed venue, akun demo) supaya simulasi tidak bentrok.
  const takenSeats = new Map<string, Set<string>>();
  const inventory = new Map<string, InventoryDoc>();
  for (const e of open) {
    const seats = await db.collection("seats").where("eventId", "==", e.id).get();
    takenSeats.set(e.id, new Set(seats.docs.map((d) => (d.data() as SeatDoc).seatId)));
    for (const c of e.categories.filter((c) => c.type === "festival")) {
      const snap = await db.collection("inventory").doc(invDocId(e.id, c.id)).get();
      inventory.set(invDocId(e.id, c.id), (snap.data() as InventoryDoc | undefined) ?? { eventId: e.id, categoryId: c.id, sold: 0, holds: {} });
    }
  }

  const writes: ((b: WriteBatch) => void)[] = [];
  const statuses: OrderDoc["status"][] = [];
  const methods: PaymentMethod[] = ["va", "ewallet", "card"];

  for (let n = 0; n < 120; n++) {
    const event = pick(open);
    const salesStart = Math.max(Date.parse(event.salesOpenAt) + 3_600_000, now - 30 * DAY);
    // Lebih banyak pesanan mendekati hari ini, seperti penjualan yang memanas.
    const paidAt = Math.round(salesStart + Math.sqrt(rand()) * (now - 30 * 60_000 - salesStart));
    const createdAt = paidAt - Math.round((2 + rand() * 6) * 60_000);
    const who = pick(buyers);
    const r = rand();
    const status: OrderDoc["status"] = r < 0.82 ? "paid" : r < 0.89 ? "refunded" : r < 0.95 ? "expired" : "cancelled";

    const items: OrderItem[] = [];
    const venue = getVenue(event.venueId)!;
    if (venue.type === "seated") {
      const taken = takenSeats.get(event.id)!;
      const cat = pick(event.categories);
      const free = (venue.seats ?? []).filter((s) => s.categoryId === cat.id && !s.seedSold && !taken.has(s.id));
      const qty = Math.min(free.length, 1 + Math.floor(rand() * 3));
      if (!qty) continue;
      const start = Math.floor(rand() * (free.length - qty + 1));
      for (const s of free.slice(start, start + qty)) {
        items.push({ categoryId: cat.id, seatId: s.id, qty: 1 });
        if (status === "paid") taken.add(s.id);
      }
    } else {
      const cat = pick(event.categories);
      const inv = inventory.get(invDocId(event.id, cat.id))!;
      const left = cat.quota - cat.sold - inv.sold;
      const qty = Math.min(left, 1 + Math.floor(rand() * 4));
      if (qty <= 0) continue;
      items.push({ categoryId: cat.id, qty });
      if (status === "paid") inv.sold += qty;
    }

    const orderRef = db.collection("orders").doc();
    const total = items.reduce((sum, i) => sum + event.categories.find((c) => c.id === i.categoryId)!.price * i.qty, 0);
    const lunas = status === "paid" || status === "refunded";
    const order: OrderDoc = {
      id: orderRef.id,
      uid: who.uid,
      eventId: event.id,
      items,
      status,
      total,
      holdExpiresAt: createdAt + HOLD_MS,
      createdAt,
      ...(status !== "cancelled" ? { buyer: { name: who.name, email: who.email, phone: who.phone }, method: pick(methods) } : {}),
      ...(lunas ? { paidAt } : {}),
      ...(status === "refunded" ? { refundedAt: paidAt + Math.round(rand() * 3 * DAY) } : {}),
    };
    if (order.refundedAt && order.refundedAt > now) order.refundedAt = now - 60_000;
    writes.push((b) => b.set(orderRef, order));
    statuses.push(status);

    if (!lunas) continue;
    for (const item of items) {
      for (let q = 0; q < item.qty; q++) {
        const ticketRef = db.collection("tickets").doc();
        const ticket: TicketDoc = {
          id: ticketRef.id,
          orderId: orderRef.id,
          uid: who.uid,
          eventId: event.id,
          categoryId: item.categoryId,
          ...(item.seatId ? { seatLabel: item.seatId } : {}),
          qrPayload: signTicket(ticketRef.id),
          createdAt: paidAt,
          ...(order.refundedAt ? { refundedAt: order.refundedAt } : {}),
        };
        writes.push((b) => b.set(ticketRef, ticket));
      }
      if (item.seatId && status === "paid") {
        const seat: SeatDoc = { eventId: event.id, seatId: item.seatId, status: "sold", uid: who.uid, orderId: orderRef.id, holdExpiresAt: createdAt + HOLD_MS };
        writes.push((b) => b.set(db.collection("seats").doc(seatDocId(event.id, item.seatId!)), seat));
      }
    }
  }
  for (const [id, inv] of inventory) writes.push((b) => b.set(db.collection("inventory").doc(id), inv));
  writes.push((b) => b.set(marker, { createdAt: now, orders: statuses.length }));

  // Batch Firestore maksimal 500 operasi.
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach((w) => w(batch));
    await batch.commit();
  }
  const count = (s: OrderDoc["status"]) => statuses.filter((x) => x === s).length;
  console.log(`Pesanan simulasi: ${statuses.length} (${count("paid")} lunas, ${count("refunded")} refund, ${count("expired")} kedaluwarsa, ${count("cancelled")} batal)`);
}

async function main() {
  const user = await upsertAccount(DEMO);
  console.log(`Akun demo pengguna: ${DEMO.email} / ${DEMO.password} (uid ${user.uid})`);
  const admin = await upsertAccount(ADMIN);
  await adminAuth().setCustomUserClaims(admin.uid, { role: "admin" });
  console.log(`Akun demo admin: ${ADMIN.email} / ${ADMIN.password} (uid ${admin.uid})`);

  const buyers = [];
  for (const b of BUYERS) buyers.push({ ...b, uid: (await upsertAccount({ email: b.email, password: "pembeli1234", displayName: b.name })).uid });
  await upsertAccount({ email: SPAMMER.email, password: "pembeli1234", displayName: SPAMMER.name, disabled: true });
  console.log(`${BUYERS.length} pembeli fiktif + 1 akun nonaktif siap.`);

  const events = await readAllEvents();
  await seedDemoTickets(user.uid, events);
  await seedSimulatedOrders(events, buyers);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
