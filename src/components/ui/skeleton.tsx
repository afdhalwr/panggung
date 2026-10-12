import { cn } from "@/lib/utils";

/**
 * Placeholder saat memuat. Tidak berdenyut, dan baru muncul setelah 250 ms:
 * pemuatan cepat tidak menampilkan apa pun, jadi tidak ada kedip.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-xl bg-elevated [animation:fade-in_200ms_ease-out_250ms_both]", className)} />;
}
