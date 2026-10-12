"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_PER_ORDER, type BuyerInput, type CreateOrderResult, type OrderItem, type PaymentMethod } from "@/lib/schemas";

/** Info tampilan yang ikut disimpan, supaya halaman checkout tidak perlu memuat seluruh data seed. */
export type OrderInfo = {
  title: string;
  slug: string;
  date: string;
  venue: string;
  lines: { label: string; price: number }[];
};

export type HeldOrder = {
  id: string;
  eventId: string;
  holdExpiresAt: number;
  total: number;
  items: OrderItem[];
  info: OrderInfo;
};

type CartState = {
  eventId?: string;
  selection: OrderItem[];
  order?: HeldOrder;
  /** serverNow − Date.now() saat hold dibuat; dipakai agar countdown tidak tergantung jam HP. */
  clockOffset: number;
  buyer?: BuyerInput;
  method?: PaymentMethod;

  toggleSeat: (eventId: string, seat: { id: string; categoryId: string }) => "added" | "removed" | "limit";
  setQty: (eventId: string, categoryId: string, qty: number) => "ok" | "limit";
  removeSeats: (seatIds: string[]) => void;
  startHold: (result: CreateOrderResult, info: OrderInfo, clientNow?: number) => void;
  saveBuyer: (buyer: BuyerInput) => void;
  saveMethod: (method: PaymentMethod) => void;
  reset: () => void;
};

const empty = { eventId: undefined, selection: [], order: undefined, clockOffset: 0, buyer: undefined, method: undefined };

const countTickets = (items: OrderItem[]) => items.reduce((n, i) => n + i.qty, 0);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      ...empty,

      toggleSeat(eventId, seat) {
        const selection = get().eventId === eventId ? get().selection : [];
        if (selection.some((i) => i.seatId === seat.id)) {
          set({ eventId, selection: selection.filter((i) => i.seatId !== seat.id) });
          return "removed";
        }
        if (countTickets(selection) >= MAX_PER_ORDER) return "limit";
        set({ eventId, selection: [...selection, { categoryId: seat.categoryId, seatId: seat.id, qty: 1 }] });
        return "added";
      },

      setQty(eventId, categoryId, qty) {
        const others = (get().eventId === eventId ? get().selection : []).filter((i) => i.categoryId !== categoryId);
        if (countTickets(others) + qty > MAX_PER_ORDER) return "limit";
        set({ eventId, selection: qty > 0 ? [...others, { categoryId, qty }] : others });
        return "ok";
      },

      removeSeats(seatIds) {
        set({ selection: get().selection.filter((i) => !i.seatId || !seatIds.includes(i.seatId)) });
      },

      startHold(result, info, clientNow = Date.now()) {
        const { eventId, selection } = get();
        if (!eventId) return;
        set({
          order: { id: result.orderId, eventId, holdExpiresAt: result.holdExpiresAt, total: result.total, items: selection, info },
          clockOffset: result.serverNow - clientNow,
        });
      },

      saveBuyer: (buyer) => set({ buyer }),
      saveMethod: (method) => set({ method }),
      reset: () => set({ ...empty }),
    }),
    {
      name: "panggung-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ eventId, selection, order, clockOffset, buyer, method }) => ({ eventId, selection, order, clockOffset, buyer, method }),
    },
  ),
);

/** Waktu "sekarang" menurut server, berdasarkan selisih yang dicatat saat hold. */
export function serverNow(): number {
  return Date.now() + useCart.getState().clockOffset;
}
