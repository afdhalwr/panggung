import { describe, expect, it } from "vitest";
import type { Event } from "./schemas";
import { buildStats, resolveRange, wibDay, type PaidOrder } from "./stats";

// 12 Okt 2026 10.00 WIB
const NOW = Date.parse("2026-10-12T03:00:00Z");

function event(id: string, over: Partial<Event> = {}): Event {
  return {
    id,
    slug: id,
    title: `Konser ${id}`,
    artist: "A",
    genre: "pop",
    city: "Jakarta",
    venueId: "v",
    date: "2026-12-01T12:00:00Z",
    salesOpenAt: "2026-09-01T00:00:00Z",
    description: "",
    lineup: [],
    palette: ["#000000", "#ffffff"],
    pattern: "grid",
    photo: "",
    popularity: 1,
    status: "published",
    categories: [{ id: "f", name: "Festival", price: 100_000, type: "festival", quota: 100, sold: 40 }],
    ...over,
  };
}

const paid = (eventId: string, qty: number, paidAt: number): PaidOrder => ({
  eventId,
  items: [{ categoryId: "f", qty }],
  total: qty * 100_000,
  paidAt,
});

describe("wibDay & resolveRange", () => {
  it("memakai tanggal WIB, bukan UTC", () => {
    expect(wibDay(Date.parse("2026-10-11T18:30:00Z"))).toBe("2026-10-12");
  });
  it("bawaan 30 hari terakhir sampai hari ini", () => {
    expect(resolveRange({}, NOW)).toEqual({ from: "2026-09-13", to: "2026-10-12" });
  });
  it("menukar rentang terbalik dan mengabaikan tanggal tidak valid", () => {
    expect(resolveRange({ from: "2026-10-05", to: "2026-10-01" }, NOW)).toEqual({ from: "2026-10-01", to: "2026-10-05" });
    expect(resolveRange({ from: "kemarin" }, NOW).from).toBe("2026-09-13");
  });
});

describe("buildStats", () => {
  const events = [event("a"), event("b", { date: "2026-11-01T12:00:00Z" }), event("draft", { status: "draft" })];
  const orders = [
    paid("a", 2, Date.parse("2026-10-12T01:00:00Z")),
    paid("a", 1, Date.parse("2026-10-01T01:00:00Z")),
    paid("b", 4, Date.parse("2026-08-01T01:00:00Z")), // di luar rentang
    paid("draft", 3, Date.parse("2026-10-10T01:00:00Z")),
  ];

  it("KPI hanya menghitung order di rentang tanggal dan event yang bukan draft", () => {
    const s = buildStats(events, orders, {}, NOW);
    expect(s.kpi).toMatchObject({ tickets: 3, revenue: 300_000, orders: 2 });
  });

  it("mengisi setiap hari di rentang, termasuk hari tanpa penjualan", () => {
    const s = buildStats(events, orders, { from: "2026-10-10", to: "2026-10-12" }, NOW);
    expect(s.daily.map((d) => [d.day, d.tickets])).toEqual([
      ["2026-10-10", 0],
      ["2026-10-11", 0],
      ["2026-10-12", 2],
    ]);
  });

  it("okupansi memakai penjualan seed + seluruh penjualan aplikasi, tidak terpotong rentang", () => {
    const s = buildStats(events, orders, {}, NOW);
    const b = s.events.find((e) => e.id === "b")!;
    expect(b.sold).toBe(44);
    expect(s.kpi.occupancy).toBeCloseTo((43 + 44) / 200);
    expect(s.events.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("filter event mempersempit KPI dan okupansi", () => {
    const s = buildStats(events, orders, { eventId: "a" }, NOW);
    expect(s.events).toHaveLength(1);
    expect(s.kpi.occupancy).toBeCloseTo(43 / 100);
  });
});
