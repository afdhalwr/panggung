"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminRepository } from "@/features/admin/repository";
import { rupiah } from "@/lib/format";

export function RefundButton({ orderId, total, tickets }: { orderId: string; total: number; tickets: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await adminRepository.refundOrder(orderId);
      toast.success("Refund berhasil. Kursi sudah dilepas dan bisa dijual lagi.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <RotateCcw /> Refund pesanan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Refund pesanan ini?</DialogTitle>
        <DialogDescription>
          {rupiah(total)} dikembalikan (simulasi). {tickets} tiket langsung tidak berlaku dan QR-nya ditolak saat divalidasi, lalu kursi atau kuotanya dilepas untuk dijual lagi. Tindakan ini tidak bisa dibatalkan.
        </DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Batal
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Memproses…" : "Ya, refund"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
