import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Akses ditolak", robots: { index: false } };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-accent/15 text-accent">
        <ShieldAlert className="size-8" aria-hidden />
      </span>
      <p className="font-display text-7xl font-extrabold text-accent">403</p>
      <h1 className="font-display text-3xl font-bold">Halaman ini khusus admin</h1>
      <p className="text-muted">Akunmu masuk sebagai pengguna, jadi dashboard penyelenggara tidak bisa dibuka. Tiket dan konsermu tetap aman.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/">Kembali ke beranda</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/tickets">Tiket Saya</Link>
        </Button>
      </div>
    </div>
  );
}
