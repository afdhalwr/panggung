import { NextResponse } from "next/server";
import { createOrderSchema, type CreateOrderResult } from "@/lib/schemas";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { createOrder } from "@/server/orders";

export async function POST(req: Request) {
  try {
    const { uid } = await requireRole(req, "user");
    const input = createOrderSchema.parse(await req.json());
    return NextResponse.json<CreateOrderResult>(await createOrder(uid, input), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
