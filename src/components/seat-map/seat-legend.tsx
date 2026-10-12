import { rupiah } from "@/lib/format";
import type { SeatCategory } from "./seat-map";

/** Legenda status (warna + bentuk) dan kategori. Selalu tampil di atas denah. */
export function SeatLegend({
  categories,
  remaining,
  showBlocked = false,
}: {
  categories: SeatCategory[];
  remaining: Record<string, number>;
  /** Tampilkan keterangan "Tidak dijual" hanya bila ada kursi yang diblokir. */
  showBlocked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted" aria-label="Keterangan status kursi">
        <LegendItem label="Tersedia">
          <rect x="2" y="2" width="16" height="16" rx="4" fill="var(--bg-surface)" stroke="var(--text-muted)" strokeWidth="2" />
        </LegendItem>
        <LegendItem label="Dipilih">
          <rect x="1" y="1" width="18" height="18" rx="4" fill="var(--seat-selected)" />
          <path d="M5.5 10.5 L8.5 13.5 L14.5 6.5" fill="none" stroke="var(--brand-on-primary)" strokeWidth="2.2" strokeLinecap="round" />
        </LegendItem>
        <LegendItem label="Ditahan orang lain">
          <rect x="2" y="2" width="16" height="16" rx="4" fill="var(--seat-held)" fillOpacity="0.35" stroke="var(--seat-held)" strokeWidth="2" />
          <circle cx="10" cy="10" r="3.5" fill="var(--bg-surface)" stroke="var(--seat-held)" strokeWidth="1.4" />
        </LegendItem>
        <LegendItem label="Terjual">
          <rect x="1" y="1" width="18" height="18" rx="4" fill="var(--seat-sold)" />
          <path d="M6.5 6.5 L13.5 13.5 M13.5 6.5 L6.5 13.5" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" />
        </LegendItem>
        {showBlocked && (
          <LegendItem label="Tidak dijual">
            <rect x="2" y="2" width="16" height="16" rx="4" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
            <path d="M6 10 H14" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" />
          </LegendItem>
        )}
      </ul>
      <ul className="flex flex-wrap gap-2" aria-label="Kategori kursi">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
            <span className="size-3 rounded-full border-2" style={{ borderColor: c.color }} aria-hidden />
            <span className="font-semibold">{c.name}</span>
            <span className="text-muted">{rupiah(c.price)}</span>
            <span className="text-xs text-muted">· sisa {remaining[c.id] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        {children}
      </svg>
      {label}
    </li>
  );
}
