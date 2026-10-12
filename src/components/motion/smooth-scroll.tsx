"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Smooth scroll dengan Lenis untuk mouse/trackpad. Di layar sentuh scroll native HP sudah halus,
 * dan untuk pengguna yang memilih "kurangi gerakan", Lenis tidak dipasang sama sekali.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
    if (reduce || touchOnly) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.12,
      anchors: { offset: -80 },
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      // Denah kursi punya zoom/geser sendiri; jangan dibajak.
      prevent: (node) => !!node.closest?.("[data-seat-map]"),
    });

    // Saat dialog Radix terbuka, body dikunci (data-scroll-locked): hentikan Lenis agar halaman di belakang diam.
    const sync = () => (document.body.hasAttribute("data-scroll-locked") ? lenis.stop() : lenis.start());
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });

    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, []);

  return null;
}
