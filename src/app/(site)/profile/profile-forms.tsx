"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { authErrorMessage, useAuth } from "@/features/auth/auth-provider";
import { DEMO_EMAILS } from "@/features/auth/demo-accounts";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

const nameSchema = z.object({ name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(80, "Nama terlalu panjang.") });

const passwordSchema = z
  .object({
    current: z.string().min(1, "Isi kata sandi saat ini."),
    next: z.string().min(8, "Kata sandi baru minimal 8 karakter."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Konfirmasi belum sama dengan kata sandi baru.", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "Kata sandi baru harus berbeda.", path: ["next"] });

const inputCls = (invalid: boolean) =>
  cn("h-12 w-full rounded-xl border bg-surface px-4 text-[15px] outline-none focus:border-primary", invalid ? "border-danger" : "border-line");

export function ProfileForms() {
  const { user, role } = useAuth();
  const isDemo = DEMO_EMAILS.includes(user?.email ?? "");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Profil</h1>
        <p className="mt-1 text-muted">
          {user?.email} · <span className="font-semibold text-primary">{role === "admin" ? "Admin" : "Pengguna"}</span>
        </p>
      </div>
      <NameForm initial={user?.displayName ?? ""} />
      {isDemo ? (
        <section className="rounded-[var(--radius-card)] border border-dashed border-line p-5 text-sm text-muted">
          <h2 className="mb-1 font-display text-xl font-bold text-fg">Kata sandi</h2>
          Kata sandi akun demo tidak bisa diubah, supaya pengunjung lain tetap bisa masuk. Buat akun sendiri untuk mencoba fitur ini.
        </section>
      ) : (
        <PasswordForm />
      )}
    </div>
  );
}

function NameForm({ initial }: { initial: string }) {
  const form = useForm<z.infer<typeof nameSchema>>({ resolver: zodResolver(nameSchema), defaultValues: { name: initial } });
  const error = form.formState.errors.name?.message;

  async function onSubmit({ name }: z.infer<typeof nameSchema>) {
    const [auth, { updateProfile }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    try {
      await updateProfile(auth.currentUser!, { displayName: name });
      toast.success("Nama tersimpan.");
      form.reset({ name });
    } catch (err) {
      toast.error(authErrorMessage(err));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5" noValidate>
      <h2 className="font-display text-xl font-bold">Data diri</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profil-nama" className="text-sm font-semibold">
          Nama tampilan
        </label>
        <input
          id="profil-nama"
          autoComplete="name"
          {...form.register("name")}
          aria-invalid={!!error}
          aria-describedby={error ? "profil-nama-err" : undefined}
          className={inputCls(!!error)}
        />
        {error && (
          <p id="profil-nama-err" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="self-start" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
        {form.formState.isSubmitting ? "Menyimpan…" : "Simpan nama"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const [serverError, setServerError] = useState("");
  const { errors } = form.formState;

  async function onSubmit(v: z.infer<typeof passwordSchema>) {
    setServerError("");
    const [auth, { EmailAuthProvider, reauthenticateWithCredential, updatePassword }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
    const u = auth.currentUser!;
    try {
      // Firebase meminta login ulang sebelum mengganti kata sandi; sekaligus memastikan sandi lama benar.
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email!, v.current));
      await updatePassword(u, v.next);
      toast.success("Kata sandi berhasil diubah.");
      form.reset();
    } catch (err) {
      const msg = authErrorMessage(err);
      setServerError(msg === "Email atau kata sandi salah." ? "Kata sandi saat ini salah." : msg);
    }
  }

  const field = (name: "current" | "next" | "confirm", label: string, autoComplete: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`sandi-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={`sandi-${name}`}
        type="password"
        autoComplete={autoComplete}
        {...form.register(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `sandi-${name}-err` : undefined}
        className={inputCls(!!errors[name])}
      />
      {errors[name] && (
        <p id={`sandi-${name}-err`} className="text-sm text-danger">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5" noValidate>
      <h2 className="font-display text-xl font-bold">Ubah kata sandi</h2>
      {field("current", "Kata sandi saat ini", "current-password")}
      {field("next", "Kata sandi baru", "new-password")}
      {field("confirm", "Ulangi kata sandi baru", "new-password")}
      {serverError && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" className="self-start" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Menyimpan…" : "Ubah kata sandi"}
      </Button>
    </form>
  );
}
