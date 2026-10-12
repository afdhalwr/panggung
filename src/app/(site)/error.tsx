"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center" role="alert">
      <h1 className="font-display text-3xl font-bold">Ada yang tidak beres</h1>
      <p className="text-muted">Halaman ini gagal dimuat. Tenang, kursimu tidak hilang. Coba muat ulang.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
