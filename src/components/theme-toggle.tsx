"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("panggung-theme", next ? "light" : "dark");
    } catch {
      // mode privat: preferensi tidak disimpan, tidak masalah
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="pressable grid size-10 place-items-center rounded-full text-muted hover:bg-elevated hover:text-fg"
      aria-label={light ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
    >
      {light ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </button>
  );
}
