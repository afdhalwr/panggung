import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Admin Panggung" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return (
    <AdminShell name={session.name} email={session.email}>
      {children}
    </AdminShell>
  );
}
