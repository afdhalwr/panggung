"use client";

import { memo, useMemo, useRef, useState } from "react";
import { rupiah } from "@/lib/format";
import type { SeatDef, SeatStatus } from "@/lib/schemas";

export type SeatView = SeatDef & { status: SeatStatus | "selected" };
export type SeatCategory = { id: string; name: string; price: number; color: string };

type Props = {
  seats: SeatView[];
  width: number;
  height: number;
  categories: SeatCategory[];
  onToggle: (seat: SeatView) => void;
};

const SIZE = 24;
const STATUS_LABEL: Record<SeatView["status"], string> = {
  available: "tersedia",
  selected: "dipilih",
  held: "sedang ditahan orang lain",
  sold: "terjual",
};

/**
 * Denah kursi SVG. Navigasi keyboard memakai roving tabindex:
 * Tab masuk ke denah, panah berpindah kursi, Enter/Spasi memilih.
 */
export function SeatMap({ seats, width, height, categories, onToggle }: Props) {
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const rows = useMemo(() => {
    const byRow = new Map<string, SeatView[]>();
    for (const s of seats) byRow.set(s.row, [...(byRow.get(s.row) ?? []), s]);
    const list = [...byRow.entries()].map(([row, list]) => ({ row, y: list[0]!.y, seats: list.sort((a, b) => a.x - b.x) }));
    return list.sort((a, b) => a.y - b.y);
  }, [seats]);

  const firstFocusable = seats.find((s) => s.status === "selected") ?? seats.find((s) => s.status === "available") ?? seats[0];
  const [focusId, setFocusId] = useState<string | undefined>(firstFocusable?.id);
  const [hasFocus, setHasFocus] = useState(false);
  const refs = useRef(new Map<string, SVGGElement>());
  const activeId = seats.some((s) => s.id === focusId) ? focusId : firstFocusable?.id;

  function move(from: SeatView, key: string) {
    const ri = rows.findIndex((r) => r.row === from.row);
    const row = rows[ri]!;
    const ci = row.seats.findIndex((s) => s.id === from.id);
    let target: SeatView | undefined;
    if (key === "ArrowRight") target = row.seats[ci + 1];
    if (key === "ArrowLeft") target = row.seats[ci - 1];
    if (key === "ArrowUp" || key === "ArrowDown") {
      const next = rows[ri + (key === "ArrowDown" ? 1 : -1)];
      target = next?.seats.reduce((best, s) => (Math.abs(s.x - from.x) < Math.abs(best.x - from.x) ? s : best));
    }
    if (key === "Home") target = row.seats[0];
    if (key === "End") target = row.seats[row.seats.length - 1];
    if (target) {
      setFocusId(target.id);
      refs.current.get(target.id)?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent, seat: SeatView) {
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      move(seat, e.key);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(seat);
    }
  }

  function activate(seat: SeatView) {
    setFocusId(seat.id);
    if (seat.status === "available" || seat.status === "selected") onToggle(seat);
  }

  const minX = Math.min(...seats.map((s) => s.x));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full select-none" role="group" aria-label="Denah kursi. Gunakan tombol panah untuk berpindah kursi, Enter atau Spasi untuk memilih.">
      <defs>
        <pattern id="held-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--seat-held)" opacity="0.35" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--seat-held)" strokeWidth="3" />
        </pattern>
      </defs>
      <rect x={width * 0.2} y={20} width={width * 0.6} height={44} rx={12} fill="var(--bg-elevated)" />
      <text x={width / 2} y={48} textAnchor="middle" fill="var(--text-muted)" fontSize="14" fontWeight="700" letterSpacing="4">
        PANGGUNG
      </text>
      {rows.map((r) => (
        <text key={r.row} x={minX - 30} y={r.y + 5} textAnchor="middle" fill="var(--text-muted)" fontSize="12" fontWeight="700" aria-hidden>
          {r.row}
        </text>
      ))}
      {seats.map((seat) => {
        const cat = catById.get(seat.categoryId);
        return (
          <Seat
            key={seat.id}
            seat={seat}
            color={cat?.color ?? "var(--seat-available)"}
            label={`Kursi ${seat.id}, ${cat?.name ?? ""}, ${cat ? rupiah(cat.price) : ""}, ${STATUS_LABEL[seat.status]}`}
            tabbable={seat.id === activeId}
            focused={hasFocus && seat.id === activeId}
            refCb={(el) => (el ? refs.current.set(seat.id, el) : refs.current.delete(seat.id))}
            onKeyDown={onKeyDown}
            onActivate={activate}
            onFocus={() => {
              setFocusId(seat.id);
              setHasFocus(true);
            }}
            onBlur={() => setHasFocus(false)}
          />
        );
      })}
    </svg>
  );
}

type SeatProps = {
  seat: SeatView;
  color: string;
  label: string;
  tabbable: boolean;
  focused: boolean;
  refCb: (el: SVGGElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent, seat: SeatView) => void;
  onActivate: (seat: SeatView) => void;
  onFocus: () => void;
  onBlur: () => void;
};

const Seat = memo(function Seat({ seat, color, label, tabbable, focused, refCb, onKeyDown, onActivate, onFocus, onBlur }: SeatProps) {
  const h = SIZE / 2;
  const disabled = seat.status === "sold" || seat.status === "held";
  return (
    <g
      ref={refCb}
      transform={`translate(${seat.x} ${seat.y})`}
      role="checkbox"
      aria-checked={seat.status === "selected"}
      aria-disabled={disabled}
      aria-label={label}
      tabIndex={tabbable ? 0 : -1}
      onKeyDown={(e) => onKeyDown(e, seat)}
      onClick={() => onActivate(seat)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={disabled ? "cursor-not-allowed outline-none" : "cursor-pointer outline-none"}
    >
      {focused && <rect x={-h - 4} y={-h - 4} width={SIZE + 8} height={SIZE + 8} rx={9} fill="none" stroke="var(--brand-primary)" strokeWidth={2.5} />}
      {seat.status === "available" && (
        <rect x={-h + 1} y={-h + 1} width={SIZE - 2} height={SIZE - 2} rx={6} fill="var(--bg-surface)" stroke={color} strokeWidth={2} className="transition-[fill] hover:fill-[var(--bg-elevated)]" />
      )}
      {seat.status === "selected" && (
        <g style={{ animation: "pop 220ms ease-out" }}>
          <rect x={-h} y={-h} width={SIZE} height={SIZE} rx={6} fill="var(--seat-selected)" />
          <path d="M-6 0.5 L-1.5 5 L6.5 -4" fill="none" stroke="var(--brand-on-primary)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {seat.status === "held" && (
        <>
          <rect x={-h + 1} y={-h + 1} width={SIZE - 2} height={SIZE - 2} rx={6} fill="url(#held-stripes)" stroke="var(--seat-held)" strokeWidth={2} />
          <circle r={5} fill="var(--bg-surface)" stroke="var(--seat-held)" strokeWidth={1.6} />
          <path d="M0 -2.5 V0 H2" stroke="var(--seat-held)" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </>
      )}
      {seat.status === "sold" && (
        <>
          <rect x={-h} y={-h} width={SIZE} height={SIZE} rx={6} fill="var(--seat-sold)" />
          <path d="M-4.5 -4.5 L4.5 4.5 M4.5 -4.5 L-4.5 4.5" stroke="var(--text-muted)" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        </>
      )}
    </g>
  );
});
