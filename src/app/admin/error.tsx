"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center" role="alert">
      <h1 className="font-display text-3xl font-bold">Data gagal dimuat</h1>
      <p className="text-muted">Server atau database sedang tidak bisa dihubungi. Tidak ada perubahan yang hilang; coba muat ulang.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
