"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { rupiah } from "@/lib/format";
import type { DailyPoint } from "@/lib/stats";

const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const label = (day: string, fmt = dayFmt) => fmt.format(new Date(`${day}T00:00:00Z`));

/**
 * Tiket terjual per hari: satu seri, satu sumbu, jadi tanpa legenda (judul panel yang menamainya).
 * Pendapatan ada di tooltip dan tabel, bukan di sumbu kedua. Tabel juga jadi jalan tanpa hover.
 */
export function SalesChart({ data }: { data: DailyPoint[] }) {
  const [asTable, setAsTable] = useState(false);
  const empty = data.every((d) => d.tickets === 0);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setAsTable((v) => !v)} className="pressable rounded-full px-3 py-1 text-sm font-semibold text-muted hover:bg-elevated hover:text-fg" aria-pressed={asTable}>
          {asTable ? "Lihat grafik" : "Lihat tabel"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Penjualan tiket per hari</caption>
            <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Tanggal</th>
                <th scope="col" className="px-3 py-2 text-right">Tiket</th>
                <th scope="col" className="px-3 py-2 text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-line/60">
                  <td className="px-3 py-1.5">{label(d.day, longFmt)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.tickets}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{rupiah(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative h-72" role="img" aria-label={`Grafik tiket terjual per hari, ${label(data[0]!.day)} sampai ${label(data.at(-1)!.day)}. Buka tampilan tabel untuk angka lengkap.`}>
          {empty && <p className="absolute inset-0 z-10 grid place-items-center text-sm text-muted">Belum ada penjualan di rentang ini.</p>}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--border-default)" strokeOpacity={0.6} />
              <XAxis dataKey="day" tickFormatter={(d: string) => label(d)} tick={{ fill: "var(--text-muted)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--border-default)" }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip cursor={{ fill: "var(--bg-elevated)", opacity: 0.6 }} content={ChartTooltip} />
              <Bar dataKey="tickets" name="Tiket" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} activeBar={{ fillOpacity: 0.8 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const point = payload?.[0]?.payload as DailyPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-xl">
      <p className="text-xs text-muted">{label(point.day, longFmt)}</p>
      <p className="mt-1 flex items-center gap-2">
        <span className="h-0.5 w-3 rounded bg-chart-1" aria-hidden />
        <span className="font-bold tabular-nums">{point.tickets} tiket</span>
      </p>
      <p className="text-muted tabular-nums">{rupiah(point.revenue)}</p>
    </div>
  );
}
