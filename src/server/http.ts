import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiError } from "@/lib/schemas";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Omit<ApiError, "error"> = {},
  ) {
    super(message);
  }
}

/** Ubah error apa pun menjadi respons JSON yang konsisten `{ error, ...extra }`. */
export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json<ApiError>({ error: err.message, ...err.extra }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json<ApiError>({ error: err.issues[0]?.message ?? "Data tidak valid." }, { status: 422 });
  }
  console.error(err);
  return NextResponse.json<ApiError>({ error: "Terjadi kesalahan di server." }, { status: 500 });
}

/**
 * Simulasi jaringan untuk endpoint baca data seed: delay acak 300–900 ms,
 * dan `?chaos=true` memaksa error 500 agar error state bisa didemokan.
 */
export async function simulateNetwork(url: URL) {
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 600));
  if (url.searchParams.get("chaos") === "true") throw new HttpError(500, "Server sedang sibuk (mode chaos).");
}
