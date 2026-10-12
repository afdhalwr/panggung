import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { withVenueQuota } from "@/lib/catalog";
import { adminDb } from "@/lib/firebase/admin";
import type { Event } from "@/lib/schemas";
import { seedEvents } from "@/lib/seed-events";

/**
 * Akses mentah ke koleksi `events` tanpa cache Next.js, sehingga bisa dipakai juga oleh
 * script seed dan di dalam transaction. Halaman memakai `src/server/catalog.ts`.
 */

export const eventsCol = () => adminDb().collection("events");
const metaRef = () => adminDb().doc("meta/catalog");

/**
 * Tulis event dari data seed sekali saja, saat project Firestore masih kosong. Penanda `meta/catalog`
 * mencegah event yang sengaja dihapus admin muncul lagi.
 */
async function ensureSeeded(): Promise<void> {
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    if ((await tx.get(metaRef())).exists) return;
    const now = Date.now();
    for (const e of seedEvents()) tx.set(eventsCol().doc(e.id), { ...e, updatedAt: now });
    tx.set(metaRef(), { seededAt: now });
  });
}

/** Semua event (termasuk draft), dengan kuota kursi diturunkan dari denah. */
export async function readAllEvents(): Promise<Event[]> {
  let snap = await eventsCol().get();
  if (snap.empty && !(await metaRef().get()).exists) {
    await ensureSeeded();
    snap = await eventsCol().get();
  }
  return snap.docs.map((d) => withVenueQuota(d.data() as Event));
}

export async function readEvent(id: string): Promise<Event | undefined> {
  const snap = await eventsCol().doc(id).get();
  return snap.exists ? withVenueQuota(snap.data() as Event) : undefined;
}

/** Baca event di dalam transaction, supaya harga dan kuota yang dipakai selalu yang terbaru. */
export async function readEventTx(tx: Transaction, id: string): Promise<Event | undefined> {
  const snap = await tx.get(eventsCol().doc(id));
  return snap.exists ? withVenueQuota(snap.data() as Event) : undefined;
}
