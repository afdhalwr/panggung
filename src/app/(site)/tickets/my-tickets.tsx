"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Ticket } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TicketCard } from "@/components/ticket/ticket-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/features/cart/store";
import { useTickets } from "@/features/orders/use-tickets";
import { formatDate, rupiah } from "@/lib/format";
import { effectiveOrderStatus } from "@/lib/rules";
import type { OrderStatus, OrderView, TicketView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  paid: { label: "Lunas", cls: "text-success" },
  pending: { label: "Menunggu pembayaran", cls: "text-seat-held" },
  expired: { label: "Kedaluwarsa", cls: "text-muted" },
  cancelled: { label: "Dibatalkan", cls: "text-muted" },
  failed: { label: "Gagal", cls: "text-danger" },
  refunded: { label: "Direfund", cls: "text-muted" },
};

export function MyTickets() {
  const { data, isPending, isError, refetch } = useTickets();
  const activeOrderId = useCart((s) => s.order?.id);
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);

  if (isPending) {
    return (
      <Shell>
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </Shell>
    );
  }
  if (isError) {
    return (
      <Shell>
        <div role="alert" className="rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 p-6">
          <p className="font-semibold">Tiket gagal dimuat.</p>
          <p className="mt-1 text-sm text-muted">Tiketmu aman tersimpan. Periksa koneksi lalu coba lagi.</p>
          <Button className="mt-4" variant="secondary" onClick={() => void refetch()}>
            Coba lagi
          </Button>
        </div>
      </Shell>
    );
  }

  // Tiket yang direfund tidak lagi berlaku; pesanannya tetap tampil di riwayat dengan status Direfund.
  const groups = groupByOrder(data.tickets.filter((t) => !t.refundedAt));
  const history = data.orders.filter((o) => o.status !== "paid");

  return (
    <Shell>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-16 text-center">
          <Ticket className="size-10 text-muted" aria-hidden />
          <h2 className="font-display text-2xl font-bold">Belum ada tiket</h2>
          <p className="max-w-sm text-muted">Tiket yang sudah dibayar akan muncul di sini, lengkap dengan QR untuk pintu masuk.</p>
          <Button asChild>
            <Link href="/events">Cari konser</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(({ orderId, tickets }) => (
            <section key={orderId} aria-label={tickets[0]!.event.title}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-bold">{tickets[0]!.event.title}</h2>
                <span className="text-sm text-muted">{tickets.length} tiket</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tickets.map((t, i) => (
                  <Reveal key={t.id} index={i}>
                  <Link href={`/tickets/${t.id}`} className="lift group block rounded-[var(--radius-card)]">
                    <TicketCard ticket={t} compact />
                    <span className="mt-2 flex items-center gap-1 px-1 text-sm font-semibold text-primary group-hover:underline">
                      Lihat QR <ChevronRight className="size-4" />
                    </span>
                  </Link>
                  </Reveal>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section aria-labelledby="riwayat" className="mt-14">
          <h2 id="riwayat" className="mb-3 font-display text-xl font-bold">
            Riwayat pesanan lain
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {history.map((o) => (
              <HistoryRow key={o.id} order={o} now={now} resumable={o.id === activeOrderId} />
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

function HistoryRow({ order, now, resumable }: { order: OrderView; now: number; resumable: boolean }) {
  const status = now ? effectiveOrderStatus(order, now) : order.status;
  const s = STATUS[status];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p className="font-semibold">{order.event.title}</p>
        <p className="text-sm text-muted">
          Dipesan {formatDate(new Date(order.createdAt).toISOString())} · {rupiah(order.total)}
        </p>
      </div>
      {status === "pending" && resumable ? (
        <Button asChild size="sm">
          <Link href="/checkout/data">Lanjutkan pembayaran</Link>
        </Button>
      ) : (
        <span className={cn("rounded-full bg-elevated px-3 py-1 text-xs font-semibold", s.cls)}>{s.label}</span>
      )}
    </li>
  );
}

function groupByOrder(tickets: TicketView[]) {
  const map = new Map<string, TicketView[]>();
  for (const t of tickets) map.set(t.orderId, [...(map.get(t.orderId) ?? []), t]);
  return [...map.entries()].map(([orderId, tickets]) => ({ orderId, tickets }));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-display text-4xl font-extrabold tracking-tight">Tiket Saya</h1>
      {children}
    </div>
  );
}
