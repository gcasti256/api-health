import { NextRequest, NextResponse } from "next/server";
import { getChecksForEndpoint, getChecksInRange, getIncidents } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { endpointId } = await params;
    const id = parseInt(endpointId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid endpoint ID" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range");
    const type = searchParams.get("type");

    if (type === "incidents") {
      const incidents = getIncidents(id, 20);
      return NextResponse.json(incidents);
    }

    if (range === "24h") {
      const checks = getChecksInRange(id, 24);
      return NextResponse.json(checks);
    }

    if (range === "7d") {
      const checks = getChecksInRange(id, 168);
      return NextResponse.json(checks);
    }

    if (range === "30d") {
      const checks = getChecksInRange(id, 720);
      return NextResponse.json(checks);
    }

    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const checks = getChecksForEndpoint(id, limit);
    return NextResponse.json(checks);
  } catch (error) {
    console.error("Failed to fetch checks:", error);
    return NextResponse.json(
      { error: "Failed to fetch checks" },
      { status: 500 }
    );
  }
}
