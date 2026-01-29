import { Context } from "telegraf";
import { Markup } from "telegraf";
import { config } from "../config";
import * as fs from "fs";
import * as path from "path";

const messagesFile = path.join(__dirname, "../../storage/messages.json");

/** Edit message text, or delete and reply if the message has no text (e.g. photo with caption). */
async function editMessageTextOrReply(
  ctx: Context,
  text: string,
  extra: object,
) {
  try {
    await ctx.editMessageText(text, extra);
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { description?: string } };
    const description = e?.response?.description ?? e?.message ?? "";
    if (description.includes("no text in the message to edit")) {
      try {
        await ctx.deleteMessage();
      } catch {
        // Ignore delete errors
      }
      await ctx.reply(text, extra);
    } else {
      throw err;
    }
  }
}

// Ensure storage directory exists
const storageDir = path.join(__dirname, "../../storage");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Load messages from file
function loadMessages(): any[] {
  if (!fs.existsSync(messagesFile)) {
    return [];
  }
  try {
    const data = fs.readFileSync(messagesFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading messages:", error);
    return [];
  }
}

// Save messages to file
function saveMessages(messages: any[]) {
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
}

// Forward message to admin
async function forwardToAdmin(ctx: Context, message: string, userName: string) {
  try {
    const adminMessage = `💬 *New Message from Guest*\n\n*From:* ${userName}\n\n${message}`;
    await ctx.telegram.sendMessage(config.adminId, adminMessage, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error forwarding message to admin:", error);
  }
}

export async function messagesHandler(
  ctx: Context,
  setUserState?: (userId: string, state: string) => void,
  getUserState?: (userId: string) => string | undefined,
) {
  const userId = ctx.from?.id?.toString();
  const userName = ctx.from?.first_name || "Guest";

  if (!userId) return;

  // Check if this is a callback query (button click)
  if ("callback_query" in ctx.update) {
    // Answer callback query immediately to prevent timeout
    await ctx.answerCbQuery().catch(() => {
      // Ignore if already answered or invalid
    });

    const message = `
💬 *Message to the Couple*

We'd love to hear from you! Please send us your message below.

Your message will be forwarded to Abela & Hanich.
    `;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🔙 Cancel", "start")],
    ]);

    if (setUserState) {
      setUserState(userId, "waiting_message");
    }

    await editMessageTextOrReply(ctx, message, {
      parse_mode: "Markdown",
      ...keyboard,
    });
    return;
  }

  // Handle text message (actual message from user)
  if ("message" in ctx.update && "text" in ctx.update.message) {
    const state = getUserState ? getUserState(userId) : undefined;

    // Only process if user is in message state
    if (state !== "waiting_message") {
      return;
    }

    const text = ctx.update.message.text;

    // Skip if it's a command
    if (text?.startsWith("/")) {
      return;
    }

    // Save message
    const messages = loadMessages();
    const messageData = {
      userId: userId,
      userName,
      message: text,
      timestamp: new Date().toISOString(),
    };
    messages.push(messageData);
    saveMessages(messages);

    // Forward to admin
    await forwardToAdmin(ctx, text, userName);

    if (setUserState) {
      setUserState(userId, "");
    }

    await ctx.reply(
      "✅ Thank you for your message! We've received it and will get back to you soon. 💕",
      Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Back to Menu", "start")],
      ]),
    );
  }
}
