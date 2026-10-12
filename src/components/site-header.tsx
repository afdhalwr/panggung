import Link from "next/link";
import { AccountButton } from "@/features/auth/account-button";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-primary">
          panggung
        </Link>
        <nav aria-label="Navigasi utama" className="ml-4 hidden gap-1 sm:flex">
          <Link href="/events" className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-fg">
            Konser
          </Link>
          <Link href="/tickets" className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-fg">
            Tiket Saya
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
