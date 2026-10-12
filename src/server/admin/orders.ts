import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { canRefund, effectiveOrderStatus } from "@/lib/rules";
import type { InventoryDoc, OrderDoc, OrderStatus, SeatDoc, TicketDoc } from "@/lib/schemas";
import { getAllEvents } from "../catalog";
import { readEventTx } from "../events-store";
import { HttpError } from "../http";
import { data, invDocId, seatDocId } from "../orders";

export type AdminOrderRow = {
  id: string;
  createdAt: number;
  paidAt?: number;
  eventId: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  tickets: number;
  total: number;
  /** Status efektif: order pending yang lewat batas waktu tampil sebagai kedaluwarsa. */
  status: OrderStatus;
};

export type AdminOrderDetail = AdminOrderRow & {
  order: OrderDoc;
  eventSlug: string;
  eventDate: string;
  ticketList: Pick<TicketDoc, "id" | "categoryId" | "seatLabel" | "usedAt" | "refundedAt">[];
  categoryNames: Record<string, string>;
  refundable: boolean;
};

async function eventMap() {
  return new Map((await getAllEvents()).map((e) => [e.id, e]));
}

function toRow(o: OrderDoc, title: string, now: number): AdminOrderRow {
  return {
    id: o.id,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    eventId: o.eventId,
    eventTitle: title,
    buyerName: o.buyer?.name ?? "—",
    buyerEmail: o.buyer?.email ?? "",
    tickets: o.items.reduce((n, i) => n + i.qty, 0),
    total: o.total,
    status: effectiveOrderStatus(o, now),
  };
}

/** Semua pesanan, terbaru dulu. Pencarian, filter, dan pagination dilakukan tabel di klien. */
export async function listOrders(): Promise<AdminOrderRow[]> {
  const [events, snap] = await Promise.all([eventMap(), adminDb().collection("orders").get()]);
  const now = Date.now();
  return snap.docs
    .map((d) => d.data() as OrderDoc)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((o) => toRow(o, events.get(o.eventId)?.title ?? "Event terhapus", now));
}

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const db = adminDb();
  const [events, snap, tickets] = await Promise.all([
    eventMap(),
    db.collection("orders").doc(id).get(),
    db.collection("tickets").where("orderId", "==", id).get(),
  ]);
  const order = data<OrderDoc>(snap);
  if (!order) return null;
  const event = events.get(order.eventId);
  const now = Date.now();
  return {
    ...toRow(order, event?.title ?? "Event terhapus", now),
    order,
    eventSlug: event?.slug ?? "",
    eventDate: event?.date ?? "",
    ticketList: tickets.docs
      .map((d) => d.data() as TicketDoc)
      .map(({ id, categoryId, seatLabel, usedAt, refundedAt }) => ({ id, categoryId, seatLabel, usedAt, refundedAt }))
      .sort((a, b) => (a.seatLabel ?? a.id).localeCompare(b.seatLabel ?? b.id, "id", { numeric: true })),
    categoryNames: Object.fromEntries((event?.categories ?? []).map((c) => [c.id, c.name])),
    refundable: !!event && canRefund(order, event.date, now),
  };
}

/**
 * Refund simulasi dalam satu transaction: order → refunded, tiket ditandai refund (QR-nya ditolak saat validasi),
 * kursi dilepas agar bisa dijual lagi, dan jumlah terjual festival dikurangi.
 */
export async function refundOrder(id: string): Promise<void> {
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const now = Date.now();
    const orderRef = db.collection("orders").doc(id);
    const order = data<OrderDoc>(await tx.get(orderRef));
    if (!order) throw new HttpError(404, "Pesanan tidak ditemukan.");
    if (order.status === "refunded") throw new HttpError(409, "Pesanan ini sudah direfund.");
    if (order.status !== "paid") throw new HttpError(422, "Hanya pesanan lunas yang bisa direfund.");
    const event = await readEventTx(tx, order.eventId);
    if (event && !canRefund(order, event.date, now)) throw new HttpError(422, "Konser sudah berlangsung, pesanan tidak bisa direfund.");

    const tickets = await tx.get(db.collection("tickets").where("orderId", "==", id));
    const seatItems = order.items.filter((i) => i.seatId);
    const festItems = order.items.filter((i) => !i.seatId);
    const seatRefs = seatItems.map((i) => db.collection("seats").doc(seatDocId(order.eventId, i.seatId!)));
    const invRefs = festItems.map((i) => db.collection("inventory").doc(invDocId(order.eventId, i.categoryId)));
    const snaps = seatRefs.length + invRefs.length ? await tx.getAll(...seatRefs, ...invRefs) : [];

    seatRefs.forEach((ref, i) => {
      const doc = data<SeatDoc>(snaps[i]!);
      // Hanya lepas kursi yang memang milik pesanan ini.
      if (doc?.status === "sold" && doc.orderId === id) tx.delete(ref);
    });
    // Beberapa item festival bisa memakai kategori yang sama: kurangi per dokumen sekali saja.
    const minus = new Map<string, number>();
    festItems.forEach((item, i) => minus.set(invRefs[i]!.path, (minus.get(invRefs[i]!.path) ?? 0) + item.qty));
    const seen = new Set<string>();
    invRefs.forEach((ref, i) => {
      if (seen.has(ref.path)) return;
      seen.add(ref.path);
      const inv = data<InventoryDoc>(snaps[seatRefs.length + i]!);
      if (inv) tx.update(ref, { sold: Math.max(0, inv.sold - minus.get(ref.path)!) });
    });

    tickets.docs.forEach((d) => tx.update(d.ref, { refundedAt: now }));
    tx.update(orderRef, { status: "refunded", refundedAt: now });
  });
}
