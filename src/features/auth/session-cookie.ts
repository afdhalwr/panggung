/**
 * Dua cookie sesi, keduanya di-set oleh `POST /api/session`:
 * - `panggung_id`: Firebase session cookie (httpOnly). Sumber kebenaran untuk halaman yang diverifikasi di server (admin).
 * - `panggung_session`: petunjuk peran (`user` / `admin`) yang bisa dibaca middleware di edge dan JavaScript di browser.
 *   Hanya untuk UX (pengalihan tanpa kedipan); keamanan tetap di server.
 */
export const SESSION_COOKIE = "panggung_session";
export const ID_COOKIE = "panggung_id";

/** Umur sesi: 5 hari (batas Firebase 14 hari). */
export const SESSION_MAX_AGE_S = 5 * 24 * 60 * 60;

export type Role = "user" | "admin";

export function parseRole(value: string | undefined | null): Role | null {
  return value === "admin" || value === "user" ? value : null;
}

/** Peran dari custom claims Firebase; akun tanpa claim adalah pengguna biasa. */
export function roleFromClaims(claims: Record<string, unknown>): Role {
  return claims.role === "admin" ? "admin" : "user";
}

/** Tujuan bawaan setelah masuk: admin ke dashboard, pengguna ke Tiket Saya. */
export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : "/tickets";
}

/** Halaman yang tidak untuk peran tertentu (admin tidak membeli tiket; pengguna tidak membuka dashboard). */
export function allowedFor(role: Role, path: string): boolean {
  const adminOnly = path === "/admin" || path.startsWith("/admin/");
  const buyerOnly = path.startsWith("/tickets") || path.startsWith("/checkout");
  return role === "admin" ? !buyerOnly : !adminOnly;
}
