/**
 * SieReach Facebook Graph API Integration Service
 * Supports both Live Meta Graph API v21.0 calls and a fully functional Sandbox / Mock mode.
 */

export interface SendMessageOptions {
  pageId: string;
  pageAccessToken: string;
  recipientPsid: string;
  messageText: string;
  imageUrl?: string | null;
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

/**
 * Resolves spintax strings in the format {option1|option2|option3}.
 * Recursively resolves nested spintax like {Hello|Hi {there|friend}}!
 */
export function parseSpintax(text: string): string {
  if (!text) return "";
  const spintaxRegex = /\{([^{}]+)\}/;
  let matches;
  let resolved = text;
  let iterations = 0;
  while ((matches = spintaxRegex.exec(resolved)) !== null && iterations < 50) {
    const options = matches[1].split("|");
    const choice = options[Math.floor(Math.random() * options.length)];
    resolved = resolved.replace(matches[0], choice);
    iterations++;
  }
  return resolved;
}

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
 * Sanitize and convert image URLs (such as Google Drive share links) into direct image stream URLs
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // If local upload relative path (e.g. /api/uploads/photo_xyz.jpg or /uploads/poster_xyz.jpg)
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
  // e.g., https://drive.google.com/file/d/1UtdBd2mwtdFGz13BGsD6RXCrLV-QCNt8/view?usp=sharing
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  // e.g., https://drive.google.com/open?id=... or /uc?id=...
  const gDriveIdMatch = trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (gDriveIdMatch && gDriveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveIdMatch[1]}`;
  }

  return trimmed;
}

/**
 * Send Facebook Messenger Message + Optional Image Attachment
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

    const cleanImageUrl = normalizeImageUrl(imageUrl);

    if (cleanImageUrl) {
      let imageSent = false;
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
          imageSent = true;
        } else {
          console.warn("Meta Image Attachment Notice:", dataImage.error?.message);
        }
      } catch (imgErr) {
        console.warn("Failed to dispatch image attachment:", imgErr);
      }

      // Now send the accompanying text message
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
    } else {
      // Send text message only
      const payload: any = {
        recipient: { id: recipientPsid },
        messaging_type: messageTag ? "MESSAGE_TAG" : "RESPONSE",
        ...(messageTag ? { tag: messageTag } : {}),
        message: { text: messageText },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || "Failed to send message via Graph API",
          mode: "LIVE",
        };
      }

      return {
        success: true,
        messageId: data.message_id,
        recipientId: recipientPsid,
        mode: "LIVE",
      };
    }
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
