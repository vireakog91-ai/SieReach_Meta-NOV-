import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    if (!filename) {
      return new NextResponse("Filename required", { status: 400 });
    }

    // 1. Try reading from local public/uploads directory if present
    try {
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      const buffer = await readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
      };
      const contentType = mimeTypes[ext] || "image/jpeg";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Not on local filesystem, fallback to database
    }

    // 2. Fetch from Database (SystemSetting table) for Serverless/Vercel persistence
    const setting = await prisma.systemSetting.findUnique({
      where: { key: `upload_${filename}` },
    });

    if (setting && setting.value) {
      const buffer = Buffer.from(setting.value, "base64");
      const contentType = setting.description || "image/jpeg";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse("Image not found", { status: 404 });
  } catch (err: any) {
    console.error("Error serving uploaded image:", err);
    return new NextResponse("Failed to load image", { status: 500 });
  }
}
