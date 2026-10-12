"use client";

import { useSyncExternalStore } from "react";
import { SESSION_COOKIE, parseRole, type Role } from "./session-cookie";

/**
 * Petunjuk sesi terakhir (nama + email) di localStorage. Dipakai header untuk langsung
 * menampilkan avatar saat halaman dimuat, sebelum Firebase Auth selesai dimuat,
 * supaya tidak ada skeleton yang berkedip. Bukan sumber kebenaran: Firebase tetap yang menentukan.
 */
export type AuthHint = { uid: string; name: string; email: string; role: Role };

const KEY = "panggung-auth-hint";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: AuthHint | null } = { raw: null, value: null };

function read(): AuthHint | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cache.raw) {
    try {
      cache = { raw, value: raw ? (JSON.parse(raw) as AuthHint) : null };
    } catch {
      cache = { raw, value: null };
    }
  }
  return cache.value;
}

/** Peran dari cookie petunjuk yang di-set server bersama session cookie; null bila belum ada sesi di server. */
export function readCookieRole(): Role | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return parseRole(m?.[1]);
}

export function writeAuthHint(hint: AuthHint | null) {
  // Cookie petunjuk dihapus segera agar middleware langsung konsisten; cookie httpOnly dihapus lewat DELETE /api/session.
  if (!hint) document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    if (hint) localStorage.setItem(KEY, JSON.stringify(hint));
    else localStorage.removeItem(KEY);
  } catch {
    // mode privat: header kembali ke perilaku tanpa petunjuk
  }
  listeners.forEach((l) => l());
}

export function hasAuthHint(): boolean {
  return read() !== null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** `undefined` saat render di server/hydration, lalu petunjuk (atau null) di browser. */
export function useAuthHint(): AuthHint | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
