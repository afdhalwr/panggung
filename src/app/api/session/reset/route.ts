import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookies } from "@/server/session-cookies";

export const dynamic = "force-dynamic";

/** Sesi di cookie sudah tidak sah (kedaluwarsa atau akun dinonaktifkan): bersihkan lalu ke halaman masuk. */
export function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  return clearSessionCookies(NextResponse.redirect(url));
}
