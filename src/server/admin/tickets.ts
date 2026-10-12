import "server-only";
import type { TicketCheck } from "@/lib/admin-schemas";
import { adminDb } from "@/lib/firebase/admin";
import type { OrderDoc, TicketDoc } from "@/lib/schemas";
import { getAllEvents } from "../catalog";
import { data } from "../orders";
import { verifyTicket } from "../qr";

/**
 * Ambil id tiket dari isi QR (`PANGGUNG.<id>.<hmac>`, tanda tangan dicek) atau dari kode yang diketik petugas
 * (id tiket yang tercetak di bawah QR). QR dengan tanda tangan salah dianggap tidak dikenal.
 */
export function ticketIdFromCode(code: string, secret?: string): string | null {
  const c = code.trim();
  if (c.startsWith("PANGGUNG.")) return verifyTicket(c, secret) ? c.split(".")[1]! : null;
  return /^[A-Za-z0-9]{10,40}$/.test(c) ? c : null;
}

/** Validasi di pintu masuk. Tiket sah langsung ditandai `usedAt`, jadi scan kedua menghasilkan "Sudah dipakai". */
export async function validateTicket(code: string): Promise<TicketCheck> {
  const id = ticketIdFromCode(code);
  if (!id) return { result: "unknown" };
  const db = adminDb();
  const outcome = await db.runTransaction(async (tx) => {
    const ref = db.collection("tickets").doc(id);
    const ticket = data<TicketDoc>(await tx.get(ref));
    if (!ticket) return null;
    const order = data<OrderDoc>(await tx.get(db.collection("orders").doc(ticket.orderId)));
    const base = { ticket, buyerName: order?.buyer?.name };
    if (ticket.refundedAt) return { ...base, result: "refunded" as const };
    if (ticket.usedAt) return { ...base, result: "used" as const };
    const usedAt = Date.now();
    tx.update(ref, { usedAt });
    return { ...base, ticket: { ...ticket, usedAt }, result: "valid" as const };
  });
  if (!outcome) return { result: "unknown" };

  const event = (await getAllEvents()).find((e) => e.id === outcome.ticket.eventId);
  const t = outcome.ticket;
  return {
    result: outcome.result,
    ticket: {
      id: t.id,
      eventTitle: event?.title ?? "Event terhapus",
      categoryName: event?.categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId,
      seatLabel: t.seatLabel,
      buyerName: outcome.buyerName,
      usedAt: t.usedAt,
    },
  };
}
