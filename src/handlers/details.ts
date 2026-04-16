import { Context } from "telegraf";
import { config } from "../config";
import { Markup } from "telegraf";

export async function detailsHandler(ctx: Context) {
  // Answer callback query immediately to prevent timeout
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {
      // Ignore if already answered or invalid
    });
  }

  const weddingDate = new Date(config.weddingDate);
  const formattedDate = weddingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayTimeLabel = "01:00 PM / ከቀኑ 07:00 ሰአት";

  const detailsMessage = `
📅 *Wedding Details*

*📅 Date:* ${formattedDate} / ጥር 23፣ 2018
*⏰ Time:* ${displayTimeLabel}

*📍 Venue:* 
Name: ${config.venueName}
Address: Agona Cinema, Behind Hallelujah Hospital
Google Maps: [Open in Google Maps](${config.googleMapsUrl})
  `;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("🔙 Back to Menu", "start")],
  ]);

  try {
    // Check if the message is a callback query from a media message
    if (ctx.callbackQuery && "message" in ctx.callbackQuery) {
      const message = ctx.callbackQuery.message;
      // If message has photo or other media, delete it and send a new text message
      if (
        message &&
        ("photo" in message || "video" in message || "document" in message)
      ) {
        try {
          await ctx.deleteMessage();
        } catch (e) {
          // Ignore if message can't be deleted
        }
        await ctx.reply(detailsMessage, {
          parse_mode: "Markdown",
          ...keyboard,
        });
        return;
      }
    }

    // Try to edit as text message
    await ctx.editMessageText(detailsMessage, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch (error: any) {
    // If editing fails (e.g., message doesn't have text), send a new message
    if (
      error.response?.error_code === 400 &&
      error.response?.description?.includes("no text")
    ) {
      await ctx.reply(detailsMessage, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } else {
      throw error;
    }
  }
}
