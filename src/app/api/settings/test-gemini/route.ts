import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    let apiKey = body.apiKey;

    // If apiKey is masked or empty, try loading it from DB or process.env
    if (!apiKey || apiKey.includes("••")) {
      const dbKey = await prisma.systemSetting.findUnique({
        where: { key: "GEMINI_API_KEY" },
      });
      apiKey = dbKey?.value || process.env.GEMINI_API_KEY || "";
    }

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: "No Gemini API Key provided or stored." },
        { status: 400 }
      );
    }

    // Call Gemini 2.0 Flash (or 1.5-flash fallback) with a lightweight ping
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`;
    const testPayload = {
      contents: [
        {
          parts: [{ text: "Respond with the word 'OK' if you can read this." }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0.1,
      },
    };

    const res = await fetch(testUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return NextResponse.json(
        { success: false, error: msg },
        { status: 400 }
      );
    }

    const json = await res.json();
    const candidateText =
      json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "OK";

    return NextResponse.json({
      success: true,
      message: "Google Gemini Flash API connected successfully!",
      model: "gemini-2.0-flash",
      sampleResponse: candidateText,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to reach Google Gemini API" },
      { status: 500 }
    );
  }
}
