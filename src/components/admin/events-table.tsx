"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Poster } from "@/components/event/poster";
import { formatDate } from "@/lib/format";
import { EVENT_STATUS_LABEL, EVENT_STATUSES, type Event, type EventStatus } from "@/lib/schemas";
import { DataTable } from "./data-table";
import { EventStatusBadge } from "./ui";

export type EventRow = Pick<Event, "id" | "slug" | "title" | "artist" | "date" | "city" | "status" | "palette" | "pattern"> & {
  venue: string;
  sold: number;
  quota: number;
};

const num = new Intl.NumberFormat("id-ID");

const columns: ColumnDef<EventRow, unknown>[] = [
  {
    id: "title",
    header: "Event",
    accessorFn: (r) => r.title,
    cell: ({ row: { original: e } }) => (
      <Link href={`/admin/events/${e.id}`} className="flex min-w-0 items-center gap-3 hover:text-primary">
        <Poster event={e} className="h-10 w-15 shrink-0 rounded-lg" showTitle={false} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{e.title}</span>
          <span className="block truncate text-xs text-muted">{e.artist}</span>
        </span>
      </Link>
    ),
  },
  { id: "date", header: "Tanggal", accessorFn: (r) => r.date, cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue() as string)}</span> },
  {
    id: "venue",
    header: "Venue",
    accessorFn: (r) => `${r.venue} ${r.city}`,
    cell: ({ row: { original: e } }) => (
      <span>
        {e.venue}
        <span className="block text-xs text-muted">{e.city}</span>
      </span>
    ),
  },
  { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ getValue }) => <EventStatusBadge status={getValue() as EventStatus} /> },
  {
    id: "sold",
    header: "Terjual",
    accessorFn: (r) => (r.quota ? r.sold / r.quota : 0),
    cell: ({ row: { original: e } }) => (
      <span className="whitespace-nowrap tabular-nums">
        {num.format(e.sold)} <span className="text-muted">/ {num.format(e.quota)}</span>
      </span>
    ),
  },
  {
    id: "aksi",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row: { original: e } }) => (
      <Link href={`/admin/events/${e.id}`} className="pressable rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary">
        Ubah
      </Link>
    ),
  },
];

export function EventsTable({ rows }: { rows: EventRow[] }) {
  const [status, setStatus] = useState<EventStatus | "">("");
  const data = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);
  return (
    <DataTable
      label="Daftar event"
      data={data}
      columns={columns}
      searchText={(r) => `${r.title} ${r.artist} ${r.city} ${r.venue}`}
      searchPlaceholder="Cari judul, artis, atau kota"
      filters={[
        {
          label: "Status",
          value: status,
          onChange: (v) => setStatus(v as EventStatus | ""),
          options: [{ value: "", label: "Semua status" }, ...EVENT_STATUSES.map((s) => ({ value: s, label: EVENT_STATUS_LABEL[s] }))],
        },
      ]}
      initialSort={[{ id: "date", desc: false }]}
      empty="Tidak ada event yang cocok."
    />
  );
}
