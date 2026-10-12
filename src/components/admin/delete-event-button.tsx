"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminRepository } from "@/features/admin/repository";

/** Hapus event dengan konfirmasi. Server menolak bila event sudah punya pesanan. */
export function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await adminRepository.deleteEvent(id);
      toast.success(`Event "${title}" dihapus.`);
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus event.");
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger">
          <Trash2 /> Hapus
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Hapus event ini?</DialogTitle>
        <DialogDescription>
          &ldquo;{title}&rdquo; beserta kategori dan kursi yang diblokir akan dihapus permanen. Event yang sudah punya pesanan tidak bisa dihapus; ubah statusnya menjadi Selesai.
        </DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Batal
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Menghapus…" : "Ya, hapus"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
