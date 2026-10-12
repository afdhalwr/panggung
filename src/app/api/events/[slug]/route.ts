import { NextResponse } from "next/server";
import { getVenue } from "@/lib/catalog";
import { getEventBySlug } from "@/server/catalog";
import { HttpError, errorResponse, simulateNetwork } from "@/server/http";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await simulateNetwork(new URL(req.url));
    const event = await getEventBySlug((await params).slug);
    if (!event) throw new HttpError(404, "Konser tidak ditemukan.");
    const venue = getVenue(event.venueId);
    return NextResponse.json({ event, venue: venue && { ...venue, seats: undefined } });
  } catch (err) {
    return errorResponse(err);
  }
}
