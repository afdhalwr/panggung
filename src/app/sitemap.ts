import type { MetadataRoute } from "next";
import { getListedEvents } from "@/server/catalog";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getListedEvents();
  return [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/events`, changeFrequency: "daily", priority: 0.9 },
    ...events.map((e) => ({ url: `${BASE}/events/${e.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
