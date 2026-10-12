import { NextResponse } from "next/server";
import { ID_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE_S, type Role } from "@/features/auth/session-cookie";
import { adminAuth } from "@/lib/firebase/admin";
import { verifyRequest } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { clearSessionCookies } from "@/server/session-cookies";

export const dynamic = "force-dynamic";

/** Tukar ID token (Bearer) dengan Firebase session cookie httpOnly + petunjuk peran. */
export async function POST(req: Request) {
  try {
    const caller = await verifyRequest(req);
    const idToken = req.headers.get("authorization")!.slice(7);
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_S * 1000 });
    const res = NextResponse.json<{ role: Role }>({ role: caller.role });
    const base = { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: SESSION_MAX_AGE_S };
    res.cookies.set(ID_COOKIE, sessionCookie, { ...base, httpOnly: true });
    res.cookies.set(SESSION_COOKIE, caller.role, base);
    return res;
  } catch (err) {
    const res = errorResponse(err);
    return res.status === 401 ? clearSessionCookies(res) : res;
  }
}

export async function DELETE() {
  return clearSessionCookies(NextResponse.json({ ok: true }));
}
