import { notFound } from "next/navigation";

// Semua alamat yang tidak dikenal diarahkan ke 404 milik (site), supaya halaman 404 tetap memakai header dan footer.
export default function Missing() {
  notFound();
}
