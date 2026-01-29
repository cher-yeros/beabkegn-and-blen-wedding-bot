import { Context } from "telegraf";
import { Markup } from "telegraf";
import * as fs from "fs";
import * as path from "path";

const photosDir = path.join(__dirname, "../../assets/photos");

/** Edit message text, or delete and reply if edit fails (e.g. photo message, message already gone). */
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
    const cannotEdit =
      description.includes("no text in the message to edit") ||
      description.includes("message to edit not found");
    if (cannotEdit) {
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

export async function photosHandler(ctx: Context) {
  // Answer callback query immediately to prevent timeout
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {
      // Ignore if already answered or invalid
    });
  }

  try {
    // Check if photos directory exists
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
      await editMessageTextOrReply(
        ctx,
        "📁 Photos folder created. Please add photos to the /assets/photos directory.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Back to Menu", "start")],
        ]),
      );
      return;
    }

    // Get all image files from photos directory
    const files = fs.readdirSync(photosDir);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file),
    );

    if (imageFiles.length === 0) {
      await editMessageTextOrReply(
        ctx,
        "📷 No photos available yet. Check back soon!",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Back to Menu", "start")],
        ]),
      );
      return;
    }

    // Send photos as media group (album)
    if (imageFiles.length === 1) {
      // Single photo
      const photoPath = path.join(photosDir, imageFiles[0]);
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
      await ctx.replyWithPhoto(
        { source: photoPath },
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Back to Menu", "start")],
        ]),
      );
    } else {
      // Multiple photos as media group
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
      const media = imageFiles.slice(0, 10).map((file) => ({
        type: "photo" as const,
        media: { source: path.join(photosDir, file) },
      }));

      await ctx.replyWithMediaGroup(media);
      await ctx.reply(
        `📷 Here are ${imageFiles.length} photos from our wedding!`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Back to Menu", "start")],
        ]),
      );
    }
  } catch (error) {
    console.error("Error sending photos:", error);
    await editMessageTextOrReply(
      ctx,
      "❌ Sorry, there was an error loading the photos. Please try again later.",
      Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Back to Menu", "start")],
      ]),
    );
  }
}
