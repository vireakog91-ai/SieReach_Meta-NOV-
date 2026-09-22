import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = await verifyAdminToken(token);

  return NextResponse.json({
    authenticated,
  });
}
