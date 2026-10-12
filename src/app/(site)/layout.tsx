import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Layout sisi pengguna: header dan footer publik. Dashboard admin punya layout sendiri. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
