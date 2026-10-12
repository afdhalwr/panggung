import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getDashboardStats } from "@/server/admin/stats";
import { errorResponse } from "@/server/http";

export async function GET(req: Request) {
  try {
    await requireRole(req, "admin");
    const p = new URL(req.url).searchParams;
    return NextResponse.json(await getDashboardStats({ eventId: p.get("eventId") || undefined, from: p.get("from") || undefined, to: p.get("to") || undefined }));
  } catch (err) {
    return errorResponse(err);
  }
}
