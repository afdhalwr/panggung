import { NextResponse } from "next/server";
import { categoriesSchema, eventInfoSchema, eventStatusSchema } from "@/lib/admin-schemas";
import { deleteEvent, setEventStatus, updateCategories, updateEventInfo } from "@/server/admin/events";
import { requireRole } from "@/server/auth";
import { errorResponse } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

/** Body salah satu dari `{ info }`, `{ status }`, atau `{ categories }`. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireRole(req, "admin");
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    // Pilih skema dari kunci body, supaya pesan validasinya spesifik (bukan "Invalid input" dari union).
    if ("info" in body) await updateEventInfo(id, eventInfoSchema.parse(body.info));
    else if ("status" in body) await setEventStatus(id, eventStatusSchema.parse(body).status);
    else return NextResponse.json({ categories: await updateCategories(id, categoriesSchema.parse(body)) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    await requireRole(req, "admin");
    await deleteEvent((await params).id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
