"use client";

import Link from "next/link";
import { ChevronLeft, PartyPopper } from "lucide-react";
import { DownloadPdfButton } from "@/components/ticket/download-pdf-button";
import { TicketCard } from "@/components/ticket/ticket-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets } from "@/features/orders/use-tickets";

export function TicketDetail({ id, fresh }: { id: string; fresh: boolean }) {
  const { data, isPending, isError, refetch } = useTickets();

  if (isPending) return <Skeleton className="mx-auto mt-10 h-[560px] max-w-md" />;
  if (isError) {
    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-semibold">E-ticket gagal dimuat.</p>
        <Button className="mt-4" variant="secondary" onClick={() => void refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const ticket = data.tickets.find((t) => t.id === id);
  if (!ticket) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Tiket tidak ditemukan</h1>
        <p className="text-muted">Tiket ini tidak ada atau bukan milik akunmu.</p>
        <Button asChild>
          <Link href="/tickets">Lihat Tiket Saya</Link>
        </Button>
      </div>
    );
  }

  const siblings = data.tickets.filter((t) => t.orderId === ticket.orderId);
  const others = siblings.filter((t) => t.id !== ticket.id);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
      {fresh ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary text-on-primary">
            <PartyPopper className="size-7" aria-hidden />
          </span>
          <h1 className="font-display text-3xl font-extrabold">Pembayaran berhasil</h1>
          <p className="text-muted">Tunjukkan QR ini di pintu masuk. Semua tiket juga tersimpan di Tiket Saya.</p>
        </div>
      ) : (
        <Link href="/tickets" className="pressable inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Tiket Saya
        </Link>
      )}

      <TicketCard ticket={ticket} />

      <div className="flex flex-col gap-3">
        {!ticket.refundedAt && (
          <DownloadPdfButton tickets={siblings.filter((t) => !t.refundedAt)} label={siblings.length > 1 ? `Unduh PDF (${siblings.length} tiket)` : "Unduh PDF"} />
        )}
        <Button asChild variant="secondary" size="lg">
          <Link href="/tickets">Lihat Tiket Saya</Link>
        </Button>
      </div>

      {others.length > 0 && (
        <section aria-labelledby="tiket-lain">
          <h2 id="tiket-lain" className="mb-3 font-display text-xl font-bold">
            Tiket lain di pesanan ini
          </h2>
          <ul className="flex flex-col gap-2">
            {others.map((t) => (
              <li key={t.id}>
                <Link href={`/tickets/${t.id}${fresh ? "?baru=1" : ""}`} className="pressable flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 hover:border-primary">
                  <span className="font-semibold">
                    {t.categoryName}
                    {t.seatLabel ? ` · Kursi ${t.seatLabel}` : ""}
                  </span>
                  <span className="text-sm text-primary">Lihat QR</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
