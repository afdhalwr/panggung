"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate, formatTime, rupiah } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/schemas";
import type { AdminOrderRow } from "@/server/admin/orders";
import { DataTable } from "./data-table";
import { ORDER_STATUS_LABEL, OrderStatusBadge } from "./ui";

const iso = (ms: number) => new Date(ms).toISOString();

const columns: ColumnDef<AdminOrderRow, unknown>[] = [
  {
    id: "id",
    header: "Pesanan",
    accessorFn: (r) => r.id,
    enableSorting: false,
    cell: ({ row: { original: o } }) => (
      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold hover:text-primary">
        {o.id.slice(0, 8)}…
      </Link>
    ),
  },
  {
    id: "createdAt",
    header: "Dibuat",
    accessorFn: (r) => r.createdAt,
    cell: ({ row: { original: o } }) => (
      <span className="whitespace-nowrap">
        {formatDate(iso(o.createdAt), { weekday: undefined })}
        <span className="block text-xs text-muted">{formatTime(iso(o.createdAt))}</span>
      </span>
    ),
  },
  {
    id: "buyer",
    header: "Pembeli",
    accessorFn: (r) => r.buyerName,
    cell: ({ row: { original: o } }) => (
      <span className="block max-w-[200px]">
        <span className="block truncate font-semibold">{o.buyerName}</span>
        <span className="block truncate text-xs text-muted">{o.buyerEmail}</span>
      </span>
    ),
  },
  { id: "event", header: "Event", accessorFn: (r) => r.eventTitle, cell: ({ getValue }) => <span className="block max-w-[220px] truncate">{getValue() as string}</span> },
  { id: "tickets", header: "Tiket", accessorFn: (r) => r.tickets, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
  { id: "total", header: "Total", accessorFn: (r) => r.total, cell: ({ getValue }) => <span className="whitespace-nowrap tabular-nums">{rupiah(getValue() as number)}</span> },
  { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ getValue }) => <OrderStatusBadge status={getValue() as OrderStatus} /> },
];

export function OrdersTable({ rows, events }: { rows: AdminOrderRow[]; events: { id: string; title: string }[] }) {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [eventId, setEventId] = useState("");
  const data = useMemo(() => rows.filter((r) => (!status || r.status === status) && (!eventId || r.eventId === eventId)), [rows, status, eventId]);
  // Hanya tampilkan status yang memang ada di data, supaya filter tidak berisi pilihan kosong.
  const present = new Set(rows.map((r) => r.status));

  return (
    <DataTable
      label="Daftar pesanan"
      data={data}
      columns={columns}
      searchText={(r) => `${r.id} ${r.buyerName} ${r.buyerEmail} ${r.eventTitle}`}
      searchPlaceholder="Cari kode pesanan, nama, email, atau event"
      filters={[
        {
          label: "Status",
          value: status,
          onChange: (v) => setStatus(v as OrderStatus | ""),
          options: [{ value: "", label: "Semua status" }, ...ORDER_STATUSES.filter((s) => present.has(s)).map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] }))],
        },
        {
          label: "Event",
          value: eventId,
          onChange: setEventId,
          options: [{ value: "", label: "Semua event" }, ...events.map((e) => ({ value: e.id, label: e.title }))],
        },
      ]}
      initialSort={[{ id: "createdAt", desc: true }]}
      pageSize={15}
      empty="Tidak ada pesanan yang cocok."
    />
  );
}
