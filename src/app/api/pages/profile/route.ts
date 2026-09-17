import { NextRequest, NextResponse } from "next/server";
import { fetchFacebookPageProfile } from "@/lib/facebook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, accessToken } = body;

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "pageId and accessToken are required." },
        { status: 400 }
      );
    }

    const profile = await fetchFacebookPageProfile(pageId, accessToken);

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch profile from Meta Graph API. Please verify Page ID and Token permissions.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
