import Link from "next/link";
import { getVenue, minPrice } from "@/lib/catalog";
import { formatDate, rupiah } from "@/lib/format";
import { availabilityLabel } from "@/lib/rules";
import { GENRE_LABEL, type Event } from "@/lib/schemas";
import { Poster } from "./poster";

export function EventCard({ event, headingLevel = 3 }: { event: Event; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const venue = getVenue(event.venueId);
  const soldOut = event.categories.every((c) => availabilityLabel(c) === "Habis");
  const almost = !soldOut && event.categories.some((c) => availabilityLabel(c) === "Hampir habis");

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-colors hover:border-primary/60"
    >
      <div className="relative aspect-[3/2] overflow-hidden">
        <Poster event={event} className="size-full transition-transform duration-500 group-hover:scale-105" />
        {(soldOut || almost) && (
          <span className="absolute right-3 top-3 rounded-full bg-base/85 px-2.5 py-1 text-xs font-semibold text-accent backdrop-blur">
            {soldOut ? "Habis" : "Hampir habis"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {GENRE_LABEL[event.genre]} · {event.city}
        </p>
        <Heading className="font-display text-xl font-semibold leading-tight">{event.title}</Heading>
        <p className="text-sm text-muted">
          {formatDate(event.date)} · {venue?.name}
        </p>
        <p className="mt-auto pt-2 text-[15px] font-bold">Mulai {rupiah(minPrice(event))}</p>
      </div>
    </Link>
  );
}
