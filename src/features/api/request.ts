"use client";

import { getFirebaseAuth } from "@/lib/firebase/auth";
import type { ApiError } from "@/lib/schemas";

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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  if (res.status === 401) {
    // Sesi di browser sudah tidak diakui server (mis. token basi): keluarkan, supaya semua halaman konsisten.
    const { signOut } = await import("firebase/auth");
    await signOut(await getFirebaseAuth()).catch(() => undefined);
  }
  if (!res.ok) throw new ApiRequestError(res.status, body.error ?? "Terjadi kesalahan.", body.takenSeatIds);
  return body;
}

