import { NextResponse } from "next/server";
import {
  getEndpointsDueForCheck,
  recordCheck,
  getAllEndpoints,
  getActiveAlertsForEndpoint,
  recordAlertLog,
} from "@/lib/db";

async function fireAlerts(endpointId: number, endpointName: string, endpointUrl: string, error: string | null, statusCode: number | null) {
  const alerts = getActiveAlertsForEndpoint(endpointId);

  for (const alert of alerts) {
    const message = `[API Health] ${endpointName} is DOWN\nURL: ${endpointUrl}\n${error ? `Error: ${error}` : `Status: ${statusCode}`}\nTime: ${new Date().toISOString()}`;

    if (alert.type === "webhook") {
      try {
        await fetch(alert.destination, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "endpoint_down",
            endpoint: { id: endpointId, name: endpointName, url: endpointUrl },
            error,
            status_code: statusCode,
            timestamp: new Date().toISOString(),
          }),
        });
        recordAlertLog(alert.id, endpointId, "endpoint_down", message, true);
      } catch (err) {
        recordAlertLog(alert.id, endpointId, "endpoint_down", `Webhook failed: ${(err as Error).message}`, false);
      }
    } else if (alert.type === "email") {
      // Email alerts would use a service like SendGrid/Resend in production
      // For demo purposes, log the alert
      recordAlertLog(alert.id, endpointId, "endpoint_down", `Email to ${alert.destination}: ${message}`, true);
    }
  }
}

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

      // Fire alerts if endpoint is down
      if (!isUp) {
        await fireAlerts(endpoint.id, endpoint.name, endpoint.url, error, statusCode);
      }

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
