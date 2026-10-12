import { NextResponse } from "next/server";
import { userStatusSchema } from "@/lib/admin-schemas";
import { setUserDisabled } from "@/server/admin/users";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireRole(req, "admin");
    const { disabled } = userStatusSchema.parse(await req.json());
    await setUserDisabled(uid, (await params).id, disabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
