import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Music2 } from "lucide-react";
import { Poster } from "@/components/event/poster";
import { Button } from "@/components/ui/button";
import { getVenue, minPrice } from "@/lib/catalog";
import { formatDate, formatDateLong, formatTime, rupiah } from "@/lib/format";
import { availabilityLabel } from "@/lib/rules";
import { GENRE_LABEL } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { getEventBySlug } from "@/server/catalog";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event) return {};
  const venue = getVenue(event.venueId);
  const description = `${formatDateLong(event.date)} di ${venue?.name}, ${event.city}. Tiket mulai ${rupiah(minPrice(event))}.`;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: [{ url: event.photo, width: 1600, height: 900 }] },
    twitter: { card: "summary_large_image" },
  };
}

const badgeStyle = {
  Tersedia: "text-success",
  "Hampir habis": "text-accent",
  Habis: "text-muted",
} as const;

export default async function EventPage({ params }: Params) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();
  const venue = getVenue(event.venueId);
  const finished = event.status === "finished";
  const salesOpen = new Date(event.salesOpenAt).getTime() <= Date.now();
  const allSoldOut = event.categories.every((c) => availabilityLabel(c) === "Habis");
  const canBuy = !finished && salesOpen && !allSoldOut;
  const ctaLabel = finished
    ? "Konser sudah selesai"
    : !salesOpen
      ? `Dibuka ${formatDate(event.salesOpenAt)}`
      : allSoldOut
        ? "Tiket habis"
        : venue?.type === "seated"
          ? "Pilih kursi"
          : "Beli tiket";

  return (
    <article className="pb-28 lg:pb-0">
      <div className="relative isolate h-56 overflow-hidden sm:h-80">
        <Image src={event.photo} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-base" />
      </div>

      <div className="relative mx-auto -mt-24 grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Poster event={event} className="aspect-[3/2] w-40 rounded-2xl border border-line shadow-2xl sm:w-56" showTitle={false} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {GENRE_LABEL[event.genre]} · {event.city}
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>
          </div>
          <ul className="grid gap-3 text-[15px] sm:grid-cols-2" aria-label="Info konser">
            <Info icon={<CalendarDays />} label="Tanggal" value={formatDateLong(event.date)} />
            <Info icon={<Clock />} label="Waktu" value={formatTime(event.date)} />
            <Info icon={<MapPin />} label="Venue" value={`${venue?.name}`} sub={venue?.address} />
            <Info icon={<Music2 />} label="Genre" value={GENRE_LABEL[event.genre]} />
          </ul>
          <section aria-labelledby="tentang">
            <h2 id="tentang" className="mb-2 font-display text-2xl font-bold">
              Tentang konser
            </h2>
            <p className="max-w-prose leading-relaxed text-muted">{event.description}</p>
          </section>
          <section aria-labelledby="lineup">
            <h2 id="lineup" className="mb-3 font-display text-2xl font-bold">
              Lineup
            </h2>
            <ul className="flex flex-wrap gap-2">
              {event.lineup.map((name, i) => (
                <li key={name} className={cn("rounded-full border px-4 py-2 text-sm font-semibold", i === 0 ? "border-primary text-primary" : "border-line")}>
                  {name}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-labelledby="kategori" className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 id="kategori" className="font-display text-2xl font-bold">
              Kategori tiket
            </h2>
            {finished && <p className="rounded-xl bg-elevated px-3 py-2 text-sm text-muted">Konser ini sudah selesai. Terima kasih sudah datang!</p>}
            {!finished && !salesOpen && (
              <p className="rounded-xl bg-elevated px-3 py-2 text-sm text-muted">
                Penjualan dibuka {formatDateLong(event.salesOpenAt)}, {formatTime(event.salesOpenAt)}.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {event.categories.map((c) => {
                const status = availabilityLabel(c);
                return (
                  <li key={c.id} className={cn("flex items-center gap-3 rounded-xl border border-line px-4 py-3", status === "Habis" && "opacity-50")}>
                    <div className="flex-1">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-sm text-muted">{rupiah(c.price)}</p>
                      {c.perks && <p className="mt-0.5 text-xs text-muted">{c.perks}</p>}
                    </div>
                    <span className={cn("rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold", badgeStyle[status])}>{status}</span>
                  </li>
                );
              })}
            </ul>
            <div className="hidden lg:block">
              <BuyButton slug={event.slug} enabled={canBuy} label={ctaLabel} />
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Mulai dari</p>
            <p className="font-bold">{rupiah(minPrice(event))}</p>
          </div>
          <BuyButton slug={event.slug} enabled={canBuy} label={ctaLabel} />
        </div>
      </div>
    </article>
  );
}

function BuyButton({ slug, enabled, label }: { slug: string; enabled: boolean; label: string }) {
  if (!enabled) {
    return (
      <Button disabled className="w-full lg:w-full">
        {label}
      </Button>
    );
  }
  return (
    <Button asChild className="lg:w-full">
      <Link href={`/events/${slug}/seats`}>{label}</Link>
    </Button>
  );
}

function Info({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-4 [&_svg]:size-5 [&_svg]:text-primary">
      <span className="mt-0.5" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="font-semibold">{value}</p>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
    </li>
  );
}
