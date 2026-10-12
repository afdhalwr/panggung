"use client";

import { request } from "@/features/api/request";
import type { CreateOrderInput, CreateOrderResult, PayOrderInput, PayOrderResult, TicketsResponse } from "@/lib/schemas";

export { ApiRequestError } from "@/features/api/request";

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
