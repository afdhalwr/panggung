"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import { useCart, type OrderInfo } from "@/features/cart/store";
import { ApiRequestError, ordersRepository } from "@/features/orders/repository";

/** Kirim pilihan ke server untuk ditahan 10 menit, lalu masuk ke checkout. */
export function useStartHold(eventId: string, returnPath: string, describe: () => OrderInfo) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    const { selection, removeSeats, startHold } = useCart.getState();
    if (!selection.length) return;
    if (!user) {
      toast("Masuk dulu untuk melanjutkan", { description: "Pilihan kursimu tetap tersimpan." });
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    setBusy(true);
    try {
      const result = await ordersRepository.createOrder({ eventId, items: selection });
      startHold(result, describe());
      router.push("/checkout/data");
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiRequestError && err.status === 409) {
        removeSeats(err.takenSeatIds);
        toast.error(err.message, { description: "Kursi itu sudah dilepas dari pilihanmu. Pilih kursi lain, ya." });
      } else if (err instanceof ApiRequestError && err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      } else {
        toast.error(err instanceof Error ? err.message : "Gagal menahan kursi. Coba lagi.");
      }
    }
  }

  return { start, busy };
}
