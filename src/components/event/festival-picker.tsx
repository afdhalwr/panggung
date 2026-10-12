"use client";

import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { OrderBar } from "@/components/checkout/order-bar";
import { useStartHold } from "@/components/checkout/use-start-hold";
import { useCart } from "@/features/cart/store";
import { useSeatStatus } from "@/features/seats/use-seat-status";
import { rupiah } from "@/lib/format";
import { describeOrder } from "@/lib/order-info";
import { festivalRemaining, MAX_PER_ORDER } from "@/lib/rules";
import type { Event } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** Pemilih jumlah tiket untuk kategori festival (tanpa nomor kursi). Sisa kuota real-time dari Firestore. */
export function FestivalPicker({ event, venueName }: { event: Event; venueName: string }) {
  const { inventory, now } = useSeatStatus(event.id);
  const cartEvent = useCart((s) => s.eventId);
  const selection = useCart((s) => s.selection);
  const setQty = useCart((s) => s.setQty);
  const { start, busy } = useStartHold(event.id, `/events/${event.slug}/seats`, () => describeOrder(event, venueName, useCart.getState().selection));
  const mine = cartEvent === event.id ? selection : [];
  const qtyOf = (id: string) => mine.find((i) => i.categoryId === id)?.qty ?? 0;

  function change(categoryId: string, qty: number, left: number) {
    if (qty > left) return toast.error("Sisa tiket tidak cukup.");
    if (setQty(event.id, categoryId, Math.max(0, qty)) === "limit") toast.error(`Maksimal ${MAX_PER_ORDER} tiket per pesanan.`);
  }

  const total = mine.reduce((sum, i) => sum + (event.categories.find((c) => c.id === i.categoryId)?.price ?? 0) * i.qty, 0);
  const count = mine.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ul className="flex flex-col gap-3">
        {event.categories.map((c) => {
          const left = festivalRemaining(c, inventory.get(c.id), now);
          const qty = qtyOf(c.id);
          return (
            <li key={c.id} className={cn("flex items-center gap-4 rounded-[var(--radius-card)] border bg-surface p-5", qty ? "border-primary" : "border-line", !left && "opacity-50")}>
              <div className="flex-1">
                <p className="font-display text-xl font-bold">{c.name}</p>
                <p className="text-muted">{rupiah(c.price)}</p>
                {c.perks && <p className="mt-1 text-sm text-muted">{c.perks}</p>}
                <p className={cn("mt-1 text-xs font-semibold", left === 0 ? "text-muted" : left <= c.quota * 0.1 ? "text-accent" : "text-success")}>
                  {left === 0 ? "Habis" : `Sisa ${left.toLocaleString("id-ID")} tiket`}
                </p>
              </div>
              <div className="flex items-center gap-2" role="group" aria-label={`Jumlah tiket ${c.name}`}>
                <button
                  type="button"
                  onClick={() => change(c.id, qty - 1, left)}
                  disabled={!qty}
                  aria-label={`Kurangi tiket ${c.name}`}
                  className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40 [&_svg]:size-4"
                >
                  <Minus />
                </button>
                <span className="w-6 text-center text-lg font-bold" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => change(c.id, qty + 1, left)}
                  disabled={!left}
                  aria-label={`Tambah tiket ${c.name}`}
                  className="grid size-10 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40 [&_svg]:size-4"
                >
                  <Plus />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <OrderBar summary={count ? `${count} tiket` : "Belum ada tiket dipilih"} total={total} disabled={!count} busy={busy} onContinue={() => void start()} />
      </aside>
    </div>
  );
}
