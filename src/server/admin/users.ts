import "server-only";
import type { AdminUser } from "@/lib/admin-schemas";
import { DEMO_EMAILS } from "@/features/auth/demo-accounts";
import { roleFromClaims } from "@/features/auth/session-cookie";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { HttpError } from "../http";

/** Akun Firebase Auth beserta jumlah pesanan lunasnya. Cukup satu halaman (1000 akun) untuk skala demo. */
export async function listUsers(): Promise<AdminUser[]> {
  const [page, paid] = await Promise.all([
    adminAuth().listUsers(1000),
    adminDb().collection("orders").where("status", "==", "paid").select("uid").get(),
  ]);
  const counts = new Map<string, number>();
  for (const d of paid.docs) counts.set(d.get("uid") as string, (counts.get(d.get("uid") as string) ?? 0) + 1);
  return page.users
    .map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      name: u.displayName || u.email?.split("@")[0] || "Tanpa nama",
      role: roleFromClaims(u.customClaims ?? {}),
      disabled: u.disabled,
      createdAt: Date.parse(u.metadata.creationTime),
      lastSignInAt: u.metadata.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : undefined,
      paidOrders: counts.get(u.uid) ?? 0,
      isDemo: DEMO_EMAILS.includes(u.email ?? ""),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Aktifkan/nonaktifkan akun. Akun nonaktif tidak bisa masuk, dan sesi yang sedang berjalan dicabut
 * (refresh token + `checkRevoked` di server) sehingga langsung keluar di request berikutnya.
 */
export async function setUserDisabled(callerUid: string, uid: string, disabled: boolean): Promise<void> {
  if (uid === callerUid) throw new HttpError(422, "Kamu tidak bisa menonaktifkan akunmu sendiri.");
  const user = await adminAuth()
    .getUser(uid)
    .catch(() => {
      throw new HttpError(404, "Akun tidak ditemukan.");
    });
  if (disabled && DEMO_EMAILS.includes(user.email ?? "")) throw new HttpError(422, "Akun demo dipakai pengunjung lain, jadi tidak bisa dinonaktifkan.");
  await adminAuth().updateUser(uid, { disabled });
  if (disabled) await adminAuth().revokeRefreshTokens(uid);
}
