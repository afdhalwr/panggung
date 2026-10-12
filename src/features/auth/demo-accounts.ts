/** Akun demo untuk penilai portofolio. Dipakai halaman masuk (klien) dan perlindungan data demo (server). */
export const DEMO_ACCOUNTS = {
  user: { email: "demo@panggung.id", password: "demo1234" },
  admin: { email: "admin@panggung.id", password: "admin1234" },
} as const;

export const DEMO_EMAILS: readonly string[] = [DEMO_ACCOUNTS.user.email, DEMO_ACCOUNTS.admin.email];
