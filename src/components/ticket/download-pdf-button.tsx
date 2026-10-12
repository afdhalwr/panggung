"use client";

import { Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TicketView } from "@/lib/schemas";

/** Buat PDF di browser. @react-pdf dimuat hanya saat tombol ditekan agar halaman tetap ringan. */
export function DownloadPdfButton({ tickets, label = "Unduh PDF" }: { tickets: TicketView[]; label?: string }) {
  const canvases = useRef(new Map<string, HTMLCanvasElement>());
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const [{ pdf }, { TicketPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./ticket-pdf")]);
      const qrs = Object.fromEntries(tickets.map((t) => [t.id, canvases.current.get(t.id)?.toDataURL("image/png") ?? ""]));
      const blob = await pdf(<TicketPdf tickets={tickets} qrs={qrs} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `e-ticket-${tickets[0]?.event.slug ?? "panggung"}${tickets.length === 1 ? `-${tickets[0]!.id}` : ""}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      toast.error("PDF gagal dibuat. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => void download()} disabled={busy || !tickets.length} size="lg">
        <Download /> {busy ? "Menyiapkan PDF…" : label}
      </Button>
      <div hidden aria-hidden>
        {tickets.map((t) => (
          <QRCodeCanvas
            key={t.id}
            value={t.qrPayload}
            size={480}
            marginSize={2}
            ref={(el) => {
              if (el) canvases.current.set(t.id, el);
              else canvases.current.delete(t.id);
            }}
          />
        ))}
      </div>
    </>
  );
}
