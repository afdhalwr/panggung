"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fieldCls } from "./ui";

type Filter = { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void };

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  /** Teks gabungan per baris yang dicari oleh kotak pencarian. */
  searchText: (row: T) => string;
  searchPlaceholder: string;
  filters?: Filter[];
  initialSort?: SortingState;
  pageSize?: number;
  empty: string;
  /** Label untuk pembaca layar, misalnya "Daftar pesanan". */
  label: string;
};

/**
 * Tabel admin berbasis TanStack Table: pencarian, filter (diatur pemanggil), sorting per kolom, dan pagination.
 * Di layar sempit tabel bisa digeser horizontal di dalam kartunya, tanpa membuat halaman ikut melebar.
 */
export function DataTable<T>({ data, columns, searchText, searchPlaceholder, filters = [], initialSort = [], pageSize = 10, empty, label }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [query, setQuery] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: query },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    globalFilterFn: (row, _id, value: string) => searchText(row.original).toLowerCase().includes(value.trim().toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    autoResetPageIndex: true,
  });

  const { pageIndex } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const from = total ? pageIndex * pageSize + 1 : 0;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className={cn(fieldCls(), "pl-9")} />
        </label>
        {filters.map((f) => (
          <label key={f.label} className="flex items-center gap-2 text-sm text-muted">
            <span className="sr-only sm:not-sr-only">{f.label}</span>
            <select value={f.value} onChange={(e) => f.onChange(e.target.value)} className={cn(fieldCls(), "w-auto pr-8")}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm" aria-label={label}>
          <thead className="text-xs uppercase tracking-wide text-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const canSort = h.column.getCanSort();
                  return (
                    <th key={h.id} scope="col" aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {canSort ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 rounded hover:text-fg">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : sorted === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-line/60 last:border-0 hover:bg-elevated/40">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!total && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
        <p aria-live="polite">
          {from}–{to} dari {total}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="pressable grid size-9 place-items-center rounded-full hover:bg-elevated disabled:opacity-40" aria-label="Halaman sebelumnya">
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="pressable grid size-9 place-items-center rounded-full hover:bg-elevated disabled:opacity-40" aria-label="Halaman berikutnya">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
