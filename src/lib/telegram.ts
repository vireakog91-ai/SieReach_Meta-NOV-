import fs from "fs";
import path from "path";
import { decodeGoogleDriveUrl } from "./mediaUtils";

/**
 * SieReach Telegram Bot API Service
 * Supports both Live Telegram API and Sandbox / Simulated Mode
 */

export interface InlineButton {
  text: string;
  url: string;
}

export interface SendPostParams {
  botToken?: string;
  chatId: string;
  content: string;
  parseMode?: string; // HTML, MarkdownV2, Plain
  mediaType?: string; // none, photo, video, document
  mediaUrl?: string | null;
  inlineButtons?: InlineButton[][] | null;
  isPinned?: boolean;
  isSilent?: boolean;
  disablePreview?: boolean;
  isSandbox?: boolean;
  channelUsername?: string | null;
}

export interface SendPostResult {
  success: boolean;
  messageId?: string;
  messageUrl?: string;
  error?: string;
  isSimulated?: boolean;
  raw?: any;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramChatInfo {
  id: number | string;
  title: string;
  type: string; // channel, supergroup, group, private
  username?: string;
  description?: string;
  memberCount?: number;
  isBotAdmin?: boolean;
  canPostMessages?: boolean;
  photoUrl?: string;
}

/**
 * Transforms raw, obscure, or technical Telegram API error messages
 * into clear, actionable, and user-friendly guidance.
 */
export function formatTelegramError(rawError: string | null | undefined): string {
  if (!rawError || typeof rawError !== "string") {
    return "An unknown error occurred while communicating with Telegram.";
  }

  const trimmed = rawError.trim();
  const lower = trimmed.toLowerCase();

  // 1. Bot is not a member of channel / chat / group
  if (
    lower.includes("bot is not a member") ||
    lower.includes("not a member of the channel") ||
    lower.includes("not a member of the chat") ||
    lower.includes("not a member of the supergroup") ||
    lower.includes("bot_not_member")
  ) {
    return "Please add this bot to your Telegram channel (and grant it Administrator permissions with 'Post Messages' enabled).";
  }

  // 2. Chat / Channel not found
  if (
    lower.includes("chat not found") ||
    lower.includes("channel_invalid") ||
    lower.includes("chat_invalid") ||
    lower.includes("peer_id_invalid")
  ) {
    return "Telegram channel or group not found. Please verify the @channelusername or numeric Chat ID (-100...), and ensure the bot has been added.";
  }

  // 3. Permission issues (not enough rights / need admin)
  if (
    lower.includes("rights to send a message") ||
    lower.includes("not enough rights") ||
    lower.includes("need administrator rights") ||
    lower.includes("not an admin") ||
    lower.includes("admin rights required") ||
    lower.includes("chat_admin_required") ||
    lower.includes("rights_missing")
  ) {
    return "The bot does not have permission to post messages. Please promote the bot to Administrator with 'Post Messages' permission enabled.";
  }

  // 4. Bot was kicked or blocked
  if (
    lower.includes("bot was kicked") ||
    lower.includes("bot was blocked") ||
    lower.includes("user is deactivated") ||
    lower.includes("chat was deactivated") ||
    lower.includes("bot_kicked")
  ) {
    return "The bot was removed or blocked from this Telegram destination. Please re-add the bot and grant it Administrator permissions.";
  }

  // 5. Unauthorized / Invalid Bot Token
  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid token") ||
    lower.includes("token is invalid") ||
    lower.includes("invalid bot token") ||
    (lower.includes("not found") && lower.includes("bot"))
  ) {
    return "Invalid Telegram Bot Token. Please check the token provided by @BotFather and try again.";
  }

  // 6. Message parsing & HTML / Markdown syntax errors
  if (
    lower.includes("can't parse entities") ||
    lower.includes("failed to find end tag") ||
    lower.includes("tag is not allowed") ||
    lower.includes("unclosed tag") ||
    lower.includes("entity")
  ) {
    return "Message formatting error. Please check that all HTML tags (such as <b>, <i>, <a>, <code>) are properly closed and valid.";
  }

  // 7. Message or Caption too long
  if (
    lower.includes("message is too long") ||
    lower.includes("caption is too long") ||
    lower.includes("message_too_long")
  ) {
    return "Message exceeds Telegram character limit (maximum 4,096 characters for text messages, or 1,024 characters for media captions). Please shorten your post.";
  }

  // 8. Invalid Inline Button URL
  if (
    lower.includes("button_url_invalid") ||
    lower.includes("wrong url host") ||
    lower.includes("invalid url") ||
    lower.includes("wrong_url")
  ) {
    return "Invalid inline button URL. Each button link must begin with https:// or http://.";
  }

  // 9. Media fetch / Google Drive URL errors
  if (
    lower.includes("failed to get http url content") ||
    lower.includes("wrong file identifier") ||
    lower.includes("wrong type of the web page content") ||
    lower.includes("file is too big") ||
    lower.includes("cannot fetch") ||
    lower.includes("file_too_big")
  ) {
    return "Unable to access the media file. If using a Google Drive link, ensure sharing permissions are set to 'Anyone with the link can view'.";
  }

  // 10. Rate limiting / Flood control
  if (lower.includes("too many requests") || lower.includes("retry after") || lower.includes("flood_wait")) {
    return "Telegram rate limit reached. Please wait a few moments before trying again.";
  }

  // 11. Network connection errors
  if (lower.includes("fetch failed") || lower.includes("econnrefused") || lower.includes("etimedout")) {
    return "Network error connecting to Telegram API servers. Please check your internet connection.";
  }

  // 12. Strip technical prefix for any unhandled Telegram message
  let cleaned = trimmed
    .replace(/^Bad Request:\s*/i, "")
    .replace(/^Forbidden:\s*/i, "")
    .replace(/^Conflict:\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();

  if (cleaned.length > 0) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return trimmed;
}

/**
 * Verify a Telegram Bot Token via getMe
 */
export async function verifyBotToken(token: string): Promise<{
  valid: boolean;
  bot?: TelegramBotInfo;
  error?: string;
}> {
  if (!token || token.trim() === "") {
    return { valid: false, error: "Bot token cannot be empty." };
  }

  // Check if simulated/mock token
  if (token.startsWith("SANDBOX_") || token === "sandbox") {
    return {
      valid: true,
      bot: {
        id: 792837194,
        is_bot: true,
        first_name: "SieReach Broadcaster Bot",
        username: "sielab_reach_bot",
        can_join_groups: true,
        can_read_all_group_messages: true,
        supports_inline_queries: true,
      },
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (data.ok && data.result) {
      return { valid: true, bot: data.result };
    } else {
      return {
        valid: false,
        error: formatTelegramError(data.description || "Invalid bot token or unauthorized."),
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      error: formatTelegramError(err.message || "Network error connecting to Telegram API"),
    };
  }
}

/**
 * Verify chat or channel info and bot permissions
 */
export async function verifyChatInfo(
  token: string,
  chatId: string
): Promise<{
  valid: boolean;
  chat?: TelegramChatInfo;
  error?: string;
}> {
  if (!chatId || chatId.trim() === "") {
    return { valid: false, error: "Chat ID or @username is required." };
  }

  // Format username with leading @ if it's an alphanumeric identifier
  let formattedChatId = chatId.trim();
  if (
    !formattedChatId.startsWith("@") &&
    !formattedChatId.startsWith("-") &&
    isNaN(Number(formattedChatId))
  ) {
    formattedChatId = `@${formattedChatId}`;
  }

  // Sandbox mode check
  if (token.startsWith("SANDBOX_") || token === "sandbox") {
    return {
      valid: true,
      chat: {
        id: formattedChatId,
        title: formattedChatId.replace("@", "").toUpperCase() + " Channel",
        type: formattedChatId.startsWith("-100") ? "supergroup" : "channel",
        username: formattedChatId.startsWith("@")
          ? formattedChatId.replace("@", "")
          : undefined,
        memberCount: Math.floor(Math.random() * 8000) + 1200,
        isBotAdmin: true,
        canPostMessages: true,
      },
    };
  }

  try {
    // 1. Get Chat details
    const chatRes = await fetch(
      `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(
        formattedChatId
      )}`
    );
    const chatData = await chatRes.json();

    if (!chatData.ok || !chatData.result) {
      return {
        valid: false,
        error: formatTelegramError(
          chatData.description ||
          "Could not find chat. Ensure the bot was added to the channel/group."
        ),
      };
    }

    const c = chatData.result;

    // 2. Get member count if possible
    let memberCount = 0;
    try {
      const countRes = await fetch(
        `https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${encodeURIComponent(
          formattedChatId
        )}`
      );
      const countData = await countRes.json();
      if (countData.ok) {
        memberCount = countData.result;
      }
    } catch {
      // Non-fatal
    }

    // 3. Verify bot admin status
    let isBotAdmin = true;
    let canPostMessages = true;

    try {
      // Get bot ID first
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meData = await meRes.json();
      if (meData.ok && meData.result?.id) {
        const memberRes = await fetch(
          `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(
            formattedChatId
          )}&user_id=${meData.result.id}`
        );
        const memberData = await memberRes.json();
        if (memberData.ok && memberData.result) {
          const status = memberData.result.status;
          isBotAdmin = status === "administrator" || status === "creator";
          if (isBotAdmin && memberData.result.can_post_messages !== undefined) {
            canPostMessages = memberData.result.can_post_messages;
          }
        }
      }
    } catch {
      // Non-fatal permission lookup
    }

    return {
      valid: true,
      chat: {
        id: c.id,
        title: c.title || c.first_name || formattedChatId,
        type: c.type || "channel",
        username: c.username,
        description: c.description,
        memberCount: memberCount || c.members_count || 0,
        isBotAdmin,
        canPostMessages,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: formatTelegramError(err.message || "Network error verifying Telegram chat"),
    };
  }
}

/**
 * Dispatch post to Telegram API or simulate delivery in Sandbox mode
 */
export async function sendTelegramPost(
  params: SendPostParams
): Promise<SendPostResult> {
  const {
    botToken,
    chatId,
    content,
    parseMode = "HTML",
    mediaType = "none",
    mediaUrl,
    inlineButtons,
    isPinned = false,
    isSilent = false,
    disablePreview = false,
    isSandbox = false,
    channelUsername,
  } = params;

  // Handle Sandbox / Mock delivery
  if (
    isSandbox ||
    !botToken ||
    botToken.startsWith("SANDBOX_") ||
    botToken === "sandbox"
  ) {
    const fakeMessageId = Math.floor(Math.random() * 90000) + 10000;
    const cleanChat = chatId.replace("@", "");
    const messageUrl = channelUsername
      ? `https://t.me/${channelUsername}/${fakeMessageId}`
      : chatId.startsWith("@")
      ? `https://t.me/${cleanChat}/${fakeMessageId}`
      : `https://t.me/c/${chatId.replace("-100", "").replace("-", "")}/${fakeMessageId}`;

    return {
      success: true,
      messageId: String(fakeMessageId),
      messageUrl,
      isSimulated: true,
      raw: { simulated: true, timestamp: new Date().toISOString() },
    };
  }

  // Format inline keyboard if buttons exist
  let replyMarkup: any = undefined;
  if (inlineButtons && inlineButtons.length > 0) {
    const keyboard = inlineButtons
      .filter((row) => row && row.length > 0)
      .map((row) =>
        row
          .filter((btn) => btn.text && btn.url)
          .map((btn) => ({
            text: btn.text.trim(),
            url: btn.url.trim(),
          }))
      )
      .filter((row) => row.length > 0);

    if (keyboard.length > 0) {
      replyMarkup = { inline_keyboard: keyboard };
    }
  }

  try {
    // 1. Resolve and decode media URL (e.g. Google Drive links)
    let resolvedMediaUrl = mediaUrl ? mediaUrl.trim() : null;
    if (resolvedMediaUrl && mediaType !== "none") {
      const gdrive = decodeGoogleDriveUrl(resolvedMediaUrl, mediaType);
      if (gdrive.isGoogleDrive && gdrive.directUrl) {
        resolvedMediaUrl = gdrive.directUrl;
      }
    }

    // 2. Check if local uploaded file exists in public/uploads/
    let isLocalFile = false;
    let localAbsolutePath = "";
    if (
      resolvedMediaUrl &&
      (resolvedMediaUrl.startsWith("/uploads/") ||
        resolvedMediaUrl.startsWith("uploads/") ||
        resolvedMediaUrl.includes("/uploads/"))
    ) {
      const cleanPath = resolvedMediaUrl.replace(/^.*\/uploads\//, "uploads/");
      localAbsolutePath = path.join(process.cwd(), "public", cleanPath);
      isLocalFile = fs.existsSync(localAbsolutePath);
    }

    let endpoint = "sendMessage";
    let res: Response;

    if (isLocalFile && mediaType !== "none") {
      // Dispatch via multipart/form-data with actual file bytes
      const fileBytes = await fs.promises.readFile(localAbsolutePath);
      const fileName = path.basename(localAbsolutePath);
      const formData = new FormData();
      formData.append("chat_id", chatId);
      if (isSilent) formData.append("disable_notification", "true");
      if (content) formData.append("caption", content);
      if (parseMode && parseMode !== "Plain") formData.append("parse_mode", parseMode);
      if (replyMarkup) formData.append("reply_markup", JSON.stringify(replyMarkup));

      const fileBlob = new Blob([fileBytes]);
      if (mediaType === "photo") {
        endpoint = "sendPhoto";
        formData.append("photo", fileBlob, fileName);
      } else if (mediaType === "video") {
        endpoint = "sendVideo";
        formData.append("video", fileBlob, fileName);
      } else if (mediaType === "document") {
        endpoint = "sendDocument";
        formData.append("document", fileBlob, fileName);
      }

      res = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
        method: "POST",
        body: formData,
      });
    } else {
      // Standard JSON dispatch
      const body: any = {
        chat_id: chatId,
        disable_notification: isSilent,
      };

      if (parseMode && parseMode !== "Plain") {
        body.parse_mode = parseMode;
      }

      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      if (mediaType === "photo" && resolvedMediaUrl) {
        endpoint = "sendPhoto";
        body.photo = resolvedMediaUrl;
        body.caption = content;
      } else if (mediaType === "video" && resolvedMediaUrl) {
        endpoint = "sendVideo";
        body.video = resolvedMediaUrl;
        body.caption = content;
      } else if (mediaType === "document" && resolvedMediaUrl) {
        endpoint = "sendDocument";
        body.document = resolvedMediaUrl;
        body.caption = content;
      } else {
        // Standard text message
        endpoint = "sendMessage";
        body.text = content;
        body.disable_web_page_preview = disablePreview;
      }

      res = await fetch(
        `https://api.telegram.org/bot${botToken}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
    }

    const data = await res.json();

    if (!data.ok) {
      return {
        success: false,
        error: formatTelegramError(data.description || `Telegram API Error (${data.error_code})`),
        raw: data,
      };
    }

    const msg = data.result;
    const messageId = String(msg.message_id);

    // If post should be pinned, pin it
    if (isPinned && messageId) {
      try {
        await fetch(
          `https://api.telegram.org/bot${botToken}/pinChatMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              disable_notification: isSilent,
            }),
          }
        );
      } catch {
        // Pin error shouldn't fail post delivery
      }
    }

    // Build public or private t.me link
    let messageUrl: string | undefined;
    if (channelUsername) {
      messageUrl = `https://t.me/${channelUsername}/${messageId}`;
    } else if (chatId.startsWith("@")) {
      messageUrl = `https://t.me/${chatId.replace("@", "")}/${messageId}`;
    } else if (chatId.startsWith("-100")) {
      messageUrl = `https://t.me/c/${chatId.replace("-100", "")}/${messageId}`;
    }

    return {
      success: true,
      messageId,
      messageUrl,
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatTelegramError(err.message || "Network error delivering to Telegram"),
    };
  }
}
