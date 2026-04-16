import { Context } from "telegraf";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";
import { config } from "../config";
import { Markup } from "telegraf";

dayjs.extend(durationPlugin);

export async function countdownHandler(ctx: Context) {
  // Answer callback query immediately to prevent timeout
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {
      // Ignore if already answered or invalid
    });
  }

  const weddingDate = dayjs(config.weddingDate);
  const now = dayjs();
  const diff = weddingDate.diff(now);

  let countdownMessage = "";

  if (diff <= 0) {
    countdownMessage = `
🎉 *It's Wedding Day!* 🎉

The big day has arrived! We can't wait to celebrate with you!
    `;
  } else {
    const duration = dayjs.duration(diff);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    countdownMessage = `
⏳ *Countdown to the Big Day*

*${days}* days, *${hours}* hours, *${minutes}* minutes, and *${seconds}* seconds

until Beabkegn & Blen's wedding! 💕
    `;
  }

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
        await ctx.reply(countdownMessage, {
          parse_mode: "Markdown",
          ...keyboard,
        });
        return;
      }
    }

    // Try to edit as text message
    await ctx.editMessageText(countdownMessage, {
      parse_mode: "Markdown",
      ...keyboard,
    });
  } catch (error: any) {
    // If editing fails (e.g., message doesn't have text), send a new message
    if (
      error.response?.error_code === 400 &&
      error.response?.description?.includes("no text")
    ) {
      await ctx.reply(countdownMessage, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } else {
      throw error;
    }
  }
}
