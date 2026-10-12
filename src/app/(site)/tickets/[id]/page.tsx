import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/require-auth";
import { TicketDetail } from "./ticket-detail";

export const metadata: Metadata = { title: "E-ticket", robots: { index: false } };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ baru?: string }> }) {
  const [{ id }, { baru }] = await Promise.all([params, searchParams]);
  return (
    <RequireAuth>
      <TicketDetail id={id} fresh={baru === "1"} />
    </RequireAuth>
  );
}
