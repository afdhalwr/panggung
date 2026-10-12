"use client";

import { CreditCard, Landmark, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PaymentMethod; icon: React.ReactNode; desc: string }[] = [
  { value: "va", icon: <Landmark />, desc: "Nomor VA dibuat otomatis, bayar dari m-banking mana pun." },
  { value: "ewallet", icon: <Wallet />, desc: "Konfirmasi lewat aplikasi dompet digital di HP." },
  { value: "card", icon: <CreditCard />, desc: "Visa / Mastercard. Tidak ada data kartu yang diminta." },
];

export function PaymentForm({ initial, onSubmit, onBack }: { initial?: PaymentMethod; onSubmit: (m: PaymentMethod) => void; onBack: () => void }) {
  const [method, setMethod] = useState<PaymentMethod | undefined>(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (method) onSubmit(method);
      }}
      className="flex flex-col gap-5"
    >
      <h1 className="font-display text-3xl font-bold">Metode pembayaran</h1>
      <p className="-mt-3 text-sm text-muted">Semua metode di sini simulasi. Tidak ada uang sungguhan yang berpindah.</p>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Pilih metode pembayaran</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              "pressable flex cursor-pointer items-center gap-4 rounded-2xl border bg-surface p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
              method === o.value ? "border-primary bg-primary/5" : "border-line hover:border-muted",
            )}
          >
            <input type="radio" name="method" value={o.value} checked={method === o.value} onChange={() => setMethod(o.value)} className="sr-only" />
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-5", method === o.value ? "bg-primary text-on-primary" : "bg-elevated")}>
              {o.icon}
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{PAYMENT_LABEL[o.value]}</span>
              <span className="block text-sm text-muted">{o.desc}</span>
            </span>
            <span className={cn("size-5 rounded-full border-2", method === o.value ? "border-primary bg-primary shadow-[inset_0_0_0_3px_var(--bg-surface)]" : "border-line")} aria-hidden />
          </label>
        ))}
      </fieldset>
      <div className="mt-2 flex gap-3">
        <Button type="button" variant="secondary" size="lg" onClick={onBack}>
          Kembali
        </Button>
        <Button type="submit" size="lg" disabled={!method} className="flex-1">
          Lanjut ke konfirmasi
        </Button>
      </div>
    </form>
  );
}
