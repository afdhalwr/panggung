import { expect, test } from "@playwright/test";
import { emulatorIdToken, holdAndFillBuyer, loginAsAdmin, loginAsDemo, pickFirstAvailableSeat } from "./helpers";

test("pengguna biasa tidak bisa membuka dashboard maupun API admin", async ({ page, request }) => {
  await loginAsDemo(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/403/);
  await expect(page.getByRole("heading", { name: "Halaman ini khusus admin" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  expect((await request.get("/api/admin/stats")).status()).toBe(401);
  const token = await emulatorIdToken(request, "demo@panggung.id", "demo1234");
  const res = await request.get("/api/admin/stats", { headers: { authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(403);
  const refund = await request.post("/api/admin/orders/apa-saja/refund", { headers: { authorization: `Bearer ${token}` } });
  expect(refund.status()).toBe(403);
});

test("admin memblokir kursi dan kursi itu langsung tidak dijual di denah pembeli", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/events/evt-rinai-teater?tab=kursi");
  const map = page.getByRole("group", { name: /Denah kursi admin/ });
  await expect(page.locator('[data-seat-map][aria-busy="false"]')).toBeVisible();
  const seat = map.getByRole("checkbox", { name: /tersedia$/ }).last();
  const seatId = /Kursi (\w+),/.exec((await seat.getAttribute("aria-label")) ?? "")?.[1] ?? "";
  await seat.click();
  await page.getByRole("button", { name: "Blokir 1 kursi" }).click();
  await expect(page.getByText("1 kursi diblokir.")).toBeVisible();
  await expect(map.getByRole("checkbox", { name: new RegExp(`Kursi ${seatId},.*tidak dijual`) })).toBeVisible();

  // Denah pembeli membaca status yang sama secara real-time.
  await page.goto("/events/rinai-di-teater/seats");
  await expect(page.locator('[data-seat-map][aria-busy="false"]')).toBeVisible();
  await expect(page.getByRole("checkbox", { name: new RegExp(`Kursi ${seatId},.*tidak dijual`) })).toBeVisible();

  // Kembalikan seperti semula agar tes lain dan data demo tidak terpengaruh.
  await page.goto("/admin/events/evt-rinai-teater?tab=kursi");
  await expect(page.locator('[data-seat-map][aria-busy="false"]')).toBeVisible();
  await map.getByRole("checkbox", { name: new RegExp(`Kursi ${seatId},.*tidak dijual`) }).click();
  await page.getByRole("button", { name: "Buka 1 kursi" }).click();
  await expect(page.getByText("1 kursi dibuka kembali.")).toBeVisible();
});

test("tiket baru valid saat dipindai pertama kali, lalu ditolak sebagai sudah dipakai", async ({ browser }) => {
  // Dua login (pembeli lalu petugas) dan satu checkout penuh: lebih lama dari batas bawaan 60 detik.
  test.setTimeout(120_000);
  // Pembeli membeli tiket di satu browser...
  const buyer = await browser.newPage();
  await loginAsDemo(buyer);
  await pickFirstAvailableSeat(buyer);
  await holdAndFillBuyer(buyer);
  await buyer.getByRole("button", { name: /^Bayar Rp/ }).click();
  await expect(buyer.getByRole("heading", { name: "Pembayaran berhasil" })).toBeVisible({ timeout: 30_000 });
  const ticketId = /\/tickets\/(\w+)/.exec(buyer.url())?.[1] ?? "";
  expect(ticketId).not.toBe("");
  await buyer.close();

  // ...petugas memvalidasinya di browser lain.
  const gate = await browser.newPage();
  await loginAsAdmin(gate);
  await gate.goto("/admin/scan");
  const input = gate.getByLabel("Kode tiket");
  await input.fill(ticketId);
  await gate.getByRole("button", { name: "Periksa" }).click();
  await expect(gate.getByText("Valid", { exact: true })).toBeVisible();
  await gate.getByRole("button", { name: "Periksa" }).click();
  await expect(gate.getByText("Sudah dipakai", { exact: true })).toBeVisible();

  await input.fill("PANGGUNG.palsu1234567890.0000000000000000");
  await gate.getByRole("button", { name: "Periksa" }).click();
  await expect(gate.getByText("Tidak dikenal", { exact: true })).toBeVisible();
  await gate.close();
});
