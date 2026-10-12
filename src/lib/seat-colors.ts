/** Warna garis tepi kursi per kategori (status "tersedia"). Status lain memakai token --seat-*. */
export const CATEGORY_COLORS: Record<string, string> = {
  vip: "#B794F6",
  gold: "#4FD1C5",
  silver: "#90CDF4",
};

export function categoryColor(id: string): string {
  return CATEGORY_COLORS[id] ?? "var(--seat-available)";
}
