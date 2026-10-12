"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldError } from "react-hook-form";
import { toast } from "sonner";
import { Poster } from "@/components/event/poster";
import { Button } from "@/components/ui/button";
import { adminRepository } from "@/features/admin/repository";
import { PHOTOS, eventInfoSchema, toWibLocal, type EventInfo, type EventInfoInput } from "@/lib/admin-schemas";
import { EVENT_STATUS_LABEL, EVENT_STATUSES, GENRE_LABEL, POSTER_PATTERNS, genreSchema, type Event, type PosterPattern, type Venue } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { fieldCls } from "./ui";

const PATTERN_LABEL: Record<PosterPattern, string> = { rings: "Lingkaran", grid: "Kisi", waves: "Gelombang", bars: "Batang", sun: "Matahari" };

export function toFormValues(e: Event): EventInfoInput {
  return {
    title: e.title,
    artist: e.artist,
    genre: e.genre,
    venueId: e.venueId,
    date: toWibLocal(e.date),
    salesOpenAt: toWibLocal(e.salesOpenAt),
    description: e.description,
    lineup: e.lineup.join("\n"),
    // <input type="color"> hanya menerima hex huruf kecil; huruf besar diganti menjadi hitam oleh browser.
    palette: [e.palette[0].toLowerCase(), e.palette[1].toLowerCase()],
    pattern: e.pattern,
    photo: (PHOTOS as readonly string[]).includes(e.photo) ? (e.photo as EventInfoInput["photo"]) : PHOTOS[0],
    featured: !!e.featured,
    highDemand: !!e.highDemand,
    status: e.status,
  };
}

const EMPTY: EventInfoInput = {
  title: "",
  artist: "",
  genre: "pop",
  venueId: "",
  date: "",
  salesOpenAt: "",
  description: "",
  lineup: "",
  palette: ["#ff3d8b", "#4b2ee6"],
  pattern: "rings",
  photo: PHOTOS[0],
  featured: false,
  highDemand: false,
  status: "draft",
};

/** Form buat/ubah event dengan validasi Zod yang sama dengan server, plus preview poster langsung. */
export function EventForm({ venues, event }: { venues: Pick<Venue, "id" | "name" | "city" | "type">[]; event?: Event }) {
  const router = useRouter();
  const form = useForm<EventInfoInput, unknown, EventInfo>({ resolver: zodResolver(eventInfoSchema), defaultValues: event ? toFormValues(event) : EMPTY, mode: "onTouched" });
  const { register, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  const [title, artist, palette, pattern, photo] = useWatch({ control: form.control, name: ["title", "artist", "palette", "pattern", "photo"] });

  async function onSubmit() {
    // Kirim nilai mentah form (waktu lokal WIB, lineup per baris); server memvalidasi ulang dengan skema yang sama.
    const values = form.getValues();
    try {
      if (event) {
        await adminRepository.updateEventInfo(event.id, values);
        toast.success("Perubahan event tersimpan.");
        form.reset(values);
        router.refresh();
      } else {
        const { event: created } = await adminRepository.createEvent(values);
        toast.success("Event dibuat. Atur kategori dan harga tiketnya.");
        router.push(`/admin/events/${created.id}?tab=kategori`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan event.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        <Fieldset legend="Info utama">
          <Field label="Judul konser" id="ev-title" error={errors.title}>
            <input id="ev-title" {...register("title")} className={fieldCls(!!errors.title)} aria-invalid={!!errors.title} aria-describedby={errors.title ? "ev-title-err" : undefined} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Artis utama" id="ev-artist" error={errors.artist}>
              <input id="ev-artist" {...register("artist")} className={fieldCls(!!errors.artist)} aria-invalid={!!errors.artist} aria-describedby={errors.artist ? "ev-artist-err" : undefined} />
            </Field>
            <Field label="Genre" id="ev-genre" error={errors.genre}>
              <select id="ev-genre" {...register("genre")} className={fieldCls()}>
                {genreSchema.options.map((g) => (
                  <option key={g} value={g}>
                    {GENRE_LABEL[g]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Venue" id="ev-venue" error={errors.venueId} hint={event ? "Venue tidak bisa diubah karena kategori dan denah kursi terikat ke venue." : "Kategori awal mengikuti jenis venue: denah kursi atau festival."}>
            {event ? (
              <>
                {/* Nilai tetap dikirim lewat input tersembunyi; input yang disabled tidak ikut dikirim react-hook-form. */}
                <input type="hidden" {...register("venueId")} />
                <input id="ev-venue" readOnly value={venueLabel(venues.find((v) => v.id === event.venueId))} className={cn(fieldCls(), "text-muted")} aria-describedby="ev-venue-hint" />
              </>
            ) : (
              <select id="ev-venue" {...register("venueId")} className={fieldCls(!!errors.venueId)} aria-invalid={!!errors.venueId} aria-describedby={errors.venueId ? "ev-venue-err" : "ev-venue-hint"}>
                <option value="">Pilih venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {venueLabel(v)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal & jam konser (WIB)" id="ev-date" error={errors.date}>
              <input id="ev-date" type="datetime-local" {...register("date")} className={fieldCls(!!errors.date)} aria-invalid={!!errors.date} aria-describedby={errors.date ? "ev-date-err" : undefined} />
            </Field>
            <Field label="Penjualan dibuka (WIB)" id="ev-sales" error={errors.salesOpenAt}>
              <input id="ev-sales" type="datetime-local" {...register("salesOpenAt")} className={fieldCls(!!errors.salesOpenAt)} aria-invalid={!!errors.salesOpenAt} aria-describedby={errors.salesOpenAt ? "ev-sales-err" : undefined} />
            </Field>
          </div>
          <Field label="Deskripsi" id="ev-desc" error={errors.description}>
            <textarea id="ev-desc" rows={4} {...register("description")} className={cn(fieldCls(!!errors.description), "h-auto py-2")} aria-invalid={!!errors.description} aria-describedby={errors.description ? "ev-desc-err" : undefined} />
          </Field>
          <Field label="Lineup" id="ev-lineup" error={errors.lineup as FieldError | undefined} hint="Satu nama per baris. Nama pertama ditonjolkan.">
            <textarea id="ev-lineup" rows={3} {...register("lineup")} className={cn(fieldCls(!!errors.lineup), "h-auto py-2")} aria-invalid={!!errors.lineup} aria-describedby={errors.lineup ? "ev-lineup-err" : "ev-lineup-hint"} />
          </Field>
        </Fieldset>

        <Fieldset legend="Status & tampilan">
          <div role="radiogroup" aria-label="Status event" className="grid gap-2 sm:grid-cols-3">
            {EVENT_STATUSES.map((s) => (
              <label key={s} className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" value={s} {...register("status")} className="mt-0.5 accent-[var(--brand-primary)]" />
                <span>
                  <span className="font-semibold">{EVENT_STATUS_LABEL[s]}</span>
                  <span className="block text-xs text-muted">{s === "draft" ? "Disembunyikan dari pembeli" : s === "published" ? "Tampil dan bisa dibeli" : "Tidak didaftar, detail tetap bisa dibuka"}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("featured")} className="size-4 accent-[var(--brand-primary)]" /> Tampilkan di Konser unggulan
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("highDemand")} className="size-4 accent-[var(--brand-primary)]" /> Pakai antrean war tiket
            </label>
          </div>
        </Fieldset>
      </div>

      <div className="flex flex-col gap-5 xl:sticky xl:top-8 xl:self-start">
        <Fieldset legend="Poster">
          <Poster event={{ id: "pratinjau", title: title || "Judul konser", artist: artist || "Nama artis", palette: palette as [string, string], pattern }} className="aspect-[3/2] w-full rounded-xl border border-line" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Warna 1" id="ev-c1" error={errors.palette?.[0]}>
              <input id="ev-c1" type="color" {...register("palette.0")} className="h-10 w-full cursor-pointer rounded-xl border border-line bg-base p-1" />
            </Field>
            <Field label="Warna 2" id="ev-c2" error={errors.palette?.[1]}>
              <input id="ev-c2" type="color" {...register("palette.1")} className="h-10 w-full cursor-pointer rounded-xl border border-line bg-base p-1" />
            </Field>
          </div>
          <Field label="Pola" id="ev-pattern" error={errors.pattern}>
            <select id="ev-pattern" {...register("pattern")} className={fieldCls()}>
              {POSTER_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {PATTERN_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Foto header" id="ev-photo" error={errors.photo}>
            <select id="ev-photo" {...register("photo")} className={fieldCls()}>
              {PHOTOS.map((p, i) => (
                <option key={p} value={p}>
                  {p.includes("stage") ? "Panggung" : "Penonton"} {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line">
            <Image src={photo} alt="" fill sizes="320px" className="object-cover" />
          </div>
        </Fieldset>
        <Button type="submit" size="lg" disabled={isSubmitting || (!!event && !isDirty)}>
          {isSubmitting ? "Menyimpan…" : event ? "Simpan perubahan" : "Buat event"}
        </Button>
      </div>
    </form>
  );
}

function venueLabel(v: Pick<Venue, "name" | "city" | "type"> | undefined) {
  return v ? `${v.name}, ${v.city} · ${v.type === "seated" ? "berkursi" : "festival"}` : "";
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <legend className="sr-only">{legend}</legend>
      <p className="font-display text-lg font-bold" aria-hidden>
        {legend}
      </p>
      {children}
    </fieldset>
  );
}

function Field({ label, id, error, hint, children }: { label: string; id: string; error?: FieldError; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error?.message ? (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error.message}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
