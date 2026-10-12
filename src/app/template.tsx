/**
 * Dipasang ulang setiap pindah halaman, jadi halaman baru masuk dengan memudar halus.
 * Hanya opacity (tanpa transform), supaya elemen `position: fixed` di dalam halaman tidak ikut bergeser.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
