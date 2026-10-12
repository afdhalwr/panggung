import { NextResponse } from "next/server";
import { seatBlockSchema } from "@/lib/admin-schemas";
import { setSeatsBlocked } from "@/server/admin/events";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireRole(req, "admin");
    const { seatIds, blocked } = seatBlockSchema.parse(await req.json());
    return NextResponse.json(await setSeatsBlocked((await params).eventId, seatIds, blocked));
  } catch (err) {
    return errorResponse(err);
  }
}
