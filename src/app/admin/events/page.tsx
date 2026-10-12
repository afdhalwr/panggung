import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EventsTable, type EventRow } from "@/components/admin/events-table";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { getVenue } from "@/lib/catalog";
import { getDashboardStats } from "@/server/admin/stats";
import { getAllEvents } from "@/server/catalog";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Event" };

export default async function AdminEventsPage() {
  await requireAdminPage();
  const [events, stats] = await Promise.all([getAllEvents(), getDashboardStats({})]);
  const occupancy = new Map(stats.events.map((e) => [e.id, e]));
  const rows: EventRow[] = events.map(({ id, slug, title, artist, date, city, status, palette, pattern, venueId, categories }) => ({
    id,
    slug,
    title,
    artist,
    date,
    city,
    status,
    palette,
    pattern,
    venue: getVenue(venueId)?.name ?? "",
    sold: occupancy.get(id)?.sold ?? categories.reduce((n, c) => n + c.sold, 0),
    quota: occupancy.get(id)?.quota ?? categories.reduce((n, c) => n + c.quota, 0),
  }));

  return (
    <>
      <PageHeader
        title="Event"
        description="Event Draft tidak tampil di sisi pengguna. Event yang sudah punya pesanan tidak bisa dihapus; ubah statusnya menjadi Selesai."
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus /> Buat event
            </Link>
          </Button>
        }
      />
      <EventsTable rows={rows} />
    </>
  );
}
