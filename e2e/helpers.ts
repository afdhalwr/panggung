import { expect, type Page } from "@playwright/test";

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  // Tombol "Masuk" di header baru dirender setelah hydration: tanda aplikasi siap menerima klik.
  await expect(page.getByRole("banner").getByRole("link", { name: "Masuk" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Masuk sebagai demo" }).click();
  await expect(page).toHaveURL(/\/tickets/, { timeout: 20_000 });
}

/** Pilih kursi pertama yang tersedia di denah, kembalikan nomornya. */
export async function pickFirstAvailableSeat(page: Page, slug = "rinai-di-teater") {
  await page.goto(`/events/${slug}/seats`);
  // Tunggu status kursi dari Firestore, supaya tidak memilih kursi yang ternyata sudah terjual.
  await expect(page.locator('[data-seat-map][aria-busy="false"]')).toBeVisible();
  const seat = page.getByRole("checkbox", { name: /tersedia$/ }).first();
  await expect(seat).toBeVisible();
  const label = (await seat.getAttribute("aria-label")) ?? "";
  const seatId = /Kursi (\w+),/.exec(label)?.[1] ?? "";
  // Fokus lalu Enter: sekaligus menguji jalur keyboard seat map.
  await seat.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("checkbox", { name: new RegExp(`Kursi ${seatId},.*dipilih`) })).toBeVisible();
  return seatId;
}

export async function holdAndFillBuyer(page: Page) {
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/data/);
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByLabel("Nama lengkap").fill("Nadia Putri");
  await page.getByLabel("Nomor HP").fill("081234567890");
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await expect(page).toHaveURL(/\/checkout\/pembayaran/);
  await page.getByText("Virtual Account").click();
  await page.getByRole("button", { name: "Lanjut ke konfirmasi" }).click();
  await expect(page).toHaveURL(/\/checkout\/konfirmasi/);
}
