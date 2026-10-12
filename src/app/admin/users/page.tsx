import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { UsersTable } from "@/components/admin/users-table";
import { listUsers } from "@/server/admin/users";
import { requireAdminPage } from "@/server/session";

export const metadata: Metadata = { title: "Pengguna" };

export default async function AdminUsersPage() {
  const session = await requireAdminPage();
  const users = await listUsers();
  return (
    <>
      <PageHeader title="Pengguna" description="Akun nonaktif tidak bisa masuk, dan sesinya yang sedang berjalan langsung dicabut. Akun demo dan akunmu sendiri dilindungi." />
      <UsersTable users={users} selfUid={session.uid} />
    </>
  );
}
