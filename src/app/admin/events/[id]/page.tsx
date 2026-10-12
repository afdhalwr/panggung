import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { CategoriesForm } from "@/components/admin/categories-form";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { EventForm } from "@/components/admin/event-form";
import { SeatBlocker } from "@/components/admin/seat-blocker";
import { EventStatusBadge, PageHeader } from "@/components/admin/ui";
import { getVenue, getVenues } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCategoryRows } from "@/server/admin/events";
import { getEventById } from "@/server/catalog";
import { requireAdminPage } from "@/server/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventById((await params).id);
  return { title: event ? `Ubah ${event.title}` : "Event" };
}

export default async function AdminEventPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const event = await getEventById(id);
  if (!event) notFound();
  const venue = getVenue(event.venueId)!;
  const seated = venue.type === "seated";
  const tabs = [
    { id: "info", label: "Info" },
    { id: "kategori", label: "Kategori & Harga" },
    ...(seated ? [{ id: "kursi", label: "Denah Kursi" }] : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab! : "info";
  const venues = getVenues().map(({ id, name, city, type }) => ({ id, name, city, type }));

  return (
    <>
      <Link href="/admin/events" className="pressable mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Semua event
      </Link>
      <PageHeader
        title={event.title}
        description={`${formatDate(event.date)} · ${venue.name}, ${event.city}`}
        actions={
          <>
            <EventStatusBadge status={event.status} />
            {event.status !== "draft" && (
              <Link href={`/events/${event.slug}`} target="_blank" className="pressable inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-elevated hover:text-fg">
                Lihat halaman <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            )}
            <DeleteEventButton id={event.id} title={event.title} />
          </>
        }
      />

      <nav aria-label="Bagian event" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/events/${event.id}${t.id === "info" ? "" : `?tab=${t.id}`}`}
            aria-current={active === t.id ? "page" : undefined}
            scroll={false}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold",
              active === t.id ? "border-primary text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {active === "info" && <EventForm key={event.updatedAt} venues={venues} event={event} />}
      {active === "kategori" && <CategoriesForm key={event.updatedAt} eventId={event.id} seated={seated} rows={await getCategoryRows(event)} />}
      {active === "kursi" && seated && <SeatBlocker eventId={event.id} venue={venue} categories={event.categories} />}
    </>
  );
}
