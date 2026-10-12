"use client";

import { FestivalPicker } from "@/components/event/festival-picker";
import { SeatPicker } from "@/components/seat-map/seat-picker";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, Venue } from "@/lib/schemas";
import { useMounted } from "@/lib/use-mounted";

export function TicketSelector({ event, venue }: { event: Event; venue: Venue }) {
  // Pilihan tersimpan di localStorage, jadi baru dirender setelah terpasang di browser.
  if (!useMounted()) return <Skeleton className="h-[420px] w-full rounded-[var(--radius-card)]" />;
  return venue.type === "seated" ? <SeatPicker event={event} venue={venue} /> : <FestivalPicker event={event} />;
}
