import { describe, expect, it } from "vitest";
import { buyerSchema, createOrderSchema } from "./schemas";

const valid = { name: "Nadia Putri", email: "nadia@contoh.id", phone: "081234567890", nik: "" };

describe("buyerSchema", () => {
  it("menerima data pemesan yang valid, NIK boleh kosong", () => {
    expect(buyerSchema.safeParse(valid).success).toBe(true);
  });
  it("menerima nomor HP berawalan +62", () => {
    expect(buyerSchema.safeParse({ ...valid, phone: "+6281234567890" }).success).toBe(true);
  });
  it("menolak nomor HP yang terlalu pendek", () => {
    expect(buyerSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });
  it("menolak NIK yang bukan 16 digit", () => {
    expect(buyerSchema.safeParse({ ...valid, nik: "123456789012345" }).success).toBe(false);
    expect(buyerSchema.safeParse({ ...valid, nik: "1234567890123456" }).success).toBe(true);
  });
  it("menolak email tidak valid dan nama terlalu pendek", () => {
    expect(buyerSchema.safeParse({ ...valid, email: "bukan-email" }).success).toBe(false);
    expect(buyerSchema.safeParse({ ...valid, name: "N" }).success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("menolak lebih dari 4 tiket", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ categoryId: "vip", seatId: `A${i}`, qty: 1 }));
    expect(createOrderSchema.safeParse({ eventId: "e1", items }).success).toBe(false);
  });
  it("menolak festival dengan qty 5", () => {
    expect(createOrderSchema.safeParse({ eventId: "e1", items: [{ categoryId: "f", qty: 5 }] }).success).toBe(false);
  });
  it("menerima pesanan kursi yang valid", () => {
    expect(
      createOrderSchema.safeParse({ eventId: "e1", items: [{ categoryId: "vip", seatId: "A1", qty: 1 }] }).success,
    ).toBe(true);
  });
});
