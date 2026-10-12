import { describe, expect, it } from "vitest";
import { filterEvents, getEventBySlug, getEvents, getVenue, minPrice, parseFilter, seatCategoryCounts } from "./catalog";

const all = getEvents();

describe("data seed", () => {
  it("berisi 12 event dengan slug unik", () => {
    expect(all).toHaveLength(12);
    expect(new Set(all.map((e) => e.slug)).size).toBe(12);
  });
  it("kuota kategori kursi dihitung dari denah venue", () => {
    const e = getEventBySlug("senja-ruah-tur-pulang")!;
    const venue = getVenue(e.venueId)!;
    const counts = seatCategoryCounts(venue);
    const vip = e.categories.find((c) => c.id === "vip")!;
    expect(vip.quota).toBe(counts.vip.total);
    expect(vip.sold).toBe(counts.vip.sold);
    expect(vip.quota).toBeGreaterThan(0);
  });
});

describe("filterEvents", () => {
  it("mencari tanpa peduli huruf besar di judul, artis, kota, dan lineup", () => {
    expect(filterEvents(all, { q: "SENJA" }).map((e) => e.slug)).toContain("senja-ruah-tur-pulang");
    expect(filterEvents(all, { q: "arunika" })).toHaveLength(2);
  });
  it("memfilter kota dan genre", () => {
    const r = filterEvents(all, { city: "Bandung", genre: "rock" });
    expect(r.map((e) => e.slug)).toEqual(["badai-pasir-live"]);
  });
  it("memfilter rentang tanggal (inklusif, per hari WIB)", () => {
    const r = filterEvents(all, { from: "2026-11-01", to: "2026-11-30" });
    expect(r.every((e) => e.date >= "2026-10-31" && e.date < "2026-12-01")).toBe(true);
    expect(r.map((e) => e.slug).sort()).toEqual(["badai-pasir-live", "gema-kidul-folk", "senja-ruah-tur-pulang"]);
  });
  it("memfilter rentang harga berdasarkan harga termurah event", () => {
    const r = filterEvents(all, { max: 200000 });
    expect(r.every((e) => minPrice(e) <= 200000)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
  it("mengurutkan berdasarkan harga dan tanggal", () => {
    const asc = filterEvents(all, { sort: "price-asc" }).map(minPrice);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const byDate = filterEvents(all, { sort: "date" }).map((e) => e.date);
    expect(byDate).toEqual([...byDate].sort());
  });
});

describe("parseFilter", () => {
  it("membaca query URL dan mengabaikan nilai tidak valid", () => {
    const f = parseFilter(new URLSearchParams("q=jazz&genre=metal&min=100000&max=abc&sort=price-desc&city=Medan"));
    expect(f).toEqual({ q: "jazz", min: 100000, sort: "price-desc", city: "Medan" });
  });
  it("menerima objek searchParams dari Next.js", () => {
    expect(parseFilter({ genre: "pop", from: "2026-12-01" })).toEqual({ genre: "pop", from: "2026-12-01" });
  });
});
