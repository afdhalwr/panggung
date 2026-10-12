import "server-only";
import { type CategoriesInput, type EventInfo, categoriesSchema, slugify, uniqueSlug } from "@/lib/admin-schemas";
import { getVenue } from "@/lib/catalog";
import { adminDb } from "@/lib/firebase/admin";
import { canBlockSeat, minFestivalQuota } from "@/lib/rules";
import type { Event, EventStatus, InventoryDoc, SeatDoc, TicketCategory } from "@/lib/schemas";
import { invalidateEvents } from "../catalog";
import { eventsCol, readEventTx } from "../events-store";
import { HttpError } from "../http";
import { data, invDocId, seatDocId } from "../orders";

const SEAT_CATEGORY_DEFAULTS: Record<string, Pick<TicketCategory, "name" | "price">> = {
  vip: { name: "VIP", price: 1_500_000 },
  gold: { name: "Gold", price: 850_000 },
  silver: { name: "Silver", price: 450_000 },
};

/** Kategori awal event baru: mengikuti denah untuk venue berkursi, satu kategori festival untuk venue lain. */
function defaultCategories(venueId: string): TicketCategory[] {
  const venue = getVenue(venueId)!;
  if (venue.type === "seated") {
    const ids = [...new Set((venue.seats ?? []).map((s) => s.categoryId))];
    return ids.map((id) => ({ id, ...(SEAT_CATEGORY_DEFAULTS[id] ?? { name: id.toUpperCase(), price: 500_000 }), type: "seated", quota: 0, sold: 0 }));
  }
  return [{ id: "festival", name: "Festival", price: 350_000, type: "festival", quota: venue.capacity, sold: 0 }];
}

function assertVenue(venueId: string) {
  if (!getVenue(venueId)) throw new HttpError(422, "Venue tidak dikenal.");
}

export async function createEvent(info: EventInfo): Promise<Event> {
  assertVenue(info.venueId);
  const db = adminDb();
  const created = await db.runTransaction(async (tx) => {
    const all = await tx.get(eventsCol().select("slug"));
    const slug = uniqueSlug(slugify(info.title), new Set(all.docs.map((d) => d.get("slug") as string)));
    const id = `evt-${slug}`;
    const event: Event = {
      ...info,
      id,
      slug,
      city: getVenue(info.venueId)!.city,
      popularity: 50,
      categories: defaultCategories(info.venueId),
      updatedAt: Date.now(),
    };
    tx.create(eventsCol().doc(id), event);
    return event;
  });
  invalidateEvents();
  return created;
}

export async function updateEventInfo(id: string, info: EventInfo): Promise<void> {
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const cur = await readEventTx(tx, id);
    if (!cur) throw new HttpError(404, "Event tidak ditemukan.");
    // Kategori dan kursi terikat ke venue, jadi venue tidak bisa dipindah setelah event dibuat.
    if (info.venueId !== cur.venueId) throw new HttpError(422, "Venue tidak bisa diubah setelah event dibuat.");
    tx.update(eventsCol().doc(id), { ...info, updatedAt: Date.now() });
  });
  invalidateEvents();
}

export async function setEventStatus(id: string, status: EventStatus): Promise<void> {
  const ref = eventsCol().doc(id);
  if (!(await ref.get()).exists) throw new HttpError(404, "Event tidak ditemukan.");
  await ref.update({ status, updatedAt: Date.now() });
  invalidateEvents();
}

/**
 * Simpan kategori, harga, dan kuota. Aturan:
 * - kategori berkursi tidak bisa ditambah/dihapus (terikat denah) dan kuotanya mengikuti denah,
 * - kuota festival tidak boleh di bawah tiket terjual + hold aktif,
 * - kategori hanya bisa dihapus bila belum pernah terjual atau ditahan.
 */
export async function updateCategories(id: string, input: CategoriesInput): Promise<TicketCategory[]> {
  const { categories } = categoriesSchema.parse(input);
  const db = adminDb();
  const result = await db.runTransaction(async (tx) => {
    const now = Date.now();
    const event = await readEventTx(tx, id);
    if (!event) throw new HttpError(404, "Event tidak ditemukan.");
    const venue = getVenue(event.venueId)!;
    const invRefs = event.categories.map((c) => db.collection("inventory").doc(invDocId(id, c.id)));
    const invSnaps = await tx.getAll(...invRefs);
    const inv = new Map(event.categories.map((c, i) => [c.id, data<InventoryDoc>(invSnaps[i]!)]));

    const byId = new Map(event.categories.map((c) => [c.id, c]));
    const keep = new Set(categories.map((c) => c.id).filter(Boolean));

    for (const old of event.categories) {
      if (keep.has(old.id)) continue;
      if (old.type === "seated") throw new HttpError(422, `Kategori ${old.name} terikat ke denah kursi dan tidak bisa dihapus.`);
      if (minFestivalQuota(old, inv.get(old.id), now) > 0) throw new HttpError(422, `Kategori ${old.name} sudah punya penjualan, jadi tidak bisa dihapus.`);
    }

    const taken = new Set(event.categories.map((c) => c.id));
    const next: TicketCategory[] = categories.map((c) => {
      const old = c.id ? byId.get(c.id) : undefined;
      if (c.id && !old) throw new HttpError(422, "Kategori tidak dikenal. Muat ulang halaman lalu coba lagi.");
      if (old?.type === "seated") {
        return { ...old, name: c.name, price: c.price, perks: c.perks || undefined, quota: 0, sold: 0 };
      }
      if (!old && venue.type === "seated") throw new HttpError(422, "Venue berkursi hanya memakai kategori dari denah.");
      const min = old ? minFestivalQuota(old, inv.get(old.id), now) : 0;
      if (c.quota < min) throw new HttpError(422, `Kuota ${c.name} minimal ${min.toLocaleString("id-ID")} karena tiket sudah terjual atau sedang ditahan.`);
      const catId = old?.id ?? uniqueSlug(slugify(c.name), taken);
      taken.add(catId);
      return { id: catId, name: c.name, price: c.price, type: "festival", quota: c.quota, sold: old?.sold ?? 0, perks: c.perks || undefined };
    });

    tx.update(eventsCol().doc(id), { categories: next, updatedAt: now });
    return next;
  });
  invalidateEvents();
  return result;
}

/** Hapus event. Event yang sudah punya pesanan apa pun tidak dihapus, supaya riwayat dan tiket pembeli tetap utuh. */
export async function deleteEvent(id: string): Promise<void> {
  const db = adminDb();
  const [event, orders, seats, inventory] = await Promise.all([
    eventsCol().doc(id).get(),
    db.collection("orders").where("eventId", "==", id).limit(1).get(),
    db.collection("seats").where("eventId", "==", id).get(),
    db.collection("inventory").where("eventId", "==", id).get(),
  ]);
  if (!event.exists) throw new HttpError(404, "Event tidak ditemukan.");
  if (!orders.empty) throw new HttpError(409, "Event ini sudah punya pesanan. Ubah statusnya menjadi Selesai atau Draft, bukan dihapus.");
  const batch = db.batch();
  [...seats.docs, ...inventory.docs].forEach((d) => batch.delete(d.ref));
  batch.delete(event.ref);
  await batch.commit();
  invalidateEvents();
}

/** Blokir atau buka kursi. Kursi yang sedang ditahan atau terjual tidak bisa diblokir. */
export async function setSeatsBlocked(eventId: string, seatIds: string[], blocked: boolean): Promise<{ changed: string[] }> {
  const db = adminDb();
  const changed = await db.runTransaction(async (tx) => {
    const now = Date.now();
    const event = await readEventTx(tx, eventId);
    if (!event) throw new HttpError(404, "Event tidak ditemukan.");
    const venue = getVenue(event.venueId);
    if (venue?.type !== "seated") throw new HttpError(422, "Event ini tidak memakai denah kursi.");
    const defs = new Map((venue.seats ?? []).map((s) => [s.id, s]));
    const ids = [...new Set(seatIds)];
    if (ids.some((s) => !defs.has(s))) throw new HttpError(422, "Ada kursi yang tidak dikenal.");

    const refs = ids.map((s) => db.collection("seats").doc(seatDocId(eventId, s)));
    const snaps = await tx.getAll(...refs);
    const docs = snaps.map((s) => data<SeatDoc>(s));

    if (blocked) {
      const busy = ids.filter((s, i) => docs[i]?.status !== "blocked" && !canBlockSeat(docs[i], !!defs.get(s)!.seedSold, now));
      if (busy.length) throw new HttpError(409, `Kursi ${busy.join(", ")} sedang ditahan atau sudah terjual.`);
      const out: string[] = [];
      ids.forEach((s, i) => {
        if (docs[i]?.status === "blocked") return;
        tx.set(refs[i]!, { eventId, seatId: s, status: "blocked", blockedAt: now } satisfies SeatDoc);
        out.push(s);
      });
      return out;
    }
    const out: string[] = [];
    ids.forEach((s, i) => {
      if (docs[i]?.status !== "blocked") return;
      tx.delete(refs[i]!);
      out.push(s);
    });
    return out;
  });
  return { changed };
}
