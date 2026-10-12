import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/motion/navigation-progress";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import "./globals.css";
import { Providers } from "./providers";

// Font di-host sendiri (SIL Open Font License) agar build tidak bergantung pada unduhan Google Fonts.
const bricolage = localFont({
  src: "../fonts/bricolage.woff2",
  variable: "--font-bricolage",
  weight: "600 800",
  display: "swap",
});

const jakarta = localFont({
  src: "../fonts/jakarta.woff2",
  variable: "--font-jakarta",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Panggung — Tiket konser", template: "%s · Panggung" },
  description: "Cari konser, pilih kursimu sendiri, dan simpan e-ticket di HP.",
  openGraph: { siteName: "Panggung", locale: "id_ID", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b10",
};

// Dijalankan sebelum render agar tidak ada kedipan saat pengguna memilih mode terang.
// Kelas .js menandai JavaScript aktif (untuk animasi muncul saat scroll).
const themeScript = `document.documentElement.classList.add('js');try{if(localStorage.getItem('panggung-theme')==='light')document.documentElement.classList.add('light')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${bricolage.variable} ${jakarta.variable} flex min-h-dvh flex-col antialiased`}>
        <Providers>
          <SmoothScroll />
          <Suspense>
            <NavigationProgress />
          </Suspense>
          <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
            Lewati ke konten
          </a>
          {/* Header, footer, dan <main id="konten"> ada di layout (site) dan admin masing-masing. */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
