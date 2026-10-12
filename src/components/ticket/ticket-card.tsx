"use client";

import { QRCodeSVG } from "qrcode.react";
import { Poster } from "@/components/event/poster";
import { formatDate, formatTime } from "@/lib/format";
import type { TicketView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function TicketCard({ ticket, compact = false }: { ticket: TicketView; compact?: boolean }) {
  const past = new Date(ticket.event.date).getTime() < Date.now();
  const void_ = !!ticket.refundedAt;
  return (
    <article
      aria-label={`E-ticket ${ticket.event.title}, ${ticket.categoryName}${ticket.seatLabel ? `, kursi ${ticket.seatLabel}` : ""}`}
      className={cn("relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface", (past || void_) && "opacity-60")}
    >
      <div className="relative h-24 overflow-hidden">
        <Poster event={ticket.event} className="absolute inset-0 size-full" showTitle={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        <p className="absolute left-5 top-4 rounded-full bg-base/80 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur">
          E-ticket
        </p>
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <div>
          <h3 className="font-display text-2xl font-bold leading-tight">{ticket.event.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {formatDate(ticket.event.date)} · {formatTime(ticket.event.date)}
          </p>
          <p className="text-sm text-muted">
            {ticket.event.venue}, {ticket.event.city}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Kategori</p>
            <p className="font-semibold">{ticket.categoryName}</p>
          </div>
          {ticket.seatLabel && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted">Kursi</p>
              <p className="font-display text-2xl font-bold text-primary">{ticket.seatLabel}</p>
            </div>
          )}
        </div>
        {!compact && (
          <div className="relative -mx-5 border-t border-dashed border-line px-5 pt-5">
            <span className="absolute -left-3 -top-3 size-6 rounded-full bg-base" aria-hidden />
            <span className="absolute -right-3 -top-3 size-6 rounded-full bg-base" aria-hidden />
            {void_ ? (
              <p role="status" className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
                Tiket ini sudah direfund dan tidak berlaku lagi.
              </p>
            ) : (
              <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                <QRCodeSVG value={ticket.qrPayload} size={196} level="M" marginSize={0} title={`Kode QR tiket ${ticket.id}`} />
              </div>
            )}
            <p className="mt-3 text-center font-mono text-xs text-muted">{ticket.id}</p>
            {ticket.usedAt && !void_ && <p className="mt-1 text-center text-sm font-semibold text-success">Sudah dipindai di pintu masuk</p>}
            {ticket.order.buyer && <p className="mt-1 text-center text-sm">Atas nama {ticket.order.buyer.name}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
