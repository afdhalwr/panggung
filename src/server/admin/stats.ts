import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { buildStats, type DashboardStats, type PaidOrder, type StatsFilter } from "@/lib/stats";
import { getAllEvents } from "../catalog";

/** KPI dan penjualan harian. Hanya order lunas; order yang direfund otomatis keluar dari hitungan. */
export async function getDashboardStats(f: StatsFilter): Promise<DashboardStats> {
  const [events, snap] = await Promise.all([
    getAllEvents(),
    adminDb().collection("orders").where("status", "==", "paid").select("eventId", "items", "total", "paidAt").get(),
  ]);
  return buildStats(events, snap.docs.map((d) => d.data() as PaidOrder), f, Date.now());
}
