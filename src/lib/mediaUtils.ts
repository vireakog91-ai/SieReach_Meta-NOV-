/**
 * Media Utilities & Google Drive Link Decoder
 * Converts Google Drive sharing URLs to direct stream/download URLs
 * suitable for Telegram Bot API delivery and web previews.
 */

export interface DecodedMediaResult {
  isGoogleDrive: boolean;
  fileId?: string;
  originalUrl: string;
  directUrl: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  shareWarning?: string;
}

/**
 * Format bytes into human-readable string (e.g. 2.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Extract Google Drive file ID from various URL patterns
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/{FILE_ID} or /d/{FILE_ID} (standard share view link)
  // e.g. https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0I/view?usp=sharing
  const matchFileD = trimmed.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{20,})/i);
  if (matchFileD) return matchFileD[1];

  // Pattern 2: ?id={FILE_ID} or &id={FILE_ID} (open / uc links)
  // e.g. https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0I
  // e.g. https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0I
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i);
  if (matchIdParam) return matchIdParam[1];

  // Pattern 3: lh3 direct content
  // e.g. https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0I
  const matchLh3 = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{20,})/i);
  if (matchLh3) return matchLh3[1];

  // Pattern 4: Google Docs / Sheets / Slides documents
  // e.g. https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2up0I/edit
  const matchDocs = trimmed.match(/docs\.google\.com\/[a-z]+\/d\/([a-zA-Z0-9_-]{20,})/i);
  if (matchDocs) return matchDocs[1];

  return null;
}

/**
 * Decodes Google Drive URLs into direct stream/download URLs
 * - Photos/Images: lh3.googleusercontent.com/d/{fileId} (instant direct stream, bypassing download confirmation)
 * - Videos/Documents: drive.google.com/uc?export=download&id={fileId}
 */
export function decodeGoogleDriveUrl(
  url: string,
  mediaType?: "photo" | "video" | "document" | "none" | string
): DecodedMediaResult {
  if (!url || typeof url !== "string") {
    return {
      isGoogleDrive: false,
      originalUrl: url || "",
      directUrl: url || "",
    };
  }

  const trimmed = url.trim();

  // Check if it's a Google Drive or Google Docs domain or lh3
  const isGdriveDomain =
    /drive\.google\.com|docs\.google\.com|lh3\.googleusercontent\.com/i.test(trimmed);

  const fileId = extractGoogleDriveFileId(trimmed);

  if (!isGdriveDomain || !fileId) {
    return {
      isGoogleDrive: false,
      originalUrl: trimmed,
      directUrl: trimmed,
    };
  }

  const isPhoto =
    mediaType === "photo" ||
    /\.(jpe?g|png|webp|gif|svg)$/i.test(trimmed);

  // Direct URLs
  const directPhotoUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

  const directUrl = isPhoto ? directPhotoUrl : directDownloadUrl;

  return {
    isGoogleDrive: true,
    fileId,
    originalUrl: trimmed,
    directUrl,
    thumbnailUrl,
    downloadUrl: directDownloadUrl,
    shareWarning: "Ensure Google Drive link sharing is set to 'Anyone with the link can view'.",
  };
}
