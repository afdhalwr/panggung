import { NextResponse } from "next/server";
import { refundOrder } from "@/server/admin/orders";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, "admin");
    await refundOrder((await params).id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
