"use client";

import { Camera, CameraOff, CheckCircle2, CircleAlert, HelpCircle, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminRepository } from "@/features/admin/repository";
import type { TicketCheck } from "@/lib/admin-schemas";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fieldCls } from "./ui";

const RESULT: Record<TicketCheck["result"], { title: string; icon: LucideIcon; cls: string; note: string }> = {
  valid: { title: "Valid", icon: CheckCircle2, cls: "border-success bg-success/10 text-success", note: "Silakan masuk. Tiket sudah ditandai terpakai." },
  used: { title: "Sudah dipakai", icon: CircleAlert, cls: "border-seat-held bg-seat-held/10 text-seat-held", note: "Tiket ini sudah pernah dipindai." },
  refunded: { title: "Dibatalkan", icon: RotateCcw, cls: "border-accent bg-accent/10 text-accent", note: "Pesanan tiket ini sudah direfund." },
  unknown: { title: "Tidak dikenal", icon: HelpCircle, cls: "border-danger bg-danger/10 text-danger", note: "QR palsu, rusak, atau bukan tiket Panggung." },
};

const READER_ID = "pemindai-qr";

type Scanner = { stop: () => Promise<void>; clear: () => void; isScanning: boolean };

/**
 * Validasi tiket di pintu masuk. Kamera memakai html5-qrcode yang dimuat hanya saat tombol kamera ditekan,
 * jadi halaman tetap ringan dan izin kamera tidak diminta tanpa alasan. Input kode selalu tersedia.
 */
export function TicketScanner() {
  const [code, setCode] = useState("");
  const [check, setCheck] = useState<(TicketCheck & { at: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const scanner = useRef<Scanner | null>(null);
  const last = useRef({ code: "", at: 0 });
  const busyRef = useRef(false);

  async function validate(value: string) {
    const v = value.trim();
    if (!v || busyRef.current) return;
    // Kamera membaca QR yang sama berkali-kali per detik: abaikan ulangan dalam 4 detik.
    if (v === last.current.code && Date.now() - last.current.at < 4000) return;
    last.current = { code: v, at: Date.now() };
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await adminRepository.validateTicket(v);
      setCheck({ ...res, at: Date.now() });
      navigator.vibrate?.(res.result === "valid" ? 60 : [80, 60, 80]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validasi gagal. Coba lagi.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function startCamera() {
    setError("");
    setCamera("starting");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode(READER_ID, { verbose: false });
      scanner.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => void validate(text), undefined);
      setCamera("on");
    } catch {
      setCamera("off");
      setError("Kamera tidak bisa dinyalakan. Izinkan akses kamera di browser, atau ketik kode tiket di bawah.");
    }
  }

  async function stopCamera() {
    const s = scanner.current;
    scanner.current = null;
    if (s?.isScanning) await s.stop().catch(() => undefined);
    s?.clear();
    setCamera("off");
  }

  useEffect(
    () => () => {
      const s = scanner.current;
      if (s?.isScanning) void s.stop().then(() => s.clear()).catch(() => undefined);
    },
    [],
  );

  const r = check ? RESULT[check.result] : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div id={READER_ID} className={cn("aspect-[4/3] w-full bg-base [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover", camera === "off" && "hidden")} />
        {camera === "off" && (
          <div className="grid aspect-[4/3] place-items-center p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Camera className="size-10 text-muted" aria-hidden />
              <p className="text-sm text-muted">Arahkan kamera HP ke QR di e-ticket pembeli.</p>
              <Button onClick={() => void startCamera()}>
                <Camera /> Nyalakan kamera
              </Button>
            </div>
          </div>
        )}
        {camera !== "off" && (
          <div className="flex items-center justify-between gap-2 border-t border-line p-3 text-sm text-muted">
            <span>{camera === "starting" ? "Menyalakan kamera…" : busy ? "Memeriksa tiket…" : "Siap memindai"}</span>
            <Button variant="ghost" size="sm" onClick={() => void stopCamera()}>
              <CameraOff /> Matikan
            </Button>
          </div>
        )}
      </div>

      <div aria-live="assertive" aria-atomic="true">
        {r && check && (
          <div key={check.at} className={cn("rounded-2xl border-2 p-5 [animation:pop_220ms_ease-out]", r.cls)}>
            <div className="flex items-center gap-3">
              <r.icon className="size-9 shrink-0" aria-hidden />
              <div>
                <p className="font-display text-3xl font-extrabold leading-none">{r.title}</p>
                <p className="mt-1 text-sm text-fg">{r.note}</p>
              </div>
            </div>
            {check.ticket && (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-fg">
                <dt className="text-muted">Konser</dt>
                <dd className="font-semibold">{check.ticket.eventTitle}</dd>
                <dt className="text-muted">Kategori</dt>
                <dd>
                  {check.ticket.categoryName}
                  {check.ticket.seatLabel && ` · Kursi ${check.ticket.seatLabel}`}
                </dd>
                {check.ticket.buyerName && (
                  <>
                    <dt className="text-muted">Atas nama</dt>
                    <dd>{check.ticket.buyerName}</dd>
                  </>
                )}
                {check.result === "used" && check.ticket.usedAt && (
                  <>
                    <dt className="text-muted">Dipindai</dt>
                    <dd>{formatTime(new Date(check.ticket.usedAt).toISOString())}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          last.current = { code: "", at: 0 };
          void validate(code);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
      >
        <label htmlFor="kode-tiket" className="text-sm font-semibold">
          Kode tiket
        </label>
        <p id="kode-tiket-hint" className="text-xs text-muted">
          Ketik kode di bawah QR, atau tempel isi QR (diawali PANGGUNG.).
        </p>
        <div className="flex gap-2">
          <input
            id="kode-tiket"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-describedby="kode-tiket-hint"
            className={cn(fieldCls(), "h-11 font-mono")}
          />
          <Button type="submit" disabled={busy || code.trim().length < 6}>
            {busy ? "Memeriksa…" : "Periksa"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
