import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { connection } from "next/server";
import { isListed, isVisible } from "@/lib/catalog";
import type { Event } from "@/lib/schemas";
import { readAllEvents } from "./events-store";

export const EVENTS_TAG = "events";

// Satu bacaan Firestore dipakai bersama oleh semua halaman sampai admin mengubah event
// (revalidateTag) atau lima menit berlalu.
const cachedEvents = unstable_cache(readAllEvents, ["events-v1"], { tags: [EVENTS_TAG], revalidate: 300 });

/**
 * Semua event termasuk draft. `connection()` menandai halaman pemanggil sebagai dinamis,
 * sehingga build tidak butuh akses Firestore.
 */
export async function getAllEvents(): Promise<Event[]> {
  await connection();
  return cachedEvents();
}

/** Event yang tampil di beranda, daftar, dan sitemap. */
export async function getListedEvents(): Promise<Event[]> {
  return (await getAllEvents()).filter(isListed);
}

/** Event yang bisa dibuka pengguna lewat slug (bukan draft). */
export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  return (await getAllEvents()).find((e) => e.slug === slug && isVisible(e));
}

export async function getEventById(id: string): Promise<Event | undefined> {
  return (await getAllEvents()).find((e) => e.id === id);
}

/** Dipanggil setelah admin mengubah event, supaya sisi pengguna langsung melihat perubahan. */
export function invalidateEvents() {
  revalidateTag(EVENTS_TAG);
}
