"use client";

import { useEffect, useState } from "react";

/** true setelah komponen terpasang di browser; dipakai untuk state yang disimpan di localStorage. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
