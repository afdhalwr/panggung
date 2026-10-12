import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-display font-bold text-fg">panggung</span> · proyek portofolio. Semua konser, artis, dan
          pembayaran di sini fiktif.
        </p>
        <p>
          Dibuat oleh{" "}
          <a href="https://www.linkedin.com/in/afdhal-anwar-431779211" className="font-medium text-fg underline-offset-4 hover:underline">
            Afdhal Anwar
          </a>{" "}
          ·{" "}
          <a href="https://github.com/afdhalwr/panggung" className="font-medium text-fg underline-offset-4 hover:underline">
            Kode di GitHub
          </a>{" "}
          · <Link href="/events" className="hover:text-fg">Semua konser</Link>
        </p>
      </div>
    </footer>
  );
}
