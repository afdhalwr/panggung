import "server-only";
import { adminAuth } from "@/lib/firebase/admin";
import { HttpError } from "./http";

/** Ambil uid dari header `Authorization: Bearer <ID token Firebase>`. */
export async function verifyRequest(req: Request): Promise<{ uid: string; email?: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Silakan masuk dulu.");
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new HttpError(401, "Sesi kamu sudah berakhir. Silakan masuk lagi.");
  }
}
