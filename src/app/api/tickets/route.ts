import { NextResponse } from "next/server";
import { verifyRequest } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { listTickets } from "@/server/orders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { uid } = await verifyRequest(req);
    return NextResponse.json(await listTickets(uid));
  } catch (err) {
    return errorResponse(err);
  }
}
