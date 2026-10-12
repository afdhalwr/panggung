import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getEventById, getVenue } from "@/lib/catalog";
import { adminDb } from "@/lib/firebase/admin";
import { HOLD_MS, computeTotal, festivalRemaining, isSeatAvailable, pruneExpiredHolds } from "@/lib/rules";
import type {
  CreateOrderInput,
  CreateOrderResult,
  InventoryDoc,
  OrderDoc,
  PayOrderInput,
  PayOrderResult,
  SeatDef,
  SeatDoc,
  TicketDoc,
} from "@/lib/schemas";
import { HttpError } from "./http";
import { signTicket } from "./qr";

const seatDocId = (eventId: string, seatId: string) => `${eventId}_${seatId}`;
const invDocId = (eventId: string, categoryId: string) => `${eventId}_${categoryId}`;

function data<T>(snap: DocumentSnapshot): T | undefined {
  return snap.exists ? (snap.data() as T) : undefined;
}

/** Validasi pesanan terhadap data seed (kategori, kursi, penjualan dibuka). Tidak menyentuh Firestore. */
function resolveOrder(input: CreateOrderInput, now: number) {
  const event = getEventById(input.eventId);
  if (!event) throw new HttpError(404, "Konser tidak ditemukan.");
  if (new Date(event.salesOpenAt).getTime() > now) throw new HttpError(403, "Penjualan tiket belum dibuka.");
  const venue = getVenue(event.venueId);
  const seatsById = new Map<string, SeatDef>((venue?.seats ?? []).map((s) => [s.id, s]));
  const seen = new Set<string>();

  for (const item of input.items) {
    const cat = event.categories.find((c) => c.id === item.categoryId);
    if (!cat) throw new HttpError(422, "Kategori tiket tidak dikenal.");
    if (cat.type === "seated") {
      const seat = item.seatId ? seatsById.get(item.seatId) : undefined;
      if (!seat || seat.categoryId !== cat.id) throw new HttpError(422, "Kursi tidak dikenal untuk kategori ini.");
      if (seen.has(seat.id)) throw new HttpError(422, "Kursi yang sama dipilih dua kali.");
      seen.add(seat.id);
    } else if (item.seatId) {
      throw new HttpError(422, "Kategori festival tidak memakai nomor kursi.");
    }
  }
  return { event, seatsById, total: computeTotal(event, input.items) };
}

/**
 * Buat order dan tahan kursi/kuota 10 menit dalam satu transaction.
 * Order pending lain milik pengguna yang sama untuk event ini dibatalkan lebih dulu,
 * supaya pengguna tidak terhalang oleh hold miliknya sendiri.
 */
export async function createOrder(uid: string, input: CreateOrderInput): Promise<CreateOrderResult> {
  const db = adminDb();
  const { event, seatsById, total } = resolveOrder(input, Date.now());
  const orderRef = db.collection("orders").doc();

  const holdExpiresAt = await db.runTransaction(async (tx) => {
    const now = Date.now();
    const expiresAt = now + HOLD_MS;

    // --- Baca semua dokumen dulu (aturan transaction Firestore) ---
    const oldSnap = await tx.get(
      db.collection("orders").where("uid", "==", uid).where("eventId", "==", event.id).where("status", "==", "pending"),
    );
    const oldOrders = oldSnap.docs.map((d) => d.data() as OrderDoc);
    const oldIds = new Set(oldOrders.map((o) => o.id));

    const seatIds = new Set<string>();
    const invCats = new Set<string>();
    for (const item of [...input.items, ...oldOrders.flatMap((o) => o.items)]) {
      if (item.seatId) seatIds.add(item.seatId);
      else invCats.add(item.categoryId);
    }
    const seatRefs = [...seatIds].map((id) => db.collection("seats").doc(seatDocId(event.id, id)));
    const invRefs = [...invCats].map((id) => db.collection("inventory").doc(invDocId(event.id, id)));
    const snaps = seatRefs.length + invRefs.length ? await tx.getAll(...seatRefs, ...invRefs) : [];
    const seatDocs = new Map<string, SeatDoc | undefined>();
    seatRefs.forEach((ref, i) => seatDocs.set(ref.id, data<SeatDoc>(snaps[i]!)));
    const invDocs = new Map<string, InventoryDoc | undefined>();
    invRefs.forEach((ref, i) => invDocs.set(ref.id, data<InventoryDoc>(snaps[seatRefs.length + i]!)));

    // --- Cek ketersediaan ---
    const taken = input.items
      .filter((i) => i.seatId)
      .filter((i) => !isSeatAvailable(seatDocs.get(seatDocId(event.id, i.seatId!)), !!seatsById.get(i.seatId!)?.seedSold, now, uid))
      .map((i) => i.seatId!);
    if (taken.length) {
      throw new HttpError(409, `Kursi ${taken.join(", ")} baru saja diambil orang lain.`, { takenSeatIds: taken });
    }

    // Hold festival: buang yang kedaluwarsa dan milik order lama pengguna ini.
    const nextInv = new Map<string, InventoryDoc>();
    for (const catId of invCats) {
      const id = invDocId(event.id, catId);
      const cur = invDocs.get(id);
      const holds = Object.fromEntries(Object.entries(pruneExpiredHolds(cur?.holds ?? {}, now)).filter(([orderId]) => !oldIds.has(orderId)));
      nextInv.set(id, { eventId: event.id, categoryId: catId, sold: cur?.sold ?? 0, holds });
    }
    for (const item of input.items.filter((i) => !i.seatId)) {
      const cat = event.categories.find((c) => c.id === item.categoryId)!;
      const inv = nextInv.get(invDocId(event.id, cat.id))!;
      const left = festivalRemaining(cat, inv, now);
      if (left < item.qty) {
        throw new HttpError(422, left ? `Sisa tiket ${cat.name} tinggal ${left}.` : `Tiket ${cat.name} sudah habis.`);
      }
      inv.holds[orderRef.id] = { qty: item.qty, uid, expiresAt };
    }

    // --- Tulis ---
    const newSeatIds = new Set(input.items.filter((i) => i.seatId).map((i) => seatDocId(event.id, i.seatId!)));
    for (const old of oldOrders) {
      tx.update(db.collection("orders").doc(old.id), { status: "cancelled" });
      for (const item of old.items) {
        if (!item.seatId) continue;
        const id = seatDocId(event.id, item.seatId);
        const doc = seatDocs.get(id);
        if (!newSeatIds.has(id) && doc?.status === "held" && doc.orderId === old.id) tx.delete(db.collection("seats").doc(id));
      }
    }
    for (const id of newSeatIds) {
      const seatId = id.slice(event.id.length + 1);
      const doc: SeatDoc = { eventId: event.id, seatId, status: "held", uid, orderId: orderRef.id, holdExpiresAt: expiresAt };
      tx.set(db.collection("seats").doc(id), doc);
    }
    for (const [id, inv] of nextInv) tx.set(db.collection("inventory").doc(id), inv);

    const order: OrderDoc = {
      id: orderRef.id,
      uid,
      eventId: event.id,
      items: input.items,
      status: "pending",
      total,
      holdExpiresAt: expiresAt,
      createdAt: now,
    };
    tx.set(orderRef, order);
    return expiresAt;
  });

  return { orderId: orderRef.id, holdExpiresAt, serverNow: Date.now(), total };
}

type PayOutcome = { kind: "paid"; ticketIds: string[] } | { kind: "expired" };

/** Simulasi pembayaran. `fail` meniru pembayaran ditolak: order tetap pending dan kursi tetap ditahan. */
export async function payOrder(uid: string, orderId: string, body: PayOrderInput, fail: boolean): Promise<PayOrderResult> {
  const db = adminDb();
  const orderRef = db.collection("orders").doc(orderId);

  if (fail) {
    const snap = await orderRef.get();
    const order = data<OrderDoc>(snap);
    assertPayable(order, uid);
    if (order!.holdExpiresAt <= Date.now()) {
      await orderRef.update({ status: "expired" });
      throw new HttpError(410, "Waktu pembayaran habis. Kursi sudah dilepas.");
    }
    await orderRef.update({ buyer: body.buyer, method: body.method });
    throw new HttpError(402, "Pembayaran ditolak oleh penyedia (simulasi). Kursimu masih ditahan, silakan coba lagi.");
  }

  const outcome = await db.runTransaction<PayOutcome>(async (tx) => {
    const now = Date.now();
    const order = data<OrderDoc>(await tx.get(orderRef));
    assertPayable(order, uid);
    const o = order!;
    if (o.holdExpiresAt <= now) {
      tx.update(orderRef, { status: "expired" });
      return { kind: "expired" };
    }

    const seatRefs = o.items.filter((i) => i.seatId).map((i) => db.collection("seats").doc(seatDocId(o.eventId, i.seatId!)));
    const invRefs = o.items.filter((i) => !i.seatId).map((i) => db.collection("inventory").doc(invDocId(o.eventId, i.categoryId)));
    const snaps = seatRefs.length + invRefs.length ? await tx.getAll(...seatRefs, ...invRefs) : [];
    seatRefs.forEach((_ref, i) => {
      const doc = data<SeatDoc>(snaps[i]!);
      if (doc?.orderId !== o.id || doc.status !== "held") throw new HttpError(409, "Kursi pada pesanan ini sudah tidak ditahan.");
    });

    seatRefs.forEach((ref) => tx.update(ref, { status: "sold" }));
    invRefs.forEach((ref, i) => {
      const inv = data<InventoryDoc>(snaps[seatRefs.length + i]!);
      const item = o.items.filter((it) => !it.seatId)[i]!;
      const holds = { ...(inv?.holds ?? {}) };
      delete holds[o.id];
      tx.set(ref, { eventId: o.eventId, categoryId: item.categoryId, sold: (inv?.sold ?? 0) + item.qty, holds } satisfies InventoryDoc);
    });

    const ticketIds: string[] = [];
    for (const item of o.items) {
      for (let n = 0; n < item.qty; n++) {
        const ref = db.collection("tickets").doc();
        const ticket: TicketDoc = {
          id: ref.id,
          orderId: o.id,
          uid,
          eventId: o.eventId,
          categoryId: item.categoryId,
          ...(item.seatId ? { seatLabel: item.seatId } : {}),
          qrPayload: signTicket(ref.id),
          createdAt: now,
        };
        tx.set(ref, ticket);
        ticketIds.push(ref.id);
      }
    }
    tx.update(orderRef, { status: "paid", buyer: body.buyer, method: body.method, paidAt: now });
    return { kind: "paid", ticketIds };
  });

  if (outcome.kind === "expired") throw new HttpError(410, "Waktu pembayaran habis. Kursi sudah dilepas.");
  return { ticketIds: outcome.ticketIds };
}

function assertPayable(order: OrderDoc | undefined, uid: string) {
  if (!order || order.uid !== uid) throw new HttpError(404, "Pesanan tidak ditemukan.");
  if (order.status === "paid") throw new HttpError(409, "Pesanan ini sudah dibayar.");
  if (order.status !== "pending") throw new HttpError(410, "Pesanan ini sudah tidak berlaku. Silakan pilih kursi lagi.");
}

export type TicketView = TicketDoc & { order: Pick<OrderDoc, "buyer" | "paidAt" | "total"> };

/** Tiket dan order milik pengguna (diurutkan di memori agar tidak perlu composite index). */
export async function listTickets(uid: string): Promise<{ tickets: TicketView[]; orders: OrderDoc[] }> {
  const db = adminDb();
  const [ticketSnap, orderSnap] = await Promise.all([
    db.collection("tickets").where("uid", "==", uid).get(),
    db.collection("orders").where("uid", "==", uid).get(),
  ]);
  const orders = orderSnap.docs.map((d) => d.data() as OrderDoc).sort((a, b) => b.createdAt - a.createdAt);
  const byId = new Map(orders.map((o) => [o.id, o]));
  const tickets = ticketSnap.docs
    .map((d) => d.data() as TicketDoc)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((t) => {
      const o = byId.get(t.orderId);
      return { ...t, order: { buyer: o?.buyer, paidAt: o?.paidAt, total: o?.total ?? 0 } };
    });
  return { tickets, orders };
}

