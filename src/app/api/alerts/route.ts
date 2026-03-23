import { NextRequest, NextResponse } from "next/server";
import { getAlertsForEndpoint, createAlert } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const endpointId = parseInt(request.nextUrl.searchParams.get("endpointId") || "", 10);
    if (isNaN(endpointId)) {
      return NextResponse.json({ error: "endpointId is required" }, { status: 400 });
    }
    const alerts = getAlertsForEndpoint(endpointId);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint_id, type, destination } = body;

    if (!endpoint_id || !type || !destination) {
      return NextResponse.json(
        { error: "endpoint_id, type, and destination are required" },
        { status: 400 }
      );
    }

    if (!["webhook", "email"].includes(type)) {
      return NextResponse.json({ error: "type must be 'webhook' or 'email'" }, { status: 400 });
    }

    if (type === "email" && !destination.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (type === "webhook") {
      try { new URL(destination); } catch {
        return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
      }
    }

    const alert = createAlert(endpoint_id, type, destination);
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("Failed to create alert:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
