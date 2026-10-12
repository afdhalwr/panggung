import type { OrderInfo } from "@/features/cart/store";
import type { Event, OrderItem } from "./schemas";

/** Ringkasan pesanan untuk ditampilkan di checkout (harga resmi tetap dihitung server). */
export function describeOrder(event: Event, venueName: string, items: OrderItem[]): OrderInfo {
  return {
    title: event.title,
    slug: event.slug,
    date: event.date,
    venue: venueName,
    lines: items.map((i) => {
      const cat = event.categories.find((c) => c.id === i.categoryId);
      const name = cat?.name ?? i.categoryId;
      return {
        label: i.seatId ? `${name} · Kursi ${i.seatId}` : `${name} × ${i.qty}`,
        price: (cat?.price ?? 0) * i.qty,
      };
    }),
  };
}
