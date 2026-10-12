"use client";

import { Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";
import { CRITICAL_MS, remainingMs } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** Sisa waktu dalam ms, berdasarkan jam server (Date.now() + clockOffset), diperbarui tiap detik. */
export function useCountdown(holdExpiresAt: number, clockOffset: number): number {
  const [ms, setMs] = useState(() => remainingMs(holdExpiresAt, Date.now() + clockOffset));
  useEffect(() => {
    const tick = () => setMs(remainingMs(holdExpiresAt, Date.now() + clockOffset));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [holdExpiresAt, clockOffset]);
  return ms;
}

const ANNOUNCE_AT = [5 * 60_000, 2 * 60_000, 60_000];

export function CountdownBadge({ ms }: { ms: number }) {
  const critical = ms <= CRITICAL_MS;
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef(new Set<number>());

  // Pembaca layar hanya diberi tahu di menit-menit penting, bukan setiap detik.
  useEffect(() => {
    for (const at of ANNOUNCE_AT) {
      if (ms <= at && ms > at - 2000 && !announced.current.has(at)) {
        announced.current.add(at);
        setAnnouncement(`Sisa waktu ${at / 60_000} menit untuk menyelesaikan pembayaran.`);
      }
    }
  }, [ms]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-4 py-2 transition-colors",
        critical ? "border-accent bg-accent/10 text-accent" : "border-line bg-elevated text-fg",
      )}
    >
      <Timer className={cn("size-4", critical && "animate-pulse")} aria-hidden />
      <span role="timer" aria-label={`Sisa waktu ${formatCountdown(ms)}`} className="font-bold tabular-nums">
        {formatCountdown(ms)}
      </span>
      <span className="text-sm text-muted">kursi ditahan</span>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
}
