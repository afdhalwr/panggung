import { NextResponse } from "next/server";
import { eventInfoSchema } from "@/lib/admin-schemas";
import { createEvent } from "@/server/admin/events";
import { requireRole } from "@/server/auth";
import { getAllEvents } from "@/server/catalog";
import { errorResponse } from "@/server/http";

/** Semua event, termasuk draft. */
export async function GET(req: Request) {
  try {
    await requireRole(req, "admin");
    return NextResponse.json({ events: await getAllEvents() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(req, "admin");
    const info = eventInfoSchema.parse(await req.json());
    return NextResponse.json({ event: await createEvent(info) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
