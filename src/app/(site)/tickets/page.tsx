import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/require-auth";
import { MyTickets } from "./my-tickets";

export const metadata: Metadata = { title: "Tiket Saya", robots: { index: false } };

export default function TicketsPage() {
  return (
    <RequireAuth>
      <MyTickets />
    </RequireAuth>
  );
}
