import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPin, createAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter your Admin PIN" },
        { status: 400 }
      );
    }

    if (!verifyAdminPin(pin)) {
      return NextResponse.json(
        { success: false, error: "Incorrect Admin PIN / Passcode" },
        { status: 401 }
      );
    }

    const token = await createAdminToken();

    const response = NextResponse.json({
      success: true,
      message: "Admin authenticated successfully",
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Login auth error:", err);
    return NextResponse.json(
      { success: false, error: "Internal authentication error" },
      { status: 500 }
    );
  }
}
