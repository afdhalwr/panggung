import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secretFromEnv(): string {
  const s = process.env.TICKET_QR_SECRET;
  if (!s) throw new Error("TICKET_QR_SECRET belum diatur");
  return s;
}

function sign(ticketId: string, secret: string): string {
  return createHmac("sha256", secret).update(ticketId).digest("hex").slice(0, 16);
}

/** Isi QR: `PANGGUNG.<ticketId>.<HMAC 16 hex>`. Petugas pintu bisa mendeteksi QR palsu tanpa database. */
export function signTicket(ticketId: string, secret = secretFromEnv()): string {
  return `PANGGUNG.${ticketId}.${sign(ticketId, secret)}`;
}

export function verifyTicket(payload: string, secret = secretFromEnv()): boolean {
  const m = /^PANGGUNG\.([A-Za-z0-9]+)\.([0-9a-f]{16})$/.exec(payload);
  if (!m) return false;
  const expected = Buffer.from(sign(m[1]!, secret));
  const given = Buffer.from(m[2]!);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
