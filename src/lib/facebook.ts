/**
 * SieReach Facebook Graph API Integration Service
 * Supports both Live Meta Graph API v21.0 calls and a fully functional Sandbox / Mock mode.
 */

export interface SendMessageOptions {
  pageId: string;
  pageAccessToken: string;
  recipientPsid: string;
  messageText?: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  messageTag?: string | null; // e.g., 'HUMAN_AGENT'
  isMockMode?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  recipientId?: string;
  error?: string;
  mode: "LIVE" | "SANDBOX";
}

import { parseSpintax } from "./spintax";
export { parseSpintax };


/**
 * Replace placeholders in follow-up message templates and resolves Spintax variations
 */
export function renderMessageTemplate(
  template: string,
  variables: {
    customerName: string;
    pageName: string;
    adSource?: string | null;
  },
  options?: { resolveSpintax?: boolean }
): string {
  const firstName = variables.customerName.split(" ")[0] || variables.customerName;

  let text = template
    .replace(/\{\{\s*customer_name\s*\}\}/gi, variables.customerName)
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*page_name\s*\}\}/gi, variables.pageName)
    .replace(/\{\{\s*ad_source\s*\}\}/gi, variables.adSource || "our featured offer");

  if (options?.resolveSpintax !== false) {
    text = parseSpintax(text);
  }

  return text;
}

/**
 * Sanitize and convert media URLs (images or audio) into direct accessible stream URLs
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // If local upload relative path (e.g. /api/uploads/audio_xyz.mp3 or /api/uploads/photo_xyz.jpg)
  if (trimmed.startsWith("/")) {
    const publicBase = (
      process.env.PUBLIC_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "https://siereach-meta.vercel.app"
    ).replace(/\/+$/, "");
    if (publicBase) {
      return `${publicBase}${trimmed}`;
    }
  }

  // Convert Google Drive sharing URLs:
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  const gDriveIdMatch = trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (gDriveIdMatch && gDriveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveIdMatch[1]}`;
  }

  return trimmed;
}

export const normalizeImageUrl = normalizeMediaUrl;
export const normalizeAudioUrl = normalizeMediaUrl;

/**
 * Send Facebook Messenger Message + Optional Image and/or Voice Note Attachment
 */
export async function sendFacebookMessage(
  options: SendMessageOptions
): Promise<SendMessageResult> {
  const {
    pageId,
    pageAccessToken,
    recipientPsid,
    messageText,
    imageUrl,
    audioUrl,
    messageTag,
    isMockMode = false,
  } = options;

  // If mock mode is active, simulate immediate delivery
  if (
    isMockMode ||
    !pageAccessToken ||
    pageAccessToken.startsWith("EAAB_mock_") ||
    pageAccessToken.toLowerCase().includes("mock")
  ) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      success: true,
      messageId: `mock_mid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      recipientId: recipientPsid,
      mode: "SANDBOX",
    };
  }

  // Live Meta Graph API Call
  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(
      pageAccessToken
    )}`;

    const cleanImageUrl = normalizeMediaUrl(imageUrl);
    const cleanAudioUrl = normalizeMediaUrl(audioUrl);
    let lastMessageId: string | undefined = undefined;

    // 1. Dispatch Voice Note Attachment if configured
    if (cleanAudioUrl) {
      try {
        const payloadAudio: any = {
          recipient: { id: recipientPsid },
          messaging_type: messageTag ? "MESSAGE_TAG" : "RESPONSE",
          ...(messageTag ? { tag: messageTag } : {}),
          message: {
            attachment: {
              type: "audio",
              payload: {
                url: cleanAudioUrl,
                is_reusable: true,
              },
            },
          },
        };

        const resAudio = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadAudio),
        });

        const dataAudio = await resAudio.json();
        if (resAudio.ok && !dataAudio.error) {
          lastMessageId = dataAudio.message_id;
        } else {
          console.warn("Meta Audio Attachment Warning:", dataAudio.error?.message);
        }
      } catch (audioErr) {
        console.warn("Failed to dispatch audio attachment:", audioErr);
      }
    }

    // 2. Dispatch Image Attachment if configured
    if (cleanImageUrl) {
      try {
        const payloadImage: any = {
          recipient: { id: recipientPsid },
          messaging_type: messageTag ? "MESSAGE_TAG" : "RESPONSE",
          ...(messageTag ? { tag: messageTag } : {}),
          message: {
            attachment: {
              type: "image",
              payload: {
                url: cleanImageUrl,
                is_reusable: true,
              },
            },
          },
        };

        const resImage = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadImage),
        });

        const dataImage = await resImage.json();
        if (resImage.ok && !dataImage.error) {
          lastMessageId = dataImage.message_id;
        } else {
          console.warn("Meta Image Attachment Warning:", dataImage.error?.message);
        }
      } catch (imgErr) {
        console.warn("Failed to dispatch image attachment:", imgErr);
      }
    }

    // 3. Dispatch accompanying text message if present
    const hasText = Boolean(messageText && messageText.trim());
    if (hasText) {
      const resText = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientPsid },
          messaging_type: messageTag ? "MESSAGE_TAG" : "RESPONSE",
          ...(messageTag ? { tag: messageTag } : {}),
          message: { text: messageText },
        }),
      });

      const dataText = await resText.json();
      if (!resText.ok || dataText.error) {
        return {
          success: false,
          error: dataText.error?.message || "Failed to send message text via Meta Graph API",
          mode: "LIVE",
        };
      }

      return {
        success: true,
        messageId: dataText.message_id,
        recipientId: recipientPsid,
        mode: "LIVE",
      };
    }

    // If media was sent without text, return success with media messageId
    if (cleanAudioUrl || cleanImageUrl) {
      return {
        success: true,
        messageId: lastMessageId || `media_mid_${Date.now()}`,
        recipientId: recipientPsid,
        mode: "LIVE",
      };
    }

    return {
      success: false,
      error: "No message text or media attachment provided to send.",
      mode: "LIVE",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error communicating with Meta Graph API",
      mode: "LIVE",
    };
  }
}

/**
 * Fetch Conversations from Facebook Graph API
 */
export async function fetchFacebookConversations(
  pageId: string,
  pageAccessToken: string,
  isMockMode = false
) {
  if (isMockMode || !pageAccessToken || pageAccessToken.startsWith("EAAB_mock_")) {
    return [];
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=id,updated_time,participants,messages{id,message,from,created_time}&access_token=${encodeURIComponent(
      pageAccessToken
    )}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error("Error fetching conversations from Graph API:", err);
    return [];
  }
}/**
 * Fetch Facebook Page Profile (Name, Category, Profile Picture) from Graph API
 */
export async function fetchFacebookPageProfile(
  pageId: string,
  pageAccessToken: string
): Promise<{
  id: string;
  name: string;
  category?: string;
  avatarUrl?: string;
} | null> {
  if (!pageAccessToken || pageAccessToken.startsWith("EAAB_mock_") || pageAccessToken.toLowerCase().includes("mock")) {
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
      pageId
    )}?fields=id,name,category,picture.type(large){url}&access_token=${encodeURIComponent(
      pageAccessToken
    )}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      console.warn("Meta Page Profile fetch warning:", data.error?.message);
      return null;
    }

    return {
      id: data.id || pageId,
      name: data.name,
      category: data.category,
      avatarUrl: data.picture?.data?.url,
    };
  } catch (err) {
    console.error("Error fetching page profile from Meta Graph API:", err);
    return null;
  }
}
