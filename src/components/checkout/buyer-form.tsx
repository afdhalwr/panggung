"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { buyerSchema, type Buyer, type BuyerInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Props = { defaultValues: BuyerInput; onSubmit: (buyer: Buyer) => void };

export function BuyerForm({ defaultValues, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BuyerInput, unknown, Buyer>({ resolver: zodResolver(buyerSchema), defaultValues, mode: "onTouched" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold">Data pemesan</h1>
      <p className="-mt-3 text-sm text-muted">E-ticket dikirim atas nama dan email ini. Pastikan sesuai identitas, karena dicek di pintu masuk.</p>
      <Field id="name" label="Nama lengkap" error={errors.name?.message}>
        <input id="name" autoComplete="name" {...register("name")} {...aria("name", errors.name?.message)} className={inputCls(!!errors.name)} />
      </Field>
      <Field id="email" label="Email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" {...register("email")} {...aria("email", errors.email?.message)} className={inputCls(!!errors.email)} />
      </Field>
      <Field id="phone" label="Nomor HP" hint="Contoh: 0812 3456 7890" error={errors.phone?.message}>
        <input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} {...aria("phone", errors.phone?.message, true)} className={inputCls(!!errors.phone)} />
      </Field>
      <Field id="nik" label="NIK (opsional)" hint="16 digit sesuai KTP. Beberapa venue mewajibkan NIK di tiket." error={errors.nik?.message}>
        <input id="nik" inputMode="numeric" maxLength={16} autoComplete="off" {...register("nik")} {...aria("nik", errors.nik?.message, true)} className={inputCls(!!errors.nik)} />
      </Field>
      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
        Lanjut ke pembayaran
      </Button>
    </form>
  );
}

const inputCls = (invalid: boolean) =>
  cn("h-12 w-full rounded-xl border bg-surface px-4 text-[15px] outline-none focus:border-primary", invalid ? "border-accent border-2" : "border-line");

function aria(id: string, error?: string, hasHint = false) {
  const describedBy = [hasHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return { "aria-invalid": !!error, "aria-describedby": describedBy || undefined };
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
