import "server-only";
import type { NextResponse } from "next/server";
import { ID_COOKIE, SESSION_COOKIE } from "@/features/auth/session-cookie";

export function clearSessionCookies<T extends NextResponse>(res: T): T {
  res.cookies.set(ID_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
