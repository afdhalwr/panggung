import { NextResponse } from "next/server";
import { listOrders } from "@/server/admin/orders";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

export async function GET(req: Request) {
  try {
    await requireRole(req, "admin");
    return NextResponse.json({ orders: await listOrders() });
  } catch (err) {
    return errorResponse(err);
  }
}
