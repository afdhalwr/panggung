"use client";

import type { User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { hasAuthHint, writeAuthHint } from "./auth-hint";

export const DEMO_EMAIL = "demo@panggung.id";
export const DEMO_PASSWORD = "demo1234";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    const start = () =>
      void Promise.all([getFirebaseAuth(), import("firebase/auth")]).then(([auth, { onAuthStateChanged }]) => {
        if (cancelled) return;
        unsub = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
          writeAuthHint(u ? { name: u.displayName || u.email?.split("@")[0] || "Akun", email: u.email ?? "" } : null);
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
    const [auth, { signInWithEmailAndPassword }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const [auth, { createUserWithEmailAndPassword, updateProfile }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    setUser({ ...cred.user, displayName: name } as User);
  }, []);

  const signInDemo = useCallback(() => signIn(DEMO_EMAIL, DEMO_PASSWORD), [signIn]);

  const signOut = useCallback(async () => {
    const [auth, { signOut: fbSignOut }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInDemo, signOut }),
    [user, loading, signIn, signUp, signInDemo, signOut],
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
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Silakan masuk.";
    case "auth/weak-password":
      return "Kata sandi minimal 6 karakter.";
    case "auth/invalid-email":
      return "Format email belum benar.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    case "auth/network-request-failed":
      return "Koneksi bermasalah. Periksa internet kamu.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}
