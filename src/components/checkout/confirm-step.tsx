"use client";

import { AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/format";
import { PAYMENT_LABEL, type BuyerInput, type PaymentMethod } from "@/lib/schemas";

type Props = {
  buyer: BuyerInput;
  method: PaymentMethod;
  total: number;
  busy: "pay" | "fail" | null;
  error: string;
  onPay: (simulateFailure: boolean) => void;
  onBack: () => void;
};

export function ConfirmStep({ buyer, method, total, busy, error, onPay, onBack }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold">Konfirmasi</h1>
      <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
        <Row label="Nama" value={buyer.name} />
        <Row label="Email" value={buyer.email} />
        <Row label="Nomor HP" value={buyer.phone} />
        <Row label="Pembayaran" value={PAYMENT_LABEL[method]} />
      </dl>

      {error && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-semibold text-danger">Pembayaran belum berhasil</p>
            <p className="mt-0.5 text-fg">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <Button size="lg" onClick={() => onPay(false)} disabled={busy !== null}>
          {busy === "pay" ? "Memproses pembayaran…" : `Bayar ${rupiah(total)}`}
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={onBack} disabled={busy !== null}>
            Kembali
          </Button>
          <Button variant="ghost" size="lg" className="flex-1 border border-dashed border-line" onClick={() => onPay(true)} disabled={busy !== null}>
            <FlaskConical /> {busy === "fail" ? "Mensimulasikan…" : "Simulasikan gagal"}
          </Button>
        </div>
        <p className="text-xs text-muted">
          &ldquo;Simulasikan gagal&rdquo; meniru pembayaran yang ditolak, untuk melihat bagaimana aplikasi menangani error. Kursimu tetap ditahan.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 bg-surface px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
