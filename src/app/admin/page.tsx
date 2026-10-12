import Link from "next/link";
import { ArrowRight, Banknote, Gauge, ReceiptText, Ticket } from "lucide-react";
import { DashboardFrame } from "@/components/admin/dashboard-filters";
import { SalesChart } from "@/components/admin/sales-chart";
import { EventStatusBadge, KpiCard, PageHeader, Panel } from "@/components/admin/ui";
import { formatDate, rupiah } from "@/lib/format";
import { wibDay } from "@/lib/stats";
import { getDashboardStats } from "@/server/admin/stats";
import { getAllEvents } from "@/server/catalog";
import { requireAdminPage } from "@/server/session";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

const pct = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("id-ID");

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const eventId = one(sp.eventId);
  const [stats, events] = await Promise.all([getDashboardStats({ eventId, from: one(sp.from), to: one(sp.to) }), getAllEvents()]);
  const now = Date.now();
  const upcoming = events
    .filter((e) => e.status === "published" && Date.parse(e.date) > now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const options = events.filter((e) => e.status !== "draft").sort((a, b) => a.title.localeCompare(b.title, "id")).map(({ id, title }) => ({ id, title }));

  return (
    <>
      <PageHeader title="Dashboard" description="Ringkasan penjualan simulasi. Pendapatan dan pesanan dihitung dari order lunas; okupansi termasuk penjualan sebelum Panggung." />
      <DashboardFrame range={stats.range} today={wibDay(now)} eventId={eventId} events={options}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Tiket terjual" value={num.format(stats.kpi.tickets)} hint="Di rentang terpilih" icon={Ticket} />
          <KpiCard label="Pendapatan" value={rupiah(stats.kpi.revenue)} hint="Simulasi, belum dipotong biaya" icon={Banknote} />
          <KpiCard label="Pesanan lunas" value={num.format(stats.kpi.orders)} hint="Di rentang terpilih" icon={ReceiptText} />
          <KpiCard label="Okupansi" value={pct.format(stats.kpi.occupancy)} hint={eventId ? "Event terpilih" : "Semua event aktif"} icon={Gauge} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Panel title="Tiket terjual per hari" description={`${formatDate(`${stats.range.from}T12:00:00Z`, { weekday: undefined })} – ${formatDate(`${stats.range.to}T12:00:00Z`, { weekday: undefined })}`}>
            <SalesChart data={stats.daily} />
          </Panel>

          <Panel
            title="Event terdekat"
            actions={
              <Link href="/admin/events" className="link-underline inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Semua <ArrowRight className="size-4" />
              </Link>
            }
          >
            {upcoming.length ? (
              <ul className="flex flex-col gap-3">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}`} className="pressable block rounded-xl border border-line px-3 py-2.5 hover:border-primary">
                      <p className="truncate font-semibold">{e.title}</p>
                      <p className="text-xs text-muted">
                        {formatDate(e.date)} · {e.city}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Belum ada event terbit yang akan datang.</p>
            )}
          </Panel>
        </div>

        <Panel title="Okupansi per event" className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Okupansi dan pendapatan per event</caption>
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-4">Event</th>
                  <th scope="col" className="py-2 pr-4">Status</th>
                  <th scope="col" className="w-[34%] py-2 pr-4">Terjual / kuota</th>
                  <th scope="col" className="py-2 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {stats.events.map((e) => {
                  const ratio = e.quota ? Math.min(1, e.sold / e.quota) : 0;
                  return (
                    <tr key={e.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/events/${e.id}`} className="font-semibold hover:text-primary">
                          {e.title}
                        </Link>
                        <p className="text-xs text-muted">{formatDate(e.date)}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <EventStatusBadge status={e.status} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated" aria-hidden>
                            <div className="h-full rounded-full bg-chart-1" style={{ width: `${ratio * 100}%` }} />
                          </div>
                          <span className="w-28 shrink-0 text-right tabular-nums">
                            {pct.format(ratio)} <span className="text-xs text-muted">({num.format(e.sold)}/{num.format(e.quota)})</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right tabular-nums">{rupiah(e.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </DashboardFrame>
    </>
  );
}
