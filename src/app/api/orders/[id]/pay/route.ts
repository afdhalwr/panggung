import { NextResponse } from "next/server";
import { payOrderSchema, type PayOrderResult } from "@/lib/schemas";
import { verifyRequest } from "@/server/auth";
import { errorResponse } from "@/server/http";
import { payOrder } from "@/server/orders";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyRequest(req);
    const body = payOrderSchema.parse(await req.json());
    const fail = new URL(req.url).searchParams.get("fail") === "true";
    return NextResponse.json<PayOrderResult>(await payOrder(uid, (await params).id, body, fail));
  } catch (err) {
    return errorResponse(err);
  }
}
