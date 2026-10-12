"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Konten muncul halus (naik + memudar) saat masuk layar. Tanpa JavaScript, atau dengan
 * "kurangi gerakan", konten langsung tampil (lihat aturan [data-reveal] di globals.css).
 */
export function Reveal({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      style={{ transitionDelay: shown ? `${Math.min(index, 6) * 60}ms` : undefined }}
      className={cn("h-full", className)}
    >
      {children}
    </div>
  );
}
