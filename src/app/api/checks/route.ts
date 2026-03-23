import { NextResponse } from "next/server";
import {
  getEndpointsDueForCheck,
  recordCheck,
  getAllEndpoints,
} from "@/lib/db";

export async function POST() {
  try {
    const endpoints = getEndpointsDueForCheck();
    const results: Array<{
      endpoint_id: number;
      name: string;
      status_code: number | null;
      response_time_ms: number | null;
      is_up: boolean;
      error: string | null;
    }> = [];

    for (const endpoint of endpoints) {
      let statusCode: number | null = null;
      let responseTimeMs: number | null = null;
      let isUp = false;
      let error: string | null = null;

      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint.url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "API-Health-Monitor/1.0",
          },
        });

        clearTimeout(timeout);
        responseTimeMs = Date.now() - start;
        statusCode = response.status;
        isUp = statusCode === endpoint.expected_status;
      } catch (err) {
        error =
          err instanceof Error ? err.message : "Unknown error";
        isUp = false;
      }

      recordCheck(endpoint.id, statusCode, responseTimeMs, isUp, error);

      results.push({
        endpoint_id: endpoint.id,
        name: endpoint.name,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        is_up: isUp,
        error,
      });
    }

    return NextResponse.json({
      checked: results.length,
      results,
    });
  } catch (error) {
    console.error("Failed to run checks:", error);
    return NextResponse.json(
      { error: "Failed to run checks" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const endpoints = getAllEndpoints();
    return NextResponse.json(endpoints);
  } catch (error) {
    console.error("Failed to fetch check data:", error);
    return NextResponse.json(
      { error: "Failed to fetch check data" },
      { status: 500 }
    );
  }
}
