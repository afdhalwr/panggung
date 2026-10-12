import type { Metadata } from "next";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/ui";
import { listOrders } from "@/server/admin/orders";
import { getAllEvents } from "@/server/catalog";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Pesanan" };

export default async function AdminOrdersPage() {
  await requireAdminPage();
  const [orders, events] = await Promise.all([listOrders(), getAllEvents()]);
  const options = events
    .filter((e) => orders.some((o) => o.eventId === e.id))
    .sort((a, b) => a.title.localeCompare(b.title, "id"))
    .map(({ id, title }) => ({ id, title }));
  return (
    <>
      <PageHeader title="Pesanan" description="Semua pesanan dari pembeli. Buka detail untuk melihat tiket dan melakukan refund simulasi." />
      <OrdersTable rows={orders} events={options} />
    </>
  );
}
