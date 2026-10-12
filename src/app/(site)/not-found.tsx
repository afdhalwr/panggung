import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-primary">404</p>
      <h1 className="font-display text-3xl font-bold">Panggungnya kosong</h1>
      <p className="text-muted">Halaman atau konser yang kamu cari tidak ada, atau sudah dipindah.</p>
      <Button asChild>
        <Link href="/events">Lihat semua konser</Link>
      </Button>
    </div>
  );
}
