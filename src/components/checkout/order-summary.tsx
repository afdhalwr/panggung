import type { HeldOrder } from "@/features/cart/store";
import { formatDate, formatTime, rupiah } from "@/lib/format";

export function OrderSummary({ order }: { order: HeldOrder }) {
  const { info } = order;
  return (
    <section aria-labelledby="ringkasan" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 id="ringkasan" className="text-xs font-semibold uppercase tracking-wide text-muted">
        Ringkasan pesanan
      </h2>
      <p className="mt-2 font-display text-xl font-bold leading-tight">{info.title}</p>
      <p className="text-sm text-muted">
        {formatDate(info.date)} · {formatTime(info.date)} · {info.venue}
      </p>
      <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
        {info.lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-3">
            <span className="text-muted">{l.label}</span>
            <span>{rupiah(l.price)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="font-semibold">Total</span>
        <span className="text-xl font-bold">{rupiah(order.total)}</span>
      </div>
      <p className="mt-2 text-xs text-muted">Harga sudah termasuk pajak. Tanpa biaya layanan (proyek simulasi).</p>
    </section>
  );
}
