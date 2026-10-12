import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = [
  { slug: "data", label: "Data pemesan" },
  { slug: "pembayaran", label: "Pembayaran" },
  { slug: "konfirmasi", label: "Konfirmasi" },
] as const;
export type StepSlug = (typeof STEPS)[number]["slug"];

/** Langkah yang sudah lewat bisa diklik untuk kembali; isian tetap tersimpan di store. */
export function Stepper({ current, maxReached }: { current: StepSlug; maxReached: number }) {
  const ci = STEPS.findIndex((s) => s.slug === current);
  return (
    <nav aria-label="Langkah checkout">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const done = i < ci;
          const active = i === ci;
          const reachable = i <= maxReached && !active;
          const dot = (
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                active && "bg-primary text-on-primary",
                done && "bg-primary/20 text-primary",
                !active && !done && "border border-line bg-elevated text-muted",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
          );
          const text = <span className={cn("text-sm", active ? "font-semibold text-fg" : "text-muted", !active && "hidden sm:inline")}>{step.label}</span>;
          return (
            <li key={step.slug} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
              {reachable ? (
                <Link href={`/checkout/${step.slug}`} className="flex items-center gap-2 rounded-full hover:opacity-80">
                  {dot}
                  {text}
                  <span className="sr-only">{done ? " (selesai)" : ""}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  {dot}
                  {text}
                </span>
              )}
              {i < STEPS.length - 1 && <span className="h-0.5 w-5 rounded bg-line sm:w-8" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
