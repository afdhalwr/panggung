import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
const themeScript = `try{if(localStorage.getItem('panggung-theme')==='light')document.documentElement.classList.add('light')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${bricolage.variable} ${jakarta.variable} antialiased`}>{children}</body>
    </html>
  );
}
