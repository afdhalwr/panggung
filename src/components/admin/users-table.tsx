"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminRepository } from "@/features/admin/repository";
import type { AdminUser } from "@/lib/admin-schemas";
import { formatDate } from "@/lib/format";
import { DataTable } from "./data-table";
import { Badge } from "./ui";

const iso = (ms: number) => new Date(ms).toISOString();

export function UsersTable({ users, selfUid }: { users: AdminUser[]; selfUid: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(() => {
    async function toggle(u: AdminUser) {
      setBusy(u.uid);
      try {
        await adminRepository.setUserDisabled(u.uid, !u.disabled);
        toast.success(u.disabled ? `${u.name} diaktifkan kembali.` : `${u.name} dinonaktifkan dan sesinya dicabut.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal mengubah status akun.");
      } finally {
        setBusy(null);
      }
    }

    return [
      {
        id: "name",
        header: "Akun",
        accessorFn: (r) => r.name,
        cell: ({ row: { original: u } }) => (
          <span className="block max-w-[260px]">
            <span className="block truncate font-semibold">
              {u.name}
              {u.uid === selfUid && <span className="text-muted"> (kamu)</span>}
            </span>
            <span className="block truncate text-xs text-muted">{u.email}</span>
          </span>
        ),
      },
      {
        id: "role",
        header: "Peran",
        accessorFn: (r) => r.role,
        cell: ({ row: { original: u } }) =>
          u.role === "admin" ? (
            <Badge tone="primary" icon={ShieldCheck}>
              Admin
            </Badge>
          ) : (
            <Badge tone="muted" icon={UserRound}>
              Pengguna
            </Badge>
          ),
      },
      { id: "paidOrders", header: "Pesanan lunas", accessorFn: (r) => r.paidOrders, cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
      { id: "createdAt", header: "Terdaftar", accessorFn: (r) => r.createdAt, cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(iso(getValue() as number), { weekday: undefined })}</span> },
      {
        id: "lastSignInAt",
        header: "Terakhir masuk",
        accessorFn: (r) => r.lastSignInAt ?? 0,
        cell: ({ row: { original: u } }) => <span className="whitespace-nowrap text-muted">{u.lastSignInAt ? formatDate(iso(u.lastSignInAt), { weekday: undefined }) : "Belum pernah"}</span>,
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => (r.disabled ? 1 : 0),
        cell: ({ row: { original: u } }) =>
          u.disabled ? (
            <Badge tone="danger" icon={Ban}>
              Nonaktif
            </Badge>
          ) : (
            <Badge tone="success" icon={CheckCircle2}>
              Aktif
            </Badge>
          ),
      },
      {
        id: "aksi",
        header: () => <span className="sr-only">Aksi</span>,
        enableSorting: false,
        cell: ({ row: { original: u } }) => {
          const locked = u.uid === selfUid || (u.isDemo && !u.disabled);
          return (
            <Button
              size="sm"
              variant={u.disabled ? "secondary" : "ghost"}
              className={u.disabled ? undefined : "text-danger"}
              disabled={locked || busy !== null}
              title={u.uid === selfUid ? "Tidak bisa menonaktifkan akun sendiri" : u.isDemo ? "Akun demo dilindungi" : undefined}
              onClick={() => void toggle(u)}
            >
              {busy === u.uid ? "Memproses…" : u.disabled ? "Aktifkan" : "Nonaktifkan"}
            </Button>
          );
        },
      },
    ];
  }, [busy, router, selfUid]);

  const data = useMemo(() => users.filter((u) => !filter || (filter === "disabled" ? u.disabled : filter === "admin" ? u.role === "admin" : !u.disabled && u.role === "user")), [users, filter]);

  return (
    <DataTable
      label="Daftar pengguna"
      data={data}
      columns={columns}
      searchText={(u) => `${u.name} ${u.email}`}
      searchPlaceholder="Cari nama atau email"
      filters={[
        {
          label: "Tampilkan",
          value: filter,
          onChange: setFilter,
          options: [
            { value: "", label: "Semua akun" },
            { value: "user", label: "Pengguna aktif" },
            { value: "admin", label: "Admin" },
            { value: "disabled", label: "Nonaktif" },
          ],
        },
      ]}
      initialSort={[{ id: "createdAt", desc: true }]}
      empty="Tidak ada akun yang cocok."
    />
  );
}
