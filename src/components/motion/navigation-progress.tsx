"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Garis progres tipis di atas layar saat berpindah halaman, supaya setiap klik terasa langsung
 * direspons walau halaman berikutnya masih dimuat.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      clearTimeout(timer.current);
      setState("loading");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // URL berubah = halaman baru sudah tampil: selesaikan garis lalu sembunyikan.
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 400);
    return () => clearTimeout(timer.current);
  }, [pathname, searchParams]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className="h-full origin-left bg-primary shadow-[0_0_12px_var(--brand-primary)]"
        style={{
          transform: `scaleX(${state === "loading" ? 0.8 : state === "done" ? 1 : 0})`,
          opacity: state === "idle" ? 0 : 1,
          transition:
            state === "loading"
              ? "transform 8s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 150ms"
              : "transform 200ms ease-out, opacity 300ms ease 150ms",
        }}
      />
    </div>
  );
}
