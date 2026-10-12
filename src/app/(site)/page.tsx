import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { EventCard } from "@/components/event/event-card";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { CITIES, filterEvents } from "@/lib/catalog";
import { getListedEvents } from "@/server/catalog";

export default async function HomePage() {
  const events = await getListedEvents();
  const featured = filterEvents(events.filter((e) => e.featured), { sort: "popular" }).slice(0, 6);
  const upcoming = filterEvents(events, { sort: "date" }).slice(0, 4);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image
          src="/photos/stage-1.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover opacity-55"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-base/40 via-base/70 to-base" />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-20 sm:pt-28">
          <p className="w-fit rounded-full border border-primary/40 bg-base/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Pilih kursimu sendiri
          </p>
          <h1 className="max-w-2xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Malam ini milik panggung.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Cari konser di enam kota, pilih kursi langsung di denah venue, lalu simpan e-ticket ber-QR di HP.
          </p>
          <form action="/events" className="flex max-w-xl items-center gap-2 rounded-full border border-line bg-surface/90 p-1.5 pl-5 backdrop-blur">
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <label htmlFor="cari" className="sr-only">
              Cari konser
            </label>
            <input
              id="cari"
              name="q"
              placeholder="Cari artis, kota, atau venue"
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
            />
            <Button type="submit" size="sm">
              Cari
            </Button>
          </form>
          <nav aria-label="Konser per kota" className="flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <Link
                key={city}
                href={`/events?city=${city}`}
                className="pressable rounded-full border border-line bg-base/60 px-3.5 py-1.5 text-sm font-medium backdrop-blur hover:border-primary hover:text-primary"
              >
                {city}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6" aria-labelledby="unggulan">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="unggulan" className="font-display text-3xl font-bold">
            Konser unggulan
          </h2>
          <Link href="/events?sort=popular" className="link-underline flex items-center gap-1 text-sm font-semibold text-primary">
            Lihat semua <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((e, i) => (
            <Reveal key={e.id} index={i}>
              <EventCard event={e} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="terdekat">
        <h2 id="terdekat" className="mb-5 font-display text-3xl font-bold">
          Segera hadir
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((e, i) => (
            <Reveal key={e.id} index={i}>
              <EventCard event={e} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
