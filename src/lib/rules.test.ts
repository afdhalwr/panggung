import { describe, expect, it } from "vitest";
import {
  availabilityLabel,
  computeTotal,
  effectiveOrderStatus,
  effectiveSeatStatus,
  festivalRemaining,
  isSeatAvailable,
  pruneExpiredHolds,
  remainingMs,
} from "./rules";
import type { Event, InventoryDoc, SeatDoc, TicketCategory } from "./schemas";

const NOW = 1_800_000_000_000;

const held = (over: Partial<SeatDoc> = {}): SeatDoc => ({
  eventId: "e1",
  seatId: "A1",
  status: "held",
  uid: "orang-lain",
  orderId: "o1",
  holdExpiresAt: NOW + 60_000,
  ...over,
});

describe("isSeatAvailable", () => {
  it("tersedia bila belum ada dokumen dan tidak terjual di seed", () => {
    expect(isSeatAvailable(undefined, false, NOW)).toBe(true);
  });
  it("tidak tersedia bila terjual di seed", () => {
    expect(isSeatAvailable(undefined, true, NOW)).toBe(false);
  });
  it("tidak tersedia bila ditahan orang lain dan belum kedaluwarsa", () => {
    expect(isSeatAvailable(held(), false, NOW, "saya")).toBe(false);
  });
  it("tersedia lagi bila hold sudah kedaluwarsa", () => {
    expect(isSeatAvailable(held({ holdExpiresAt: NOW - 1 }), false, NOW, "saya")).toBe(true);
  });
  it("tersedia bila ditahan oleh pengguna yang sama", () => {
    expect(isSeatAvailable(held({ uid: "saya" }), false, NOW, "saya")).toBe(true);
  });
  it("tidak tersedia bila sudah terjual di Firestore", () => {
    expect(isSeatAvailable(held({ status: "sold", uid: "saya" }), false, NOW, "saya")).toBe(false);
  });
});

describe("effectiveSeatStatus", () => {
  it("memetakan dokumen dan seed ke status tampilan", () => {
    expect(effectiveSeatStatus(undefined, false, NOW)).toBe("available");
    expect(effectiveSeatStatus(undefined, true, NOW)).toBe("sold");
    expect(effectiveSeatStatus(held(), false, NOW)).toBe("held");
    expect(effectiveSeatStatus(held({ holdExpiresAt: NOW }), false, NOW)).toBe("available");
    expect(effectiveSeatStatus(held({ status: "sold" }), false, NOW)).toBe("sold");
  });
});

const cat = (over: Partial<TicketCategory> = {}): TicketCategory => ({
  id: "vip",
  name: "VIP",
  price: 1_500_000,
  type: "seated",
  quota: 100,
  sold: 0,
  ...over,
});

const event = {
  id: "e1",
  categories: [cat(), cat({ id: "fest", name: "Festival", price: 350_000, type: "festival" })],
} as unknown as Event;

describe("computeTotal", () => {
  it("menjumlahkan harga dari data seed, bukan dari klien", () => {
    expect(
      computeTotal(event, [
        { categoryId: "vip", qty: 2 },
        { categoryId: "fest", qty: 1 },
      ]),
    ).toBe(3_350_000);
  });
  it("melempar error untuk kategori yang tidak dikenal", () => {
    expect(() => computeTotal(event, [{ categoryId: "palsu", qty: 1 }])).toThrow();
  });
});

describe("pruneExpiredHolds & festivalRemaining", () => {
  const holds: InventoryDoc["holds"] = {
    o1: { qty: 2, uid: "a", expiresAt: NOW + 1000 },
    o2: { qty: 3, uid: "b", expiresAt: NOW - 1 },
  };
  it("membuang hold yang sudah kedaluwarsa", () => {
    expect(Object.keys(pruneExpiredHolds(holds, NOW))).toEqual(["o1"]);
  });
  it("menghitung sisa kuota = kuota − terjual seed − terjual − hold aktif", () => {
    const c = cat({ type: "festival", quota: 10, sold: 3 });
    const inv: InventoryDoc = { eventId: "e1", categoryId: "vip", sold: 1, holds };
    expect(festivalRemaining(c, inv, NOW)).toBe(10 - 3 - 1 - 2);
    expect(festivalRemaining(c, undefined, NOW)).toBe(7);
  });
});

describe("remainingMs", () => {
  it("tidak pernah negatif", () => {
    expect(remainingMs(NOW + 5000, NOW)).toBe(5000);
    expect(remainingMs(NOW - 5000, NOW)).toBe(0);
  });
});

describe("effectiveOrderStatus", () => {
  it("order pending yang lewat waktu dianggap kedaluwarsa", () => {
    expect(effectiveOrderStatus({ status: "pending", holdExpiresAt: NOW - 1 }, NOW)).toBe("expired");
    expect(effectiveOrderStatus({ status: "pending", holdExpiresAt: NOW + 1 }, NOW)).toBe("pending");
    expect(effectiveOrderStatus({ status: "paid", holdExpiresAt: NOW - 1 }, NOW)).toBe("paid");
  });
});

describe("availabilityLabel", () => {
  it("Habis, Hampir habis (sisa ≤ 10%), atau Tersedia", () => {
    expect(availabilityLabel(cat({ quota: 100, sold: 100 }))).toBe("Habis");
    expect(availabilityLabel(cat({ quota: 100, sold: 90 }))).toBe("Hampir habis");
    expect(availabilityLabel(cat({ quota: 100, sold: 50 }))).toBe("Tersedia");
  });
});
