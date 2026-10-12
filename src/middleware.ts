import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, allowedFor, homeFor, parseRole } from "@/features/auth/session-cookie";

const PROTECTED = ["/tickets", "/checkout", "/admin", "/profile"];

/**
 * Pengalihan di server supaya halaman tidak sempat tampil lalu "melompat":
 * - halaman yang butuh login → /login bila belum ada sesi,
 * - /admin untuk pengguna biasa → /403; /tickets dan /checkout untuk admin → /admin,
 * - /login → tujuan (atau halaman awal sesuai peran) bila sudah ada sesi.
 * Peran di sini hanya petunjuk dari cookie. Keamanan tetap di server: layout admin memverifikasi
 * session cookie, dan setiap Route Handler memverifikasi ID token beserta perannya.
 */
export function middleware(req: NextRequest) {
  const role = parseRole(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;
  const redirectTo = (path: string, query = "") => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.search = query;
    return NextResponse.redirect(url);
  };

  if (pathname === "/login") {
    if (!role) return NextResponse.next();
    const next = req.nextUrl.searchParams.get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : null;
    const [path, query] = safe && allowedFor(role, safe.split("?")[0]!) ? safe.split("?") : [homeFor(role)];
    return redirectTo(path!, query ? `?${query}` : "");
  }

  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (!role) return redirectTo("/login", `?next=${encodeURIComponent(pathname + search)}`);
  if (!allowedFor(role, pathname)) return redirectTo(role === "admin" ? "/admin" : "/403");

  // Layout admin butuh path asli untuk tujuan kembali setelah sesi diperbarui.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/login", "/tickets/:path*", "/checkout/:path*", "/admin/:path*", "/admin", "/profile"],
};
