import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EventForm } from "@/components/admin/event-form";
import { PageHeader } from "@/components/admin/ui";
import { getVenues } from "@/lib/catalog";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Buat event" };

export default async function NewEventPage() {
  await requireAdminPage();
  const venues = getVenues().map(({ id, name, city, type }) => ({ id, name, city, type }));
  return (
    <>
      <Link href="/admin/events" className="pressable mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Semua event
      </Link>
      <PageHeader title="Buat event" description="Event baru disimpan sebagai Draft sampai kamu menerbitkannya. Setelah dibuat, atur kategori dan harga tiketnya." />
      <EventForm venues={venues} />
    </>
  );
}
