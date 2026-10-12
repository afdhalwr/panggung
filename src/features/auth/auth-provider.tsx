"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { firebase } from "@/lib/firebase/client";

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
    return onAuthStateChanged(firebase().auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebase().auth, email, password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(firebase().auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    setUser({ ...cred.user, displayName: name } as User);
  }, []);

  const signInDemo = useCallback(() => signIn(DEMO_EMAIL, DEMO_PASSWORD), [signIn]);

  const signOut = useCallback(async () => {
    await fbSignOut(firebase().auth);
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
