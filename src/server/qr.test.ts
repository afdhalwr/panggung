import { describe, expect, it } from "vitest";
import { signTicket, verifyTicket } from "./qr";

const SECRET = "rahasia-test";

describe("QR tiket", () => {
  it("payload berformat PANGGUNG.<id>.<tanda tangan> dan bisa diverifikasi", () => {
    const payload = signTicket("tkt123", SECRET);
    expect(payload).toMatch(/^PANGGUNG\.tkt123\.[0-9a-f]{16}$/);
    expect(verifyTicket(payload, SECRET)).toBe(true);
  });
  it("menolak payload yang diubah", () => {
    const payload = signTicket("tkt123", SECRET);
    expect(verifyTicket(payload.replace("tkt123", "tkt124"), SECRET)).toBe(false);
    expect(verifyTicket(payload.slice(0, -1) + "0", SECRET)).toBe(payload.endsWith("0"));
  });
  it("menolak payload yang ditandatangani dengan kunci lain", () => {
    expect(verifyTicket(signTicket("tkt123", "kunci-lain"), SECRET)).toBe(false);
  });
  it("menolak format yang tidak dikenal", () => {
    expect(verifyTicket("bukan-qr", SECRET)).toBe(false);
  });
});
