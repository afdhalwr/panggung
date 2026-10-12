import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SeatMap, type SeatView } from "./seat-map";

const categories = [{ id: "vip", name: "VIP", price: 1_500_000, color: "#B794F6" }];
const mk = (row: string, number: number, x: number, y: number, status: SeatView["status"] = "available"): SeatView => ({
  id: `${row}${number}`,
  section: "vip",
  row,
  number,
  categoryId: "vip",
  x,
  y,
  status,
});
const seats = [mk("A", 1, 100, 100), mk("A", 2, 130, 100), mk("A", 3, 160, 100, "sold"), mk("B", 1, 100, 130), mk("B", 2, 130, 130)];

function setup(onToggle = vi.fn()) {
  render(<SeatMap seats={seats} width={300} height={200} categories={categories} onToggle={onToggle} />);
  return { onToggle, user: userEvent.setup() };
}

describe("SeatMap", () => {
  it("memberi label lengkap untuk screen reader", () => {
    setup();
    expect(screen.getByRole("checkbox", { name: "Kursi A1, VIP, Rp1.500.000, tersedia" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Kursi A3.*terjual/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("hanya satu kursi yang bisa di-Tab (roving tabindex)", () => {
    setup();
    const tabbable = screen.getAllByRole("checkbox").filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("panah kanan dan bawah memindahkan fokus antar kursi", async () => {
    const { user } = setup();
    await user.tab();
    expect(screen.getByRole("checkbox", { name: /Kursi A1,/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("checkbox", { name: /Kursi A2,/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("checkbox", { name: /Kursi B2,/ })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("checkbox", { name: /Kursi B1,/ })).toHaveFocus();
  });

  it("Enter dan Spasi memilih kursi", async () => {
    const { user, onToggle } = setup();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "A1" }));
    await user.keyboard("{ArrowRight}[Space]");
    expect(onToggle).toHaveBeenLastCalledWith(expect.objectContaining({ id: "A2" }));
  });

  it("kursi terjual tidak bisa dipilih", async () => {
    const { user, onToggle } = setup();
    await user.click(screen.getByRole("checkbox", { name: /Kursi A3,/ }));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
