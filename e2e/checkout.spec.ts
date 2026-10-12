import { expect, test } from "@playwright/test";
import { holdAndFillBuyer, loginAsDemo, pickFirstAvailableSeat } from "./helpers";

test("akun demo: pilih kursi, checkout, dan menerima e-ticket", async ({ page }) => {
  await loginAsDemo(page);
  const seatId = await pickFirstAvailableSeat(page);
  await holdAndFillBuyer(page);

  await page.getByRole("button", { name: /^Bayar Rp/ }).click();
  // Halaman e-ticket bisa butuh waktu kompilasi pertama di mode dev.
  await expect(page.getByRole("heading", { name: "Pembayaran berhasil" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("img", { name: /Kode QR tiket/ })).toBeVisible();
  await expect(page.getByText(seatId, { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Lihat Tiket Saya" }).click();
  await expect(page.getByRole("heading", { name: "Tiket Saya" })).toBeVisible();
});

test("pembayaran gagal bisa dicoba lagi tanpa kehilangan kursi", async ({ page }) => {
  await loginAsDemo(page);
  await pickFirstAvailableSeat(page);
  await holdAndFillBuyer(page);

  await page.getByRole("button", { name: "Simulasikan gagal" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pembayaran belum berhasil" })).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();

  await page.getByRole("button", { name: /^Bayar Rp/ }).click();
  // Halaman e-ticket bisa butuh waktu kompilasi pertama di mode dev.
  await expect(page.getByRole("heading", { name: "Pembayaran berhasil" })).toBeVisible({ timeout: 30_000 });
});

test("kursi dilepas saat waktu hold habis", async ({ page }) => {
  await page.clock.install();
  await loginAsDemo(page);
  await pickFirstAvailableSeat(page);
  await page.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/data/, { timeout: 30_000 });

  await page.clock.fastForward("10:05");
  const dialog = page.getByRole("dialog", { name: "Waktu habis, kursi dilepas" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Pilih kursi lagi" }).click();
  await expect(page).toHaveURL(/\/events\/rinai-di-teater\/seats/);
});
