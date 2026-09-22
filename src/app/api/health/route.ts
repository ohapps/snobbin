import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // Verify database connectivity
    await db.execute(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: "connected",
          responseTimeMs: responseTime,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: "disconnected",
          responseTimeMs: responseTime,
          error: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 503 },
    );
  }
}
