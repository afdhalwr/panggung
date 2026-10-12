import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/format";

/** Ringkasan pilihan + tombol lanjut. Menempel di bawah layar HP, menjadi kartu biasa di desktop. */
export function OrderBar({
  summary,
  total,
  disabled,
  busy,
  onContinue,
  label = "Lanjut",
}: {
  summary: string;
  total: number;
  disabled: boolean;
  busy: boolean;
  onContinue: () => void;
  label?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:static lg:rounded-[var(--radius-card)] lg:border lg:p-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 lg:flex-col lg:items-stretch">
        <div aria-live="polite">
          <p className="text-sm text-muted">{summary}</p>
          <p className="text-lg font-bold">{rupiah(total)}</p>
        </div>
        <Button onClick={onContinue} disabled={disabled || busy} size="lg">
          {busy ? "Menahan kursi…" : label}
        </Button>
      </div>
    </div>
  );
}
