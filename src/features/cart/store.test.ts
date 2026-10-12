import { beforeEach, describe, expect, it } from "vitest";
import { useCart } from "./store";

const seat = (id: string, categoryId = "vip") => ({ id, categoryId });

beforeEach(() => {
  useCart.getState().reset();
});

describe("cart store", () => {
  it("menambah dan melepas kursi dengan toggle", () => {
    const { toggleSeat } = useCart.getState();
    expect(toggleSeat("e1", seat("A1"))).toBe("added");
    expect(useCart.getState().selection).toEqual([{ categoryId: "vip", seatId: "A1", qty: 1 }]);
    expect(toggleSeat("e1", seat("A1"))).toBe("removed");
    expect(useCart.getState().selection).toEqual([]);
  });

  it("menolak kursi ke-5", () => {
    const { toggleSeat } = useCart.getState();
    for (const id of ["A1", "A2", "A3", "A4"]) toggleSeat("e1", seat(id));
    expect(toggleSeat("e1", seat("A5"))).toBe("limit");
    expect(useCart.getState().selection).toHaveLength(4);
  });

  it("mengosongkan pilihan saat pindah ke event lain", () => {
    const { toggleSeat } = useCart.getState();
    toggleSeat("e1", seat("A1"));
    toggleSeat("e2", seat("B1"));
    expect(useCart.getState().eventId).toBe("e2");
    expect(useCart.getState().selection.map((s) => s.seatId)).toEqual(["B1"]);
  });

  it("mengatur jumlah tiket festival dengan batas total 4", () => {
    const { setQty } = useCart.getState();
    setQty("e1", "festival", 3);
    expect(setQty("e1", "vip-deck", 2)).toBe("limit");
    expect(setQty("e1", "vip-deck", 1)).toBe("ok");
    setQty("e1", "festival", 0);
    expect(useCart.getState().selection).toEqual([{ categoryId: "vip-deck", qty: 1 }]);
  });

  it("melepas kursi yang diambil orang lain", () => {
    const { toggleSeat, removeSeats } = useCart.getState();
    toggleSeat("e1", seat("A1"));
    toggleSeat("e1", seat("A2"));
    removeSeats(["A1"]);
    expect(useCart.getState().selection.map((s) => s.seatId)).toEqual(["A2"]);
  });

  it("menyimpan hold dan selisih jam server", () => {
    const { toggleSeat, startHold } = useCart.getState();
    toggleSeat("e1", seat("A1"));
    startHold({ orderId: "o1", holdExpiresAt: 10_600_000, serverNow: 10_000_000, total: 1_500_000 }, 9_990_000);
    const s = useCart.getState();
    expect(s.order).toMatchObject({ id: "o1", eventId: "e1", holdExpiresAt: 10_600_000, total: 1_500_000 });
    expect(s.order?.items).toEqual([{ categoryId: "vip", seatId: "A1", qty: 1 }]);
    expect(s.clockOffset).toBe(10_000);
  });

  it("reset mengosongkan semuanya termasuk isian checkout", () => {
    const { toggleSeat, saveBuyer, saveMethod, reset } = useCart.getState();
    toggleSeat("e1", seat("A1"));
    saveBuyer({ name: "Nadia", email: "n@contoh.id", phone: "081234567890" });
    saveMethod("va");
    reset();
    const s = useCart.getState();
    expect(s.selection).toEqual([]);
    expect(s.buyer).toBeUndefined();
    expect(s.method).toBeUndefined();
  });
});
