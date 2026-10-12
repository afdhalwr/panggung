import { QueryProvider } from "@/features/orders/query-provider";

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
