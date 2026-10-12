import { describe, expect, it } from "vitest";
import { signTicket } from "../qr";
import { ticketIdFromCode } from "./tickets";

const SECRET = "rahasia-uji";

describe("ticketIdFromCode", () => {
  it("menerima isi QR bertanda tangan sah", () => {
    expect(ticketIdFromCode(signTicket("Tkt123abcXYZ", SECRET), SECRET)).toBe("Tkt123abcXYZ");
  });
  it("menolak QR dengan tanda tangan palsu atau rahasia lain", () => {
    expect(ticketIdFromCode("PANGGUNG.Tkt123abcXYZ.0000000000000000", SECRET)).toBeNull();
    expect(ticketIdFromCode(signTicket("Tkt123abcXYZ", "rahasia-lain"), SECRET)).toBeNull();
  });
  it("menerima kode tiket yang diketik petugas, dengan spasi di tepi", () => {
    expect(ticketIdFromCode("  Tkt123abcXYZ  ", SECRET)).toBe("Tkt123abcXYZ");
  });
  it("menolak kode yang bukan bentuk id tiket", () => {
    expect(ticketIdFromCode("abc", SECRET)).toBeNull();
    expect(ticketIdFromCode("Tkt-123/../x", SECRET)).toBeNull();
  });
});
