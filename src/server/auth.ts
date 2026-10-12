import "server-only";
import { roleFromClaims, type Role } from "@/features/auth/session-cookie";
import { adminAuth } from "@/lib/firebase/admin";
import { HttpError } from "./http";

export type Caller = { uid: string; email?: string; role: Role };

function authCode(err: unknown): string {
  return typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
}

/**
 * Ambil pemanggil dari header `Authorization: Bearer <ID token Firebase>`.
 * `checkRevoked` membuat akun yang dinonaktifkan admin langsung ditolak, tanpa menunggu token kedaluwarsa.
 */
export async function verifyRequest(req: Request): Promise<Caller> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Silakan masuk dulu.");
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    return { uid: decoded.uid, email: decoded.email, role: roleFromClaims(decoded) };
  } catch (err) {
    if (authCode(err) === "auth/user-disabled") throw new HttpError(401, "Akun ini sedang dinonaktifkan admin.");
    throw new HttpError(401, "Sesi kamu sudah berakhir. Silakan masuk lagi.");
  }
}

/** Seperti `verifyRequest`, ditambah cek peran: 401 bila belum masuk, 403 bila perannya tidak cocok. */
export async function requireRole(req: Request, role: Role): Promise<Caller> {
  const caller = await verifyRequest(req);
  if (caller.role !== role) throw new HttpError(403, role === "admin" ? "Halaman ini khusus admin." : "Akun admin tidak bisa memakai fitur ini.");
  return caller;
}
