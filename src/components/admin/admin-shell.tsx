"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { CalendarRange, ExternalLink, LayoutDashboard, LogOut, ReceiptText, ScanLine, ShieldCheck, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Event", icon: CalendarRange },
  { href: "/admin/orders", label: "Pesanan", icon: ReceiptText },
  { href: "/admin/scan", label: "Validasi tiket", icon: ScanLine },
  { href: "/admin/users", label: "Pengguna", icon: Users },
];

/**
 * Kerangka dashboard admin: sidebar di layar lebar, baris menu yang bisa digeser di HP.
 * Aksesnya sudah diverifikasi di server (layout admin); komponen ini hanya mengalihkan
 * bila pengguna keluar dari tab ini atau tab lain.
 */
export function AdminShell({ name, email, children }: { name: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  const nav = useRef<HTMLElement>(null);

  // Di HP menu berupa baris yang bisa digeser: pastikan menu aktif terlihat.
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && nav.current && nav.current.scrollWidth > nav.current.clientWidth) {
      nav.current.scrollLeft = el.offsetLeft - (nav.current.clientWidth - el.offsetWidth) / 2;
    }
  }, [pathname]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) router.replace(user ? "/403" : "/login?next=/admin");
  }, [loading, user, role, router]);

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row" data-admin>
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-2 px-4 lg:px-5">
          <Link href="/admin" className="pressable font-display text-2xl font-extrabold tracking-tight text-primary">
            panggung
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="size-3.5" aria-hidden /> Admin
          </span>
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav ref={nav} aria-label="Menu admin" className="relative -mb-px flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0 lg:pt-2">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium",
                  active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
                )}
              >
                <Icon className={cn("size-4", active && "text-primary")} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-line p-4 lg:block">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
          <div className="mt-3 flex items-center gap-1">
            <ThemeToggle />
            <Link href="/" className="pressable grid size-10 place-items-center rounded-full text-muted hover:bg-elevated hover:text-fg" title="Lihat situs">
              <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">Lihat situs pengguna</span>
            </Link>
            <button
              type="button"
              onClick={() => void signOut().then(() => router.replace("/login"))}
              className="pressable ml-auto inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted hover:bg-elevated hover:text-fg"
            >
              <LogOut className="size-4" aria-hidden /> Keluar
            </button>
          </div>
        </div>
      </aside>
      <main id="konten" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
        <div className="mt-10 flex items-center justify-between border-t border-line pt-4 text-sm text-muted lg:hidden">
          <span className="truncate">{email}</span>
          <button type="button" onClick={() => void signOut().then(() => router.replace("/login"))} className="pressable inline-flex items-center gap-2 font-medium hover:text-fg">
            <LogOut className="size-4" aria-hidden /> Keluar
          </button>
        </div>
      </main>
    </div>
  );
}
