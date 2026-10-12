"use client";

import { Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthHint } from "@/features/auth/auth-hint";
import { DEMO_EMAIL, DEMO_PASSWORD, authErrorMessage, useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

const input = "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-primary";

export function LoginForm() {
  const { user, loading, signIn, signUp, signInDemo } = useAuth();
  const hint = useAuthHint();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  async function run(kind: "form" | "demo", fn: () => Promise<void>) {
    setError("");
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    void run("form", () => (mode === "masuk" ? signIn(email, password) : signUp(String(f.get("name")), email, password)));
  }

  // Sesi tercatat sedang diperiksa (atau sudah login dan akan dialihkan): jangan tampilkan formulir sebentar lalu hilang.
  if (user || (loading && hint)) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-card)] border border-primary/40 bg-primary/10 p-5">
        <p className="font-semibold">Mau langsung coba?</p>
        <p className="mt-1 text-sm text-muted">
          Akun demo sudah punya riwayat tiket. Email <code className="text-fg">{DEMO_EMAIL}</code>, sandi{" "}
          <code className="text-fg">{DEMO_PASSWORD}</code>.
        </p>
        <Button className="mt-4 w-full" onClick={() => void run("demo", signInDemo)} disabled={busy !== null}>
          <Sparkles /> {busy === "demo" ? "Masuk…" : "Masuk sebagai demo"}
        </Button>
      </div>

      <div className="flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Pilih masuk atau daftar">
        {(["masuk", "daftar"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={cn("pressable flex-1 rounded-full py-2 text-sm font-semibold capitalize", mode === m ? "bg-elevated text-fg" : "text-muted hover:text-fg")}
          >
            {m}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
        {mode === "daftar" && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Nama
            <input name="name" required minLength={3} autoComplete="name" className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Email
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Kata sandi
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "masuk" ? "current-password" : "new-password"}
            className={input}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="secondary" size="lg" disabled={busy !== null}>
          {busy === "form" ? "Memproses…" : mode === "masuk" ? "Masuk" : "Buat akun"}
        </Button>
      </form>
    </div>
  );
}

// Hanya izinkan redirect ke path internal agar tidak bisa dipakai untuk open redirect.
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/tickets";
}
