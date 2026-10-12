import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { listTickets } from "@/server/orders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { uid } = await requireRole(req, "user");
    return NextResponse.json(await listTickets(uid));
  } catch (err) {
    return errorResponse(err);
  }
}
