"use client";

import { TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ExpiredDialog({ open, onRestart }: { open: boolean; onRestart: () => void }) {
  return (
    <Dialog open={open}>
      <DialogContent hideClose onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent/15 text-accent">
          <TimerOff className="size-6" aria-hidden />
        </div>
        <DialogTitle>Waktu habis, kursi dilepas</DialogTitle>
        <DialogDescription>
          Kursi hanya bisa ditahan 10 menit supaya adil untuk penonton lain. Tidak ada uang yang terpotong. Kamu bisa memilih
          kursi lagi sekarang.
        </DialogDescription>
        <Button className="mt-6 w-full" size="lg" onClick={onRestart}>
          Pilih kursi lagi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
