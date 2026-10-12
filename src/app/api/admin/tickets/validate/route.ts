import { NextResponse } from "next/server";
import { validateTicketSchema, type TicketCheck } from "@/lib/admin-schemas";
import { validateTicket } from "@/server/admin/tickets";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

export async function POST(req: Request) {
  try {
    await requireRole(req, "admin");
    const { code } = validateTicketSchema.parse(await req.json());
    return NextResponse.json<TicketCheck>(await validateTicket(code));
  } catch (err) {
    return errorResponse(err);
  }
}
