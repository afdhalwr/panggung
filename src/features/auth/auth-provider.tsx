"use client";

import type { User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { hasAuthHint, readCookieRole, writeAuthHint } from "./auth-hint";
import { DEMO_ACCOUNTS } from "./demo-accounts";
import { roleFromClaims, type Role } from "./session-cookie";

type AuthState = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  /** Pesan untuk halaman masuk, misalnya saat akun dinonaktifkan admin. */
  notice: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInDemo: (kind: keyof typeof DEMO_ACCOUNTS) => Promise<void>;
  signOut: () => Promise<void>;
  /** Pastikan session cookie di server ada untuk pengguna saat ini; mengembalikan perannya. */
  ensureSession: () => Promise<Role | null>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Server menolak sesi (token tidak sah atau akun dinonaktifkan). */
class SessionRejected extends Error {}

/**
 * Tukar ID token dengan session cookie bila cookie petunjuk belum ada atau perannya berbeda.
 * Gagal jaringan tidak menghentikan login: halaman pembeli tetap memakai ID token di setiap request.
 */
async function syncSession(u: User): Promise<Role> {
  const result = await u.getIdTokenResult();
  const role = roleFromClaims(result.claims);
  if (readCookieRole() === role) return role;
  const res = await fetch("/api/session", { method: "POST", headers: { authorization: `Bearer ${result.token}` } }).catch(() => null);
  if (res?.status === 401) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new SessionRejected(body.error ?? "Sesi kamu sudah berakhir. Silakan masuk lagi.");
  }
  return role;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    const start = () =>
      void Promise.all([getFirebaseAuth(), import("firebase/auth")]).then(([auth, { onIdTokenChanged, signOut }]) => {
        if (cancelled) return;
        // onIdTokenChanged juga terpanggil saat token diperbarui tiap jam; syncSession hanya memanggil server bila perlu.
        unsub = onIdTokenChanged(auth, async (u) => {
          const mine = ++seq.current;
          if (u) {
            try {
              const r = await syncSession(u);
              if (mine !== seq.current) return;
              setUser(u);
              setRole(r);
              writeAuthHint({ uid: u.uid, name: u.displayName || u.email?.split("@")[0] || "Akun", email: u.email ?? "", role: r });
            } catch (err) {
              if (!(err instanceof SessionRejected)) throw err;
              setNotice(err.message);
              await signOut(auth);
              return;
            }
          } else {
            const hadSession = readCookieRole() !== null;
            writeAuthHint(null);
            if (hadSession) await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
            if (mine !== seq.current) return;
            setUser(null);
            setRole(null);
          }
          setLoading(false);
        });
      });
    // Pengunjung yang pernah login langsung butuh Auth (header, Tiket Saya), jadi dimuat segera.
    // Pengunjung baru menunggu browser senggang agar render awal (dan LCP) tidak berebut dengan SDK.
    // Safari lama belum punya requestIdleCallback.
    const hasIdle = !hasAuthHint() && typeof window.requestIdleCallback === "function";
    const handle = hasIdle ? window.requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 0);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle as number);
      else clearTimeout(handle);
      unsub?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setNotice("");
    const [auth, { signInWithEmailAndPassword }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setNotice("");
    const [auth, { createUserWithEmailAndPassword, updateProfile }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // Nama baru ditampilkan di header; bila sinkronisasi sesi belum selesai, onIdTokenChanged yang akan mengisinya.
    setUser((prev) => (prev?.uid === cred.user.uid ? ({ ...cred.user, displayName: name } as User) : prev));
  }, []);

  const signInDemo = useCallback((kind: keyof typeof DEMO_ACCOUNTS) => signIn(DEMO_ACCOUNTS[kind].email, DEMO_ACCOUNTS[kind].password), [signIn]);

  const signOut = useCallback(async () => {
    const [auth, { signOut: fbSignOut }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    await fbSignOut(auth);
  }, []);

  const ensureSession = useCallback(async () => {
    const u = (await getFirebaseAuth()).currentUser;
    if (!u) return null;
    try {
      return await syncSession(u);
    } catch (err) {
      if (!(err instanceof SessionRejected)) throw err;
      setNotice(err.message);
      await signOut();
      return null;
    }
  }, [signOut]);

  const value = useMemo(
    () => ({ user, role, loading, notice, signIn, signUp, signInDemo, signOut, ensureSession }),
    [user, role, loading, notice, signIn, signUp, signInDemo, signOut, ensureSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

/** Pesan error Firebase Auth dalam bahasa Indonesia. */
export function authErrorMessage(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau kata sandi salah.";
    case "auth/user-disabled":
      return "Akun ini sedang dinonaktifkan admin.";
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Silakan masuk.";
    case "auth/weak-password":
      return "Kata sandi minimal 6 karakter.";
    case "auth/invalid-email":
      return "Format email belum benar.";
    case "auth/requires-recent-login":
      return "Demi keamanan, masuk ulang dulu sebelum mengubah kata sandi.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    case "auth/network-request-failed":
      return "Koneksi bermasalah. Periksa internet kamu.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}
