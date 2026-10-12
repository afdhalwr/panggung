import eventsJson from "@/data/seed/events.json";
import type { Event } from "./schemas";

/** Event awal dari data seed. Ditulis ke Firestore sekali saja; setelah itu admin yang mengelola. */
export function seedEvents(): Event[] {
  return (eventsJson as Omit<Event, "status">[]).map((e) => ({ ...e, status: "published" }));
}
