"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { fieldCls } from "./ui";

const PRESETS = [7, 30, 90] as const;

function shift(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Filter dashboard dalam satu baris di atas konten: rentang tanggal (preset dulu, lalu tanggal bebas) dan event.
 * Disimpan di URL. Saat data baru dimuat, konten lama tetap tampil redup, tanpa skeleton atau lompatan layout.
 */
export function DashboardFrame({
  range,
  today,
  eventId,
  events,
  children,
}: {
  range: { from: string; to: string };
  today: string;
  eventId?: string;
  events: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function apply(next: { from?: string; to?: string; eventId?: string }) {
    const merged = { from: range.from, to: range.to, eventId, ...next };
    const p = new URLSearchParams();
    if (merged.from) p.set("from", merged.from);
    if (merged.to) p.set("to", merged.to);
    if (merged.eventId) p.set("eventId", merged.eventId);
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  const activePreset = range.to === today ? PRESETS.find((d) => shift(today, -(d - 1)) === range.from) : undefined;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Rentang cepat">
          {PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={activePreset === d}
              onClick={() => apply({ from: shift(today, -(d - 1)), to: today })}
              className={cn("pressable rounded-full px-3 py-1.5 text-sm font-semibold", activePreset === d ? "bg-elevated text-fg" : "text-muted hover:text-fg")}
            >
              {d} hari
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          Dari
          <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && apply({ from: e.target.value })} className={cn(fieldCls(), "w-auto")} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          sampai
          <input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && apply({ to: e.target.value })} className={cn(fieldCls(), "w-auto")} />
        </label>
        <label className="flex min-w-[220px] flex-1 items-center gap-1.5 text-sm text-muted sm:flex-none">
          <span className="sr-only">Event</span>
          <select value={eventId ?? ""} onChange={(e) => apply({ eventId: e.target.value || undefined })} className={cn(fieldCls(), "sm:w-72")}>
            <option value="">Semua event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div aria-busy={pending} className={cn("transition-opacity duration-200", pending && "opacity-50")}>
        {children}
      </div>
    </div>
  );
}
