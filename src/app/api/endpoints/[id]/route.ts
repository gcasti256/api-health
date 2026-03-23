import { NextRequest, NextResponse } from "next/server";
import {
  getEndpointById,
  deleteEndpoint,
  getUptimePercentage,
} from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endpointId = parseInt(id, 10);
    if (isNaN(endpointId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const endpoint = getEndpointById(endpointId);
    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 }
      );
    }

    const uptime24h = getUptimePercentage(endpointId, 24);
    const uptime7d = getUptimePercentage(endpointId, 168);
    const uptime30d = getUptimePercentage(endpointId, 720);

    return NextResponse.json({
      ...endpoint,
      uptime_24h: uptime24h,
      uptime_7d: uptime7d,
      uptime_30d: uptime30d,
    });
  } catch (error) {
    console.error("Failed to fetch endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch endpoint" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endpointId = parseInt(id, 10);
    if (isNaN(endpointId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = deleteEndpoint(endpointId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete endpoint:", error);
    return NextResponse.json(
      { error: "Failed to delete endpoint" },
      { status: 500 }
    );
  }
}
