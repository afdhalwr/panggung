import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/catalog";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/events`, changeFrequency: "daily", priority: 0.9 },
    ...getEvents().map((e) => ({ url: `${BASE}/events/${e.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
