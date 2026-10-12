"use client";

import Link from "next/link";
import { LogOut, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthHint } from "./auth-hint";
import { useAuth } from "./auth-provider";

export function AccountButton() {
  const { user, loading, signOut } = useAuth();
  const hint = useAuthHint();
  const [open, setOpen] = useState(false);

  // Selama Firebase Auth belum siap, pakai petunjuk sesi terakhir agar header tidak berkedip.
  const account = user
    ? { name: user.displayName || user.email?.split("@")[0] || "Akun", email: user.email ?? "" }
    : loading
      ? hint
      : null;

  // Saat render server/hydration status belum diketahui: placeholder tak terlihat, bukan skeleton berdenyut.
  if (account === undefined) return <div className="size-10" aria-hidden />;

  if (!account) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link href="/login">Masuk</Link>
      </Button>
    );
  }

  const { name, email } = account;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="pressable grid size-10 place-items-center rounded-full bg-primary font-display text-lg font-bold text-on-primary hover:shadow-[0_6px_20px_-6px_var(--brand-primary)]"
      >
        <span className="sr-only">Menu akun {name}</span>
        <span aria-hidden>{name.charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-56 origin-top-right overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl [animation:menu-in_160ms_var(--ease-spring)]"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <p className="truncate px-3 py-2 text-sm text-muted">{email}</p>
          <Link
            role="menuitem"
            href="/tickets"
            onClick={() => setOpen(false)}
            className="pressable flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-elevated"
          >
            <Ticket className="size-4" /> Tiket Saya
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="pressable flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-elevated"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
