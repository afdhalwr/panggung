"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { OrderBar } from "@/components/checkout/order-bar";
import { useStartHold } from "@/components/checkout/use-start-hold";
import { useAuth } from "@/features/auth/auth-provider";
import { useCart } from "@/features/cart/store";
import { useSeatStatus } from "@/features/seats/use-seat-status";
import { rupiah } from "@/lib/format";
import { describeOrder } from "@/lib/order-info";
import { effectiveSeatStatus, isSeatAvailable, MAX_PER_ORDER } from "@/lib/rules";
import type { Event, Venue } from "@/lib/schemas";
import { categoryColor } from "@/lib/seat-colors";
import { SeatLegend } from "./seat-legend";
import { SeatMap, type SeatView } from "./seat-map";

export function SeatPicker({ event, venue }: { event: Event; venue: Venue }) {
  const { user } = useAuth();
  const { seats: docs, ready, error, now } = useSeatStatus(event.id);
  const cartEvent = useCart((s) => s.eventId);
  const selection = useCart((s) => s.selection);
  const toggleSeat = useCart((s) => s.toggleSeat);
  const removeSeats = useCart((s) => s.removeSeats);
  const { start, busy } = useStartHold(event.id, `/events/${event.slug}/seats`, () => describeOrder(event, venue.name, useCart.getState().selection));

  const mine = useMemo(() => (cartEvent === event.id ? selection : []), [cartEvent, event.id, selection]);
  const selectedIds = useMemo(() => new Set(mine.map((i) => i.seatId)), [mine]);
  const seatDefs = useMemo(() => venue.seats ?? [], [venue.seats]);

  const categories = useMemo(
    () => event.categories.filter((c) => c.type === "seated").map((c) => ({ id: c.id, name: c.name, price: c.price, color: categoryColor(c.id) })),
    [event.categories],
  );

  const views: SeatView[] = useMemo(
    () =>
      seatDefs.map((s) => {
        const doc = docs.get(s.id);
        // Kursi yang sedang ditahan oleh pengguna ini sendiri tetap boleh dipilih ulang.
        const ownHold = !!user && doc?.status === "held" && doc.uid === user.uid;
        let status: SeatView["status"] = ownHold ? "available" : effectiveSeatStatus(doc, !!s.seedSold, now);
        if (selectedIds.has(s.id) && status === "available") status = "selected";
        return { ...s, status };
      }),
    [seatDefs, docs, now, selectedIds, user],
  );

  // Kursi pilihan yang baru saja diambil orang lain dilepas otomatis.
  const warned = useRef(new Set<string>());
  useEffect(() => {
    if (!ready) return;
    const lost = mine
      .filter((i) => i.seatId)
      .filter((i) => {
        const def = seatDefs.find((s) => s.id === i.seatId);
        return !isSeatAvailable(docs.get(i.seatId!), !!def?.seedSold, now, user?.uid);
      })
      .map((i) => i.seatId!);
    if (lost.length) {
      removeSeats(lost);
      const fresh = lost.filter((id) => !warned.current.has(id));
      fresh.forEach((id) => warned.current.add(id));
      if (fresh.length) toast.warning(`Kursi ${fresh.join(", ")} baru saja diambil orang lain`, { description: "Sudah kami lepas dari pilihanmu." });
    }
  }, [ready, docs, now, mine, seatDefs, removeSeats, user]);

  function onToggle(seat: SeatView) {
    if (toggleSeat(event.id, seat) === "limit") toast.error(`Maksimal ${MAX_PER_ORDER} kursi per pesanan.`);
  }

  const total = mine.reduce((sum, i) => sum + (event.categories.find((c) => c.id === i.categoryId)?.price ?? 0) * i.qty, 0);
  const summary = mine.length ? `${mine.length} kursi · ${mine.map((i) => i.seatId).join(", ")}` : "Belum ada kursi dipilih";

  const remaining = useMemo(() => {
    const r: Record<string, number> = {};
    for (const v of views) if (v.status === "available" || v.status === "selected") r[v.categoryId] = (r[v.categoryId] ?? 0) + 1;
    return r;
  }, [views]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <SeatLegend categories={categories} remaining={remaining} />
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Status kursi gagal dimuat. Periksa koneksi lalu muat ulang halaman.
          </p>
        )}
        <div data-seat-map aria-busy={!ready} className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {!ready && <div className="absolute inset-0 z-10 animate-pulse bg-surface/60" aria-hidden />}
          <TransformWrapper minScale={1} maxScale={4} initialScale={1} centerOnInit doubleClick={{ mode: "zoomIn" }} wheel={{ activationKeys: ["Control", "Meta"] }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
                  <ZoomButton label="Perbesar denah" onClick={() => zoomIn()}>
                    <Plus />
                  </ZoomButton>
                  <ZoomButton label="Perkecil denah" onClick={() => zoomOut()}>
                    <Minus />
                  </ZoomButton>
                  <ZoomButton label="Kembalikan ukuran denah" onClick={() => resetTransform()}>
                    <RotateCcw />
                  </ZoomButton>
                </div>
                <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                  <div className="w-full min-w-[600px] p-2 sm:min-w-0">
                    <SeatMap seats={views} width={venue.width ?? 760} height={venue.height ?? 600} categories={categories} onToggle={onToggle} />
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
        <p className="text-sm text-muted">
          Cubit atau ketuk dua kali untuk memperbesar. Dengan keyboard: Tab ke denah, panah untuk pindah kursi, Enter untuk memilih.
        </p>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {mine.length > 0 && (
          <ul className="mb-3 hidden flex-col gap-2 lg:flex">
            {mine.map((i) => {
              const cat = categories.find((c) => c.id === i.categoryId);
              return (
                <li key={i.seatId} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">Kursi {i.seatId}</span> · {cat?.name}
                  </span>
                  <span className="text-muted">{cat && rupiah(cat.price)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <OrderBar summary={summary} total={total} disabled={!mine.length} busy={busy} onContinue={() => void start()} />
      </aside>
    </div>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-10 place-items-center rounded-xl border border-line bg-elevated text-fg hover:border-primary [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
