"use client";

import { request } from "@/features/api/request";
import type { CategoriesInput, EventInfoInput, TicketCheck } from "@/lib/admin-schemas";
import type { Event, EventStatus, TicketCategory } from "@/lib/schemas";

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

/**
 * Pintu UI admin ke Route Handler `/api/admin/*`. Server memverifikasi peran admin di setiap panggilan;
 * data awal halaman dibaca langsung oleh Server Component, jadi di sini hanya mutasi.
 */
export const adminRepository = {
  createEvent: (info: EventInfoInput) => request<{ event: Event }>("/api/admin/events", json("POST", info)),
  updateEventInfo: (id: string, info: EventInfoInput) => request<{ ok: true }>(`/api/admin/events/${id}`, json("PATCH", { info })),
  setEventStatus: (id: string, status: EventStatus) => request<{ ok: true }>(`/api/admin/events/${id}`, json("PATCH", { status })),
  updateCategories: (id: string, input: CategoriesInput) => request<{ categories: TicketCategory[] }>(`/api/admin/events/${id}`, json("PATCH", input)),
  deleteEvent: (id: string) => request<{ ok: true }>(`/api/admin/events/${id}`, { method: "DELETE" }),
  setSeatsBlocked: (eventId: string, seatIds: string[], blocked: boolean) =>
    request<{ changed: string[] }>(`/api/admin/seats/${eventId}`, json("PATCH", { seatIds, blocked })),
  refundOrder: (id: string) => request<{ ok: true }>(`/api/admin/orders/${id}/refund`, { method: "POST" }),
  validateTicket: (code: string) => request<TicketCheck>("/api/admin/tickets/validate", json("POST", { code })),
  setUserDisabled: (uid: string, disabled: boolean) => request<{ ok: true }>(`/api/admin/users/${uid}`, json("PATCH", { disabled })),
};
