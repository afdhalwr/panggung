"use client";

import { getFirebaseAuth } from "@/lib/firebase/auth";
import type { ApiError, CreateOrderInput, CreateOrderResult, PayOrderInput, PayOrderResult, TicketsResponse } from "@/lib/schemas";

/** Error dari API dengan status HTTP, supaya UI bisa membedakan 409/410/402. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public takenSeatIds: string[] = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = (await getFirebaseAuth()).currentUser;
  if (!user) throw new ApiRequestError(401, "Silakan masuk dulu.");
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}`, ...init.headers },
    });
  } catch {
    throw new ApiRequestError(0, "Koneksi terputus. Periksa internet kamu lalu coba lagi.");
  }
  const body = (await res.json().catch(() => ({}))) as T & Partial<ApiError>;
  if (!res.ok) throw new ApiRequestError(res.status, body.error ?? "Terjadi kesalahan.", body.takenSeatIds);
  return body;
}

/**
 * Satu-satunya pintu UI ke data order. Implementasinya memanggil Route Handler;
 * UI tidak tahu (dan tidak perlu tahu) bahwa di baliknya ada Firestore.
 */
export const ordersRepository = {
  createOrder: (input: CreateOrderInput) => request<CreateOrderResult>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  payOrder: (orderId: string, input: PayOrderInput, opts: { simulateFailure?: boolean } = {}) =>
    request<PayOrderResult>(`/api/orders/${orderId}/pay${opts.simulateFailure ? "?fail=true" : ""}`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listTickets: () => request<TicketsResponse>("/api/tickets"),
};
