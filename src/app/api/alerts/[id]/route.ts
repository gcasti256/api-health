import { NextRequest, NextResponse } from "next/server";
import { deleteAlert, toggleAlert } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alertId = parseInt(id, 10);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    if (body.enabled !== undefined) {
      toggleAlert(alertId, body.enabled);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alertId = parseInt(id, 10);
    if (isNaN(alertId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = deleteAlert(alertId);
    if (!deleted) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete alert:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
