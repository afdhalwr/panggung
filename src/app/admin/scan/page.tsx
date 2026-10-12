import type { Metadata } from "next";
import { TicketScanner } from "@/components/admin/ticket-scanner";
import { PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Validasi tiket" };

export default async function ScanPage() {
  await requireAdminPage();
  return (
    <>
      <PageHeader title="Validasi tiket" description="Pindai QR di pintu masuk. Tiket yang valid langsung ditandai terpakai, jadi QR yang sama tidak bisa dipakai dua kali." />
      <TicketScanner />
    </>
  );
}
