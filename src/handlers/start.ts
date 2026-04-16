import { Context } from "telegraf";
import { Markup } from "telegraf";
import * as fs from "fs";
import * as path from "path";

const welcomeImagePath = path.join(__dirname, "../../assets/welcome.jpg");
const welcomeImagePathAlt = path.join(__dirname, "../../assets/welcome.png");

function isPhotoDimensionsError(error: unknown): boolean {
  const e = error as {
    response?: { error_code?: number; description?: string };
  };
  return (
    e?.response?.error_code === 400 &&
    e?.response?.description?.includes("PHOTO_INVALID_DIMENSIONS") === true
  );
}

export async function startHandler(ctx: Context) {
  const welcomeMessage = `*Beabkegn & Blen's Wedding Celebration!* 💍✨

Discover all wedding details, get key updates, and join the joy! ⏰🎉

Stay tuned for more! 🎈💕
  `;

  const WEDDING_WEBSITE_URL =
    "https://beabkegn-and-blen-wedding.gt.tc";

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("📍 Time & Place", "wedding_details"),
      Markup.button.callback("⏳ Countdown", "countdown"),
    ],
    [
      Markup.button.callback("🖼 Photos", "photos"),
      Markup.button.callback("⏰ Remind Me", "remind_me"),
    ],
    [
      Markup.button.callback("💌 Message to Us", "message_couple"),
      Markup.button.callback("📤 Share a Picture", "share_picture"),
    ],
    [Markup.button.url("🌐 Visit our Wedding Website", WEDDING_WEBSITE_URL)],
  ]);

  // Check if welcome image exists
  const hasWelcomeImage =
    fs.existsSync(welcomeImagePath) || fs.existsSync(welcomeImagePathAlt);
  const imagePath = fs.existsSync(welcomeImagePath)
    ? welcomeImagePath
    : welcomeImagePathAlt;

  // Check if this is a callback query (button click) or a command
  if ("callback_query" in ctx.update) {
    // Answer callback query immediately to prevent timeout
    await ctx.answerCbQuery().catch(() => {
      // Ignore if already answered or invalid
    });

    try {
      if (hasWelcomeImage) {
        await ctx.editMessageMedia(
          {
            type: "photo",
            media: { source: imagePath },
            caption: welcomeMessage,
            parse_mode: "Markdown",
          },
          keyboard,
        );
      } else {
        await ctx.editMessageText(welcomeMessage, {
          parse_mode: "Markdown",
          ...keyboard,
        });
      }
    } catch (error: any) {
      if (isPhotoDimensionsError(error)) {
        await ctx.editMessageText(welcomeMessage, {
          parse_mode: "Markdown",
          ...keyboard,
        });
        return;
      }
      // Ignore "message is not modified" error - happens when user clicks same button again
      if (
        error.response?.error_code === 400 &&
        error.response?.description?.includes("message is not modified")
      ) {
        // Message is already correct, just ignore the error
        return;
      }
      // For other errors, try to send a new message
      if (hasWelcomeImage) {
        try {
          await ctx.replyWithPhoto(
            { source: imagePath },
            {
              caption: welcomeMessage,
              parse_mode: "Markdown",
              ...keyboard,
            },
          );
        } catch (replyError) {
          if (isPhotoDimensionsError(replyError)) {
            await ctx.replyWithMarkdown(welcomeMessage, keyboard);
          } else {
            throw replyError;
          }
        }
      } else {
        await ctx.replyWithMarkdown(welcomeMessage, keyboard);
      }
    }
  } else {
    if (hasWelcomeImage) {
      try {
        await ctx.replyWithPhoto(
          { source: imagePath },
          {
            caption: welcomeMessage,
            parse_mode: "Markdown",
            ...keyboard,
          },
        );
      } catch (error) {
        if (isPhotoDimensionsError(error)) {
          await ctx.replyWithMarkdown(welcomeMessage, keyboard);
        } else {
          throw error;
        }
      }
    } else {
      await ctx.replyWithMarkdown(welcomeMessage, keyboard);
    }
  }
}
