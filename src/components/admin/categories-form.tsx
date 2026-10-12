"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminRepository } from "@/features/admin/repository";
import { categoriesSchema, type CategoriesInput, type CategoryRow } from "@/lib/admin-schemas";
import { cn } from "@/lib/utils";
import { fieldCls } from "./ui";


const num = new Intl.NumberFormat("id-ID");

/**
 * Atur kategori, harga, dan kuota. Validasi bentuk (Zod) di klien dan server; aturan yang butuh data terbaru
 * (kuota minimal, kategori yang sudah terjual) dicek ulang server di dalam transaction.
 */
export function CategoriesForm({ eventId, seated, rows }: { eventId: string; seated: boolean; rows: CategoryRow[] }) {
  const router = useRouter();
  const meta = new Map(rows.map((r) => [r.id, r]));
  const form = useForm<CategoriesInput>({
    resolver: zodResolver(categoriesSchema),
    defaultValues: { categories: rows.map(({ id, name, price, quota, perks }) => ({ id, name, price, quota: quota || 1, perks: perks ?? "" })) },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "categories", keyName: "key" });
  const { errors, isSubmitting, isDirty } = form.formState;

  async function onSubmit(values: CategoriesInput) {
    try {
      await adminRepository.updateCategories(eventId, values);
      toast.success("Kategori dan harga tersimpan. Halaman konser sudah memakai harga baru.");
      form.reset(values);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kategori.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {seated && (
        <p className="flex gap-2 rounded-xl border border-line bg-elevated/50 px-4 py-3 text-sm text-muted">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Venue ini berkursi: kategorinya mengikuti denah dan kuotanya sama dengan jumlah kursi. Nama, harga, dan keterangan tetap bisa diubah; kursi tertentu bisa diblokir di tab Denah Kursi.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {fields.map((f, i) => {
          const m = f.id ? meta.get(f.id) : undefined;
          const isSeated = m?.type === "seated";
          const removable = !isSeated && (!m || m.minQuota === 0);
          const err = errors.categories?.[i];
          return (
            <li key={f.key} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
              <Cell label="Nama kategori" id={`cat-${i}-name`} error={err?.name?.message}>
                <input id={`cat-${i}-name`} {...form.register(`categories.${i}.name`)} className={fieldCls(!!err?.name)} aria-invalid={!!err?.name} />
              </Cell>
              <Cell label="Harga (Rp)" id={`cat-${i}-price`} error={err?.price?.message}>
                <input id={`cat-${i}-price`} type="number" inputMode="numeric" step={1000} min={10000} {...form.register(`categories.${i}.price`)} className={fieldCls(!!err?.price)} aria-invalid={!!err?.price} />
              </Cell>
              {isSeated ? (
                <Cell label="Kuota" id={`cat-${i}-quota`} hint="Mengikuti denah">
                  <input type="hidden" {...form.register(`categories.${i}.quota`)} />
                  <input id={`cat-${i}-quota`} readOnly value={num.format(m!.quota)} className={cn(fieldCls(), "text-muted")} />
                </Cell>
              ) : (
                <Cell label="Kuota" id={`cat-${i}-quota`} error={err?.quota?.message} hint={m?.minQuota ? `Minimal ${num.format(m.minQuota)} (terjual + ditahan)` : undefined}>
                  <input id={`cat-${i}-quota`} type="number" inputMode="numeric" min={Math.max(1, m?.minQuota ?? 1)} {...form.register(`categories.${i}.quota`)} className={fieldCls(!!err?.quota)} aria-invalid={!!err?.quota} />
                </Cell>
              )}
              <div className="flex items-end sm:h-full sm:pt-6">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={!removable || fields.length === 1}
                  title={removable ? "Hapus kategori" : isSeated ? "Kategori denah tidak bisa dihapus" : "Sudah ada penjualan"}
                  className="pressable grid size-10 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only">Hapus kategori {f.name}</span>
                </button>
              </div>
              <div className="sm:col-span-4">
                <Cell label="Keterangan (opsional)" id={`cat-${i}-perks`} error={err?.perks?.message}>
                  <input id={`cat-${i}-perks`} placeholder="Misalnya: area depan panggung, merchandise" {...form.register(`categories.${i}.perks`)} className={fieldCls(!!err?.perks)} />
                </Cell>
              </div>
            </li>
          );
        })}
      </ul>
      {errors.categories?.root?.message && <p className="text-sm text-danger">{errors.categories.root.message}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!seated && (
          <Button type="button" variant="secondary" onClick={() => append({ name: "", price: 250_000, quota: 100, perks: "" })} disabled={fields.length >= 8}>
            <Plus /> Tambah kategori
          </Button>
        )}
        <Button type="submit" className="ml-auto" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Menyimpan…" : "Simpan kategori"}
        </Button>
      </div>
      <p className="text-xs text-muted">Harga baru berlaku untuk pesanan berikutnya; pesanan yang sedang berjalan tetap memakai harga saat dipesan.</p>
    </form>
  );
}

function Cell({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
