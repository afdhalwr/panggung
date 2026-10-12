import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ID_COOKIE, roleFromClaims, type Role } from "@/features/auth/session-cookie";
import { adminAuth } from "@/lib/firebase/admin";

export type SessionUser = { uid: string; email: string; name: string; role: Role };

/** Pengguna dari Firebase session cookie, diverifikasi di server. Hasilnya dipakai bersama dalam satu request. */
export const getServerSession = cache(async (): Promise<SessionUser | null> => {
  const value = (await cookies()).get(ID_COOKIE)?.value;
  if (!value) return null;
  try {
    const d = await adminAuth().verifySessionCookie(value, true);
    const email = d.email ?? "";
    return { uid: d.uid, email, name: typeof d.name === "string" && d.name ? d.name : email.split("@")[0] || "Akun", role: roleFromClaims(d) };
  } catch {
    return null;
  }
});

/**
 * Penjaga setiap halaman admin (dipanggil di layout dan di tiap halaman, karena keduanya dirender paralel).
 * Tidak ada sesi sah → cookie dibersihkan lalu ke login; bukan admin → 403.
 */
export async function requireAdminPage(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) {
    const path = (await headers()).get("x-pathname") ?? "/admin";
    redirect(`/api/session/reset?next=${encodeURIComponent(path)}`);
  }
  if (session.role !== "admin") redirect("/403");
  return session;
}
