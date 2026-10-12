import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/session-cookie";

/**
 * Pengalihan di server supaya halaman tidak sempat tampil lalu "melompat":
 * - halaman yang butuh login → /login bila belum ada sesi,
 * - /login → tujuan (atau Tiket Saya) bila sudah ada sesi.
 * Ini hanya untuk UX. Keamanan tetap di Route Handler (verifikasi ID token) dan Firestore rules.
 * Bila cookie ternyata basi, AuthProvider menghapusnya begitu Firebase menyatakan tidak ada user,
 * sehingga tidak terjadi pengalihan berputar.
 */
export function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;
  const { pathname, search } = req.nextUrl;

  if (pathname === "/login") {
    if (!hasSession) return NextResponse.next();
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next.split("?")[0]! : "/tickets";
    url.search = next?.includes("?") ? `?${next.split("?")[1]}` : "";
    return NextResponse.redirect(url);
  }

  if (hasSession) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/login", "/tickets/:path*", "/checkout/:path*"],
};
