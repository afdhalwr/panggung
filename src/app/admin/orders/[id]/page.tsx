import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, CircleDashed, RotateCcw } from "lucide-react";
import { RefundButton } from "@/components/admin/refund-button";
import { Badge, OrderStatusBadge, PageHeader, Panel } from "@/components/admin/ui";
import { formatDate, formatTime, rupiah } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/schemas";
import { getOrderDetail } from "@/server/admin/orders";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Detail pesanan" };

const when = (ms?: number) => (ms ? `${formatDate(new Date(ms).toISOString())}, ${formatTime(new Date(ms).toISOString())}` : "—");

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const detail = await getOrderDetail((await params).id);
  if (!detail) notFound();
  const { order } = detail;

  return (
    <>
      <Link href="/admin/orders" className="pressable mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Semua pesanan
      </Link>
      <PageHeader
        title={`Pesanan ${order.id.slice(0, 8)}`}
        description={detail.eventTitle}
        actions={
          <>
            <OrderStatusBadge status={detail.status} />
            {detail.refundable && <RefundButton orderId={order.id} total={order.total} tickets={detail.tickets} />}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={`Tiket (${detail.ticketList.length})`}>
          {detail.ticketList.length ? (
            <ul className="divide-y divide-line">
              {detail.ticketList.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold">
                      {detail.categoryNames[t.categoryId] ?? t.categoryId}
                      {t.seatLabel && <span className="text-muted"> · Kursi {t.seatLabel}</span>}
                    </p>
                    <p className="font-mono text-xs text-muted">{t.id}</p>
                  </div>
                  {t.refundedAt ? (
                    <Badge tone="primary" icon={RotateCcw}>
                      Direfund
                    </Badge>
                  ) : t.usedAt ? (
                    <Badge tone="success" icon={CheckCircle2}>
                      Dipakai {formatTime(new Date(t.usedAt).toISOString())}
                    </Badge>
                  ) : (
                    <Badge tone="muted" icon={CircleDashed}>
                      Belum dipakai
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Belum ada tiket. Tiket dibuat setelah pembayaran berhasil
              {order.items.length ? `; pesanan ini berisi ${order.items.map((i) => (i.seatId ? `kursi ${i.seatId}` : `${i.qty}× ${detail.categoryNames[i.categoryId] ?? i.categoryId}`)).join(", ")}` : ""}.
            </p>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Ringkasan">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Total</dt>
              <dd className="text-right font-bold tabular-nums">{rupiah(order.total)}</dd>
              <dt className="text-muted">Metode</dt>
              <dd className="text-right">{order.method ? PAYMENT_LABEL[order.method] : "—"}</dd>
              <dt className="text-muted">Dibuat</dt>
              <dd className="text-right">{when(order.createdAt)}</dd>
              <dt className="text-muted">Dibayar</dt>
              <dd className="text-right">{when(order.paidAt)}</dd>
              {order.refundedAt && (
                <>
                  <dt className="text-muted">Direfund</dt>
                  <dd className="text-right">{when(order.refundedAt)}</dd>
                </>
              )}
              <dt className="text-muted">Konser</dt>
              <dd className="text-right">{detail.eventDate ? formatDate(detail.eventDate) : "—"}</dd>
            </dl>
            {detail.status === "paid" && !detail.refundable && <p className="mt-4 text-xs text-muted">Konser sudah berlangsung, jadi pesanan ini tidak bisa direfund.</p>}
          </Panel>
          <Panel title="Pembeli">
            {order.buyer ? (
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Nama</dt>
                  <dd className="font-semibold">{order.buyer.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Email</dt>
                  <dd>{order.buyer.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">No. HP</dt>
                  <dd>{order.buyer.phone}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted">Pembeli belum mengisi data (pesanan berhenti sebelum pembayaran).</p>
            )}
            {detail.eventSlug && (
              <Link href={`/admin/events/${order.eventId}`} className="link-underline mt-4 inline-block text-sm font-semibold text-primary">
                Buka event
              </Link>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
