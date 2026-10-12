"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SeatLegend } from "@/components/seat-map/seat-legend";
import { SeatMap, type SeatView } from "@/components/seat-map/seat-map";
import { Button } from "@/components/ui/button";
import { adminRepository } from "@/features/admin/repository";
import { useSeatStatus } from "@/features/seats/use-seat-status";
import { effectiveSeatStatus } from "@/lib/rules";
import type { TicketCategory, Venue } from "@/lib/schemas";
import { categoryColor } from "@/lib/seat-colors";

const pickable = (s: { status: SeatView["status"] }) => s.status === "available" || s.status === "blocked";

/**
 * Denah untuk admin: pilih kursi tersedia untuk diblokir, atau kursi "tidak dijual" untuk dibuka lagi.
 * Status dibaca real-time dari Firestore yang sama dengan denah pembeli, jadi perubahan langsung terlihat di sana.
 */
export function SeatBlocker({ eventId, venue, categories }: { eventId: string; venue: Venue; categories: TicketCategory[] }) {
  const { seats: docs, ready, error, now } = useSeatStatus(eventId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const cats = useMemo(
    () => categories.filter((c) => c.type === "seated").map((c) => ({ id: c.id, name: c.name, price: c.price, color: categoryColor(c.id) })),
    [categories],
  );

  const base = useMemo(() => (venue.seats ?? []).map((s) => ({ ...s, status: effectiveSeatStatus(docs.get(s.id), !!s.seedSold, now) })), [venue.seats, docs, now]);
  // Kursi yang berubah status (misalnya baru dibeli orang) otomatis keluar dari pilihan.
  const selection = useMemo(() => base.filter((s) => picked.has(s.id) && pickable(s)), [base, picked]);
  const toBlock = selection.filter((s) => s.status === "available").map((s) => s.id);
  const toOpen = selection.filter((s) => s.status === "blocked").map((s) => s.id);

  const views: SeatView[] = useMemo(() => base.map((s) => (picked.has(s.id) && pickable(s) ? { ...s, status: "selected" } : s)), [base, picked]);
  const counts = useMemo(() => {
    const r: Record<string, number> = {};
    for (const s of base) if (s.status === "available") r[s.categoryId] = (r[s.categoryId] ?? 0) + 1;
    return r;
  }, [base]);
  const blockedCount = base.filter((s) => s.status === "blocked").length;

  function toggle(seat: SeatView) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  async function apply(ids: string[], blocked: boolean) {
    setBusy(true);
    try {
      const { changed } = await adminRepository.setSeatsBlocked(eventId, ids, blocked);
      toast.success(`${changed.length} kursi ${blocked ? "diblokir" : "dibuka kembali"}.`);
      setPicked(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah kursi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SeatLegend categories={cats} remaining={counts} showBlocked />
      <p className="text-sm text-muted">
        Klik kursi tersedia untuk menandainya, lalu blokir (misalnya untuk tamu undangan atau area kamera). Kursi yang sedang ditahan atau terjual tidak bisa diblokir. Saat ini {blockedCount} kursi tidak dijual.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Status kursi gagal dimuat. Muat ulang halaman.
        </p>
      )}
      <div data-seat-map aria-busy={!ready} className="overflow-x-auto rounded-2xl border border-line bg-surface p-2">
        <div className="min-w-[640px]">
          <SeatMap
            seats={views}
            width={venue.width ?? 760}
            height={venue.height ?? 600}
            categories={cats}
            onToggle={toggle}
            canSelect={(s) => s.status === "selected" || pickable(s)}
            ariaLabel="Denah kursi admin. Panah untuk berpindah, Enter atau Spasi untuk menandai kursi."
          />
        </div>
      </div>
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-xl backdrop-blur">
        <p className="mr-auto text-sm" aria-live="polite">
          {selection.length ? `${selection.length} kursi ditandai: ${selection.map((s) => s.id).slice(0, 8).join(", ")}${selection.length > 8 ? "…" : ""}` : "Belum ada kursi ditandai"}
        </p>
        {selection.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(new Set())} disabled={busy}>
            Batal
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" disabled={busy || !toOpen.length} onClick={() => void apply(toOpen, false)}>
          Buka {toOpen.length || ""} kursi
        </Button>
        <Button type="button" size="sm" disabled={busy || !toBlock.length} onClick={() => void apply(toBlock, true)}>
          Blokir {toBlock.length || ""} kursi
        </Button>
      </div>
    </div>
  );
}
