import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "ok";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = `degraded: ${err?.message || "connection error"}`;
  }

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      responseTimeMs: Date.now() - startTime,
      version: "0.1.0",
    },
    {
      status: dbStatus === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
