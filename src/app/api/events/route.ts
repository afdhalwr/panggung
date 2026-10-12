import { NextResponse } from "next/server";
import { filterEvents, getEvents, parseFilter } from "@/lib/catalog";
import { errorResponse, simulateNetwork } from "@/server/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    await simulateNetwork(url);
    const events = filterEvents(getEvents(), parseFilter(url.searchParams));
    return NextResponse.json({ events, count: events.length });
  } catch (err) {
    return errorResponse(err);
  }
}
