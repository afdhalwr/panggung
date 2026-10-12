import { NextResponse } from "next/server";
import { listUsers } from "@/server/admin/users";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

export async function GET(req: Request) {
  try {
    await requireRole(req, "admin");
    return NextResponse.json({ users: await listUsers() });
  } catch (err) {
    return errorResponse(err);
  }
}
