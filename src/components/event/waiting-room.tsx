"use client";

import { Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const PASS_TTL = 15 * 60 * 1000;
const passKey = (eventId: string) => `panggung-queue-${eventId}`;

function hasPass(eventId: string): boolean {
  try {
    const t = Number(sessionStorage.getItem(passKey(eventId)));
    return Number.isFinite(t) && Date.now() - t < PASS_TTL;
  } catch {
    return false;
  }
}

function savePass(eventId: string) {
  try {
    sessionStorage.setItem(passKey(eventId), String(Date.now()));
  } catch {
    // mode privat: antrean muncul lagi saat reload, tidak masalah
  }
}

/**
 * Simulasi ruang tunggu war tiket (F9). Posisi turun bertahap; menutup atau me-reload
 * halaman memunculkan peringatan karena posisi akan hilang. Lolos antrean berlaku 15 menit.
 */
export function WaitingRoom({ eventId, eventTitle, children }: { eventId: string; eventTitle: string; children: React.ReactNode }) {
  const [passed, setPassed] = useState(() => hasPass(eventId));
  const [start] = useState(() => 900 + Math.floor(Math.random() * 700));
  const [position, setPosition] = useState(start);
  const [announce, setAnnounce] = useState("");
  const lastAnnounce = useRef(0);

  useEffect(() => {
    if (passed) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    const t = setInterval(() => {
      setPosition((p) => Math.max(0, p - Math.ceil(start / 14) - Math.floor(Math.random() * 40)));
    }, 1000);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearInterval(t);
    };
  }, [passed, start]);

  useEffect(() => {
    if (passed) return;
    if (position === 0) {
      savePass(eventId);
      setAnnounce("Giliranmu tiba. Silakan pilih tiket.");
      return;
    }
    // Pembaca layar diberi kabar tiap 5 detik, bukan setiap perubahan angka.
    if (Date.now() - lastAnnounce.current > 5000) {
      lastAnnounce.current = Date.now();
      setAnnounce(`Posisi antrean ${position.toLocaleString("id-ID")}.`);
    }
  }, [position, passed, eventId]);

  if (passed) return <>{children}</>;

  const progress = Math.round(((start - position) / start) * 100);
  const etaSec = Math.max(1, Math.ceil(position / (start / 14)));

  return (
    <section aria-labelledby="antrean" className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
        <Users className="size-7" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Simulasi war tiket</p>
        <h2 id="antrean" className="mt-1 font-display text-3xl font-bold">
          {position === 0 ? "Giliranmu!" : "Kamu sedang mengantre"}
        </h2>
        <p className="mt-2 text-muted">
          Banyak penonton membuka {eventTitle} bersamaan. Jangan tutup atau muat ulang halaman ini, posisimu bisa hilang.
        </p>
      </div>
      {position > 0 ? (
        <>
          <dl className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-2xl bg-elevated p-4">
              <dt className="text-xs text-muted">Posisi antrean</dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{position.toLocaleString("id-ID")}</dd>
            </div>
            <div className="rounded-2xl bg-elevated p-4">
              <dt className="text-xs text-muted">Perkiraan waktu</dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{etaSec} dtk</dd>
            </div>
          </dl>
          <div className="h-2 w-full overflow-hidden rounded-full bg-elevated" role="progressbar" aria-label="Kemajuan antrean" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : (
        <Button size="lg" onClick={() => setPassed(true)}>
          Pilih tiket sekarang
        </Button>
      )}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
