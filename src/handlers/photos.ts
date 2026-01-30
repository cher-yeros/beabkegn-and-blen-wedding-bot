import { Context } from "telegraf";
import { Markup } from "telegraf";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const photosDir = path.join(__dirname, "../../assets/photos");

/** Max dimension (px) for Telegram photos to avoid PHOTO_INVALID_DIMENSIONS. */
const MAX_PHOTO_DIMENSION = 1280;

/** Photos per page (Telegram media group max is 10). */
const PHOTOS_PER_PAGE = 10;

async function resizePhotoForTelegram(
  filePath: string,
): Promise<Buffer | null> {
  try {
    return await sharp(filePath)
      .resize(MAX_PHOTO_DIMENSION, MAX_PHOTO_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 100 })
      .toBuffer();
  } catch {
    return null;
  }
}

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

    const totalCount = imageFiles.length;
    const totalPages = Math.ceil(totalCount / PHOTOS_PER_PAGE) || 1;

    // Parse page from callback: "photos" -> 1, "photos_page:N" -> N
    let page = 1;
    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      if (data?.startsWith("photos_page:")) {
        const n = parseInt(data.replace("photos_page:", ""), 10);
        if (!isNaN(n)) page = Math.max(1, Math.min(n, totalPages));
      }
    }

    if (totalCount === 1) {
      // Single photo
      const photoPath = path.join(photosDir, imageFiles[0]);
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
      const resized = await resizePhotoForTelegram(photoPath);
      const photoSource = resized ? { source: resized } : { source: photoPath };
      await ctx.replyWithPhoto(
        photoSource,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Back to Menu", "start")],
        ]),
      );
      return;
    }

    // Paginated album
    const start = (page - 1) * PHOTOS_PER_PAGE;
    const filesToSend = imageFiles.slice(start, start + PHOTOS_PER_PAGE);
    const media: Array<{
      type: "photo";
      media: { source: Buffer } | { source: string };
    }> = [];
    for (const file of filesToSend) {
      const filePath = path.join(photosDir, file);
      const resized = await resizePhotoForTelegram(filePath);
      media.push({
        type: "photo",
        media: resized ? { source: resized } : { source: filePath },
      });
    }

    const paginationText =
      totalPages > 1
        ? `📷 Page ${page} of ${totalPages} — ${totalCount} wedding photos`
        : `📷 Here are ${totalCount} photos from our wedding!`;

    const navButtons = [];
    if (page > 1) {
      navButtons.push(
        Markup.button.callback("◀ Previous", `photos_page:${page - 1}`),
      );
    }
    if (page < totalPages) {
      navButtons.push(
        Markup.button.callback("Next ▶", `photos_page:${page + 1}`),
      );
    }
    const keyboard = Markup.inlineKeyboard([
      ...(navButtons.length > 0 ? [navButtons] : []),
      [Markup.button.callback("🔙 Back to Menu", "start")],
    ]);

    const callbackData =
      ctx.callbackQuery && "data" in ctx.callbackQuery
        ? ctx.callbackQuery.data
        : undefined;
    const isInitialOpen = callbackData === "photos";
    if (!isInitialOpen) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore — keep going so pagination message appears below new album
      }
    } else {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
    }
    await ctx.replyWithMediaGroup(
      media as Parameters<Context["replyWithMediaGroup"]>[0],
    );
    await ctx.reply(paginationText, keyboard);
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
