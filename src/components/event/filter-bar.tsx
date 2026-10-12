"use client";

import { SlidersHorizontal, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CITIES, SORTS, filterToQuery, type EventFilter } from "@/lib/filters";
import { GENRE_LABEL, genreSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const PRICE_OPTIONS = [
  { value: "", label: "Semua harga" },
  { value: "200000", label: "≤ Rp200 rb" },
  { value: "350000", label: "≤ Rp350 rb" },
  { value: "500000", label: "≤ Rp500 rb" },
  { value: "1000000", label: "≤ Rp1 jt" },
];

const field = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] outline-none focus:border-primary";

export function EventsBrowser({ initial, count, children }: { initial: EventFilter; count: number; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<EventFilter>(initial);
  const [q, setQ] = useState(initial.q ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  function apply(next: EventFilter) {
    setFilter(next);
    startTransition(() => router.replace(`${pathname}${filterToQuery(next)}`, { scroll: false }));
  }

  function update<K extends keyof EventFilter>(key: K, value: EventFilter[K] | "") {
    const next = { ...filter };
    if (value === "" || value === undefined) delete next[key];
    else next[key] = value as EventFilter[K];
    apply(next);
  }

  // Pencarian ditunda 300 ms agar URL tidak berubah di setiap ketukan.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = Object.keys(filter).filter((k) => k !== "q" && k !== "sort").length;

  const fields = (
    <>
      <Select label="Kota" value={filter.city ?? ""} onChange={(v) => update("city", v)}>
        <option value="">Semua kota</option>
        {CITIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      <Select label="Genre" value={filter.genre ?? ""} onChange={(v) => update("genre", genreSchema.safeParse(v).data ?? "")}>
        <option value="">Semua genre</option>
        {genreSchema.options.map((g) => (
          <option key={g} value={g}>
            {GENRE_LABEL[g]}
          </option>
        ))}
      </Select>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
        Dari tanggal
        <input type="date" className={field} value={filter.from ?? ""} onChange={(e) => update("from", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
        Sampai tanggal
        <input type="date" className={field} value={filter.to ?? ""} onChange={(e) => update("to", e.target.value)} />
      </label>
      <Select label="Harga mulai" value={filter.max ? String(filter.max) : ""} onChange={(v) => update("max", v ? Number(v) : "")}>
        {PRICE_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Cari konser
          </label>
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari artis, kota, atau venue"
            className={cn(field, "h-12 rounded-full pl-11")}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="lg:hidden" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal /> Filter{active ? ` (${active})` : ""}
          </Button>
          <label htmlFor="sort" className="sr-only">
            Urutkan
          </label>
          <select id="sort" className={cn(field, "h-11 w-auto rounded-full")} value={filter.sort ?? "date"} onChange={(e) => update("sort", e.target.value as EventFilter["sort"])}>
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden grid-cols-5 gap-3 lg:grid">{fields}</div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted" aria-live="polite">
        <span>
          {pending ? "Memuat…" : `${count} konser ditemukan`}
        </span>
        {(active > 0 || filter.q) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              apply(filter.sort ? { sort: filter.sort } : {});
            }}
            className="pressable link-underline flex items-center gap-1 font-semibold text-primary"
          >
            <X className="size-4" /> Hapus filter
          </button>
        )}
      </div>

      <div className={cn("transition-opacity", pending && "pointer-events-none opacity-50")}>{children}</div>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent side="bottom" aria-describedby={undefined}>
          <DialogTitle>Filter konser</DialogTitle>
          <div className="mt-5 grid grid-cols-2 gap-3 [&>*:last-child]:col-span-2">{fields}</div>
          <Button className="mt-6 w-full" onClick={() => setSheetOpen(false)}>
            Tampilkan {count} konser
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
      {label}
      <select className={field + " text-fg"} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}
