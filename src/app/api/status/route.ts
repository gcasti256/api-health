import { NextResponse } from "next/server";
import { getPublicStatus } from "@/lib/db";

export async function GET() {
  try {
    const status = getPublicStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to fetch status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
