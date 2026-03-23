import { NextRequest, NextResponse } from "next/server";
import { getAllEndpoints, createEndpoint } from "@/lib/db";

export async function GET() {
  try {
    const endpoints = getAllEndpoints();
    return NextResponse.json(endpoints);
  } catch (error) {
    console.error("Failed to fetch endpoints:", error);
    return NextResponse.json(
      { error: "Failed to fetch endpoints" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, check_interval, expected_status, threshold_degraded, threshold_down } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const endpoint = createEndpoint(
      name,
      url,
      check_interval || 60,
      expected_status || 200,
      threshold_degraded || 200,
      threshold_down || 1000
    );

    return NextResponse.json(endpoint, { status: 201 });
  } catch (error) {
    console.error("Failed to create endpoint:", error);
    return NextResponse.json(
      { error: "Failed to create endpoint" },
      { status: 500 }
    );
  }
}
