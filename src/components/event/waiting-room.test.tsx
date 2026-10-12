import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaitingRoom } from "./waiting-room";

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const ui = () =>
  render(
    <WaitingRoom eventId="e1" eventTitle="Konser Uji">
      <p>Pemilih tiket</p>
    </WaitingRoom>,
  );

describe("WaitingRoom", () => {
  it("menampilkan posisi antrean lalu membuka pemilih tiket saat giliran tiba", () => {
    ui();
    expect(screen.getByRole("heading", { name: "Kamu sedang mengantre" })).toBeInTheDocument();
    expect(screen.queryByText("Pemilih tiket")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByRole("heading", { name: "Giliranmu!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pilih tiket sekarang" }));
    expect(screen.getByText("Pemilih tiket")).toBeInTheDocument();
  });

  it("melewati antrean bila sudah lolos dalam 15 menit terakhir", () => {
    sessionStorage.setItem("panggung-queue-e1", String(Date.now() - 60_000));
    ui();
    expect(screen.getByText("Pemilih tiket")).toBeInTheDocument();
  });

  it("memasang peringatan saat halaman akan ditutup selama mengantre", () => {
    const add = vi.spyOn(window, "addEventListener");
    ui();
    expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
