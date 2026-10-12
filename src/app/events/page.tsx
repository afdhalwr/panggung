import type { Metadata } from "next";
import { CalendarX } from "lucide-react";
import { EventCard } from "@/components/event/event-card";
import { EventsBrowser } from "@/components/event/filter-bar";
import { Reveal } from "@/components/motion/reveal";
import { filterEvents, parseFilter } from "@/lib/catalog";
import { getListedEvents } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Semua konser",
  description: "Cari konser berdasarkan kota, tanggal, genre, dan harga.",
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filter = parseFilter(await searchParams);
  const events = filterEvents(await getListedEvents(), filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-display text-4xl font-extrabold tracking-tight">Semua konser</h1>
      <EventsBrowser initial={filter} count={events.length}>
        {events.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e, i) => (
              <Reveal key={e.id} index={i % 3}>
                <EventCard event={e} headingLevel={2} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-16 text-center">
            <CalendarX className="size-10 text-muted" aria-hidden />
            <h2 className="font-display text-2xl font-bold">Belum ada konser yang cocok</h2>
            <p className="max-w-sm text-muted">Coba kurangi filter atau ganti kata kunci. Konser baru diumumkan setiap minggu.</p>
          </div>
        )}
      </EventsBrowser>
    </div>
  );
}
