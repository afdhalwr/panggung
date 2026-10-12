"use client";

import Link from "next/link";
import { LogOut, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

export function AccountButton() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="h-9 w-20 animate-pulse rounded-full bg-elevated" aria-hidden />;

  if (!user) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link href="/login">Masuk</Link>
      </Button>
    );
  }

  const name = user.displayName || user.email?.split("@")[0] || "Akun";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-10 place-items-center rounded-full bg-primary font-display text-lg font-bold text-on-primary"
      >
        <span className="sr-only">Menu akun {name}</span>
        <span aria-hidden>{name.charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <p className="truncate px-3 py-2 text-sm text-muted">{user.email}</p>
          <Link
            role="menuitem"
            href="/tickets"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-elevated"
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
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-elevated"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
