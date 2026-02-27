import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Perform a simple query to keep the database connection active
    // This prevents Supabase from pausing the project due to inactivity
    await db.execute(sql`SELECT 1`);
    console.log("Database keepalive successful at", new Date().toISOString());

    return NextResponse.json({
      status: "ok",
      message: "Database keepalive successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keepalive failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Database keepalive failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
