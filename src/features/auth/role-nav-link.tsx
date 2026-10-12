"use client";

import Link from "next/link";
import { useAuthHint } from "./auth-hint";
import { useAuth } from "./auth-provider";

/** Tautan navigasi utama yang berubah sesuai peran: "Tiket Saya" untuk pembeli, "Dashboard" untuk admin. */
export function RoleNavLink({ className }: { className?: string }) {
  const { role, loading } = useAuth();
  const hint = useAuthHint();
  const effective = loading ? hint?.role : role;
  return effective === "admin" ? (
    <Link href="/admin" className={className}>
      Dashboard
    </Link>
  ) : (
    <Link href="/tickets" className={className}>
      Tiket Saya
    </Link>
  );
}
