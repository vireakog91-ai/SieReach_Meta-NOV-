import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload." },
        { status: 400 }
      );
    }

    // Maximum file limit: 50MB (matching Telegram Bot API limit)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File size exceeds 50MB limit allowed by Telegram Bot API.",
        },
        { status: 400 }
      );
    }

    // Determine media type
    let detectedType: "photo" | "video" | "document" = "document";
    const mime = file.type.toLowerCase();
    const originalExt = path.extname(file.name).toLowerCase();

    if (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(originalExt)) {
      detectedType = "photo";
    } else if (mime.startsWith("video/") || [".mp4", ".mov", ".webm", ".mkv", ".avi"].includes(originalExt)) {
      detectedType = "video";
    } else {
      detectedType = "document";
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate safe unique filename
    const safeBase = path
      .basename(file.name, originalExt)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueSuffix = crypto.randomBytes(4).toString("hex");
    const uniqueName = `${detectedType}_${Date.now()}_${safeBase}_${uniqueSuffix}${originalExt || ""}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // Return relative public URL that works both for browser and local server dispatch
    const relativeUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      detectedType,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
