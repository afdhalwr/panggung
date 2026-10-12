import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEventBySlug, getVenue } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { TicketSelector } from "./ticket-selector";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = getEventBySlug((await params).slug);
  return event ? { title: `Pilih tiket · ${event.title}`, robots: { index: false } } : {};
}

export default async function SeatsPage({ params }: Params) {
  const event = getEventBySlug((await params).slug);
  if (!event) notFound();
  if (new Date(event.salesOpenAt).getTime() > Date.now()) redirect(`/events/${event.slug}`);
  const venue = getVenue(event.venueId)!;
  const seated = venue.type === "seated";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 lg:pb-12">
      <Link href={`/events/${event.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> {event.title}
      </Link>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{seated ? "Pilih kursi" : "Pilih tiket"}</h1>
      <p className="mb-6 mt-1 text-muted">
        {venue.name} · {formatDate(event.date)} · Maksimal 4 {seated ? "kursi" : "tiket"}. Setelah lanjut, pilihanmu ditahan 10 menit.
      </p>
      <TicketSelector event={event} venue={seated ? venue : { ...venue, seats: undefined }} />
    </div>
  );
}
